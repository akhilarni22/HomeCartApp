from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt
import secrets

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT token management
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateHomeRequest(BaseModel):
    home_name: str
    home_id: Optional[str] = None

class JoinHomeRequest(BaseModel):
    home_id: str

class CreateListRequest(BaseModel):
    frequency: str
    home_id: str

class AddItemRequest(BaseModel):
    list_id: str
    name: str
    category: str
    quantity: float
    unit: str

class UpdateItemRequest(BaseModel):
    completed: bool

class AddMemberRequest(BaseModel):
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Price comparison logic (mock)
# Grocery & vegetable items use quick-commerce vendors;
# medicine items use pharmacy vendors. Each category routes to its own vendor list.
GROCERY_VENDORS = ["Amazon Fresh", "Blinkit", "BigBasket", "JioMart", "Zepto", "Swiggy Instamart"]
MEDICINE_VENDORS = ["1mg", "TrueMeds", "PharmEasy", "PlatinumRx", "Apollo Pharmacy"]

# Kept for backwards-compatibility with any external callers that imported VENDORS.
VENDORS = GROCERY_VENDORS

MEDICINE_CATEGORIES = {"Medicines"}

def vendors_for_category(category: str):
    return MEDICINE_VENDORS if category in MEDICINE_CATEGORIES else GROCERY_VENDORS

# Bug #9 fix: real vendor search URLs (replaces previous Google search redirect).
# Each vendor's product search page is opened with the item name pre-filled.
# Note: deep-linking directly to the product/checkout page with coupons applied
# still requires actual scraping or affiliate APIs from each vendor.
from urllib.parse import quote_plus

def vendor_search_url(vendor: str, item_name: str) -> str:
    q = quote_plus(item_name)
    urls = {
        # Grocery vendors
        "Amazon Fresh": f"https://www.amazon.in/s?k={q}&i=amazonfresh",
        "Blinkit": f"https://blinkit.com/s/?q={q}",
        "BigBasket": f"https://www.bigbasket.com/ps/?q={q}",
        "JioMart": f"https://www.jiomart.com/search/{q}",
        "Zepto": f"https://www.zeptonow.com/search?query={q}",
        "Swiggy Instamart": f"https://www.swiggy.com/instamart/search?custom_back=true&query={q}",
        # Medicine vendors
        "1mg": f"https://www.1mg.com/search/all?name={q}",
        "TrueMeds": f"https://www.truemeds.in/search/{q}",
        "PharmEasy": f"https://pharmeasy.in/search/all?name={q}",
        "PlatinumRx": f"https://www.platinumrx.in/search?q={q}",
        "Apollo Pharmacy": f"https://www.apollopharmacy.in/search-medicines/{q}",
    }
    return urls.get(vendor, f"https://www.google.com/search?q={quote_plus(vendor + ' ' + item_name)}")

# Vendor homepage / landing URL — used for the basket card click-through
# (since a basket spans multiple items, we send the user to the vendor's main shop page).
def vendor_home_url(vendor: str) -> str:
    urls = {
        "Amazon Fresh": "https://www.amazon.in/amazonfresh",
        "Blinkit": "https://blinkit.com/",
        "BigBasket": "https://www.bigbasket.com/",
        "JioMart": "https://www.jiomart.com/",
        "Zepto": "https://www.zeptonow.com/",
        "Swiggy Instamart": "https://www.swiggy.com/instamart",
        "1mg": "https://www.1mg.com/",
        "TrueMeds": "https://www.truemeds.in/",
        "PharmEasy": "https://pharmeasy.in/",
        "PlatinumRx": "https://www.platinumrx.in/",
        "Apollo Pharmacy": "https://www.apollopharmacy.in/",
    }
    return urls.get(vendor, "https://www.google.com/search?q=" + quote_plus(vendor))

def calculate_price(item_name: str, vendor: str, quantity: float) -> float:
    seed = sum(ord(ch) for ch in item_name + vendor)
    base = 35 + (seed % 250)
    multiplier = max(quantity, 1)
    discount = 0.82 if seed % 5 == 0 else 0.9 if seed % 3 == 0 else 1
    return round(base * multiplier * discount, 2)

# Auth endpoints
@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(req.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": req.name,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"_id": user_id, "email": email, "name": req.name}

@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    email = req.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"_id": user_id, "email": user["email"], "name": user.get("name", "")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

# Home endpoints
@api_router.post("/homes")
async def create_home(req: CreateHomeRequest, request: Request):
    user = await get_current_user(request)
    home_id = req.home_id or f"HOME-{secrets.token_hex(4).upper()}"
    
    existing = await db.homes.find_one({"home_id": home_id})
    if existing:
        raise HTTPException(status_code=400, detail="Home ID already exists")
    
    home_doc = {
        "home_id": home_id,
        "home_name": req.home_name,
        "created_by": user["_id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.homes.insert_one(home_doc)
    home_doc.pop("_id", None)
    
    await db.home_members.insert_one({
        "home_id": home_id,
        "user_id": user["_id"],
        "joined_at": datetime.now(timezone.utc)
    })
    
    home_doc["created_at"] = home_doc["created_at"].isoformat()
    return {"_id": str(result.inserted_id), **home_doc}

@api_router.post("/homes/join")
async def join_home(req: JoinHomeRequest, request: Request):
    user = await get_current_user(request)
    home = await db.homes.find_one({"home_id": req.home_id})
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    
    existing = await db.home_members.find_one({"home_id": req.home_id, "user_id": user["_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    
    await db.home_members.insert_one({
        "home_id": req.home_id,
        "user_id": user["_id"],
        "joined_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Joined home", "home_id": req.home_id}

@api_router.get("/homes")
async def get_my_homes(request: Request):
    user = await get_current_user(request)
    memberships = await db.home_members.find({"user_id": user["_id"]}).to_list(100)
    home_ids = [m["home_id"] for m in memberships]
    homes = await db.homes.find({"home_id": {"$in": home_ids}}, {"_id": 0}).to_list(100)
    
    for home in homes:
        members_count = await db.home_members.count_documents({"home_id": home["home_id"]})
        home["members_count"] = members_count
        home["is_creator"] = str(home.get("created_by", "")) == str(user["_id"])
    
    return homes

@api_router.get("/homes/{home_id}/members")
async def get_home_members(home_id: str, request: Request):
    user = await get_current_user(request)
    is_member = await db.home_members.find_one({"home_id": home_id, "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this home")
    
    memberships = await db.home_members.find({"home_id": home_id}).to_list(100)
    user_ids = [ObjectId(m["user_id"]) for m in memberships]
    home = await db.homes.find_one({"home_id": home_id})
    creator_id = home["created_by"] if home else None
    users_cursor = await db.users.find({"_id": {"$in": user_ids}}, {"email": 1, "name": 1}).to_list(100)
    return [
        {
            "_id": str(u["_id"]),
            "email": u.get("email"),
            "name": u.get("name", ""),
            "is_creator": str(u["_id"]) == str(creator_id),
        }
        for u in users_cursor
    ]


@api_router.post("/homes/{home_id}/members")
async def add_home_member(home_id: str, req: AddMemberRequest, request: Request):
    """Add a registered user (by email) as a member of this home. Only the home creator can add members."""
    user = await get_current_user(request)
    home = await db.homes.find_one({"home_id": home_id})
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    if str(home["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only the home creator can add members")
    target = await db.users.find_one({"email": req.email.lower()})
    if not target:
        raise HTTPException(status_code=404, detail="No registered user with that email")
    target_id = str(target["_id"])
    existing = await db.home_members.find_one({"home_id": home_id, "user_id": target_id})
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")
    await db.home_members.insert_one({
        "home_id": home_id,
        "user_id": target_id,
        "joined_at": datetime.now(timezone.utc),
    })
    return {"message": "Member added", "email": target["email"], "name": target.get("name", "")}


@api_router.delete("/homes/{home_id}/members/{user_email}")
async def remove_home_member(home_id: str, user_email: str, request: Request):
    """Remove a member from a home. Only the home creator can remove members.
    The creator themselves cannot be removed via this endpoint."""
    user = await get_current_user(request)
    home = await db.homes.find_one({"home_id": home_id})
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    if str(home["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only the home creator can remove members")
    target = await db.users.find_one({"email": user_email.lower()})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if str(target["_id"]) == str(home["created_by"]):
        raise HTTPException(status_code=400, detail="Cannot remove the home creator")
    result = await db.home_members.delete_one({"home_id": home_id, "user_id": str(target["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in this home")
    return {"message": "Member removed"}


@api_router.delete("/homes/{home_id}")
async def delete_home(home_id: str, request: Request):
    """Delete a home and cascade-delete all its lists, items, catalogue and memberships.
    Only the home creator can delete the home."""
    user = await get_current_user(request)
    home = await db.homes.find_one({"home_id": home_id})
    if not home:
        raise HTTPException(status_code=404, detail="Home not found")
    if str(home["created_by"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Only the home creator can delete the home")
    await db.list_items.delete_many({"home_id": home_id})
    await db.shopping_lists.delete_many({"home_id": home_id})
    await db.catalogue_items.delete_many({"home_id": home_id})
    await db.home_members.delete_many({"home_id": home_id})
    await db.homes.delete_one({"home_id": home_id})
    return {"message": "Home deleted"}


@api_router.post("/auth/change-password")
async def change_password(req: ChangePasswordRequest, request: Request):
    user = await get_current_user(request)
    db_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    if not db_user or not verify_password(req.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {"password_hash": hash_password(req.new_password)}},
    )
    return {"message": "Password updated"}


@api_router.get("/users/me/stats")
async def get_user_stats(request: Request):
    user = await get_current_user(request)
    lists_created = await db.shopping_lists.count_documents({"created_by": user["_id"]})
    homes_owned = await db.homes.count_documents({"created_by": user["_id"]})
    items_added = await db.list_items.count_documents({"added_by": user["_id"]})
    return {
        "lists_created": lists_created,
        "homes_owned": homes_owned,
        "items_added": items_added,
    }

# Shopping list endpoints
@api_router.post("/lists")
async def create_list(req: CreateListRequest, request: Request):
    user = await get_current_user(request)
    is_member = await db.home_members.find_one({"home_id": req.home_id, "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this home")
    
    list_doc = {
        "home_id": req.home_id,
        "frequency": req.frequency,
        "created_by": user["_id"],
        "created_at": datetime.now(timezone.utc),
        "archived": False,
        "status": "active",
        "completed_at": None
    }
    result = await db.shopping_lists.insert_one(list_doc)
    list_doc.pop("_id", None)
    return {"_id": str(result.inserted_id), **list_doc}

@api_router.get("/lists")
async def get_lists(home_id: str, request: Request):
    user = await get_current_user(request)
    is_member = await db.home_members.find_one({"home_id": home_id, "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this home")
    
    lists = await db.shopping_lists.find({
        "home_id": home_id,
        "archived": False,
        "$or": [{"status": "active"}, {"status": {"$exists": False}}]
    }).sort("created_at", -1).to_list(100)
    for lst in lists:
        lst["_id"] = str(lst["_id"])
        items_count = await db.list_items.count_documents({"list_id": lst["_id"]})
        lst["items_count"] = items_count
    return lists

@api_router.get("/lists/archived")
async def get_archived_lists(home_id: str, request: Request):
    user = await get_current_user(request)
    is_member = await db.home_members.find_one({"home_id": home_id, "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this home")
    
    lists = await db.shopping_lists.find({"home_id": home_id, "archived": True}).sort("created_at", -1).to_list(100)
    for lst in lists:
        lst["_id"] = str(lst["_id"])
        items_count = await db.list_items.count_documents({"list_id": lst["_id"]})
        lst["items_count"] = items_count
    return lists


@api_router.get("/lists/completed")
async def get_completed_lists(home_id: str, request: Request):
    user = await get_current_user(request)

    is_member = await db.home_members.find_one({
        "home_id": home_id,
        "user_id": user["_id"]
    })

    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this home")

    lists = await db.shopping_lists.find({
        "home_id": home_id,
        "status": "completed",
        "archived": False
    }).sort("completed_at", -1).to_list(100)

    for lst in lists:
        lst["_id"] = str(lst["_id"])
        lst["items_count"] = await db.list_items.count_documents({"list_id": lst["_id"]})

    return lists

@api_router.post("/lists/{list_id}/archive")
async def archive_list(list_id: str, request: Request):
    user = await get_current_user(request)
    lst = await db.shopping_lists.find_one({"_id": ObjectId(list_id)})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    
    is_member = await db.home_members.find_one({"home_id": lst["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.shopping_lists.update_one({"_id": ObjectId(list_id)}, {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc)}})
    return {"message": "List archived"}

@api_router.post("/lists/{list_id}/complete")
async def complete_list(list_id: str, request: Request):
    user = await get_current_user(request)

    lst = await db.shopping_lists.find_one({"_id": ObjectId(list_id)})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    is_member = await db.home_members.find_one({
        "home_id": lst["home_id"],
        "user_id": user["_id"]
    })

    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.shopping_lists.update_one(
        {"_id": ObjectId(list_id)},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc)
        }}
    )

    return {"message": "List completed"}

# Item endpoints
@api_router.post("/items")
async def add_item(req: AddItemRequest, request: Request):
    user = await get_current_user(request)
    lst = await db.shopping_lists.find_one({"_id": ObjectId(req.list_id)})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    
    is_member = await db.home_members.find_one({"home_id": lst["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item_doc = {
        "list_id": req.list_id,
        "home_id": lst["home_id"],
        "name": req.name,
        "category": req.category,
        "quantity": req.quantity,
        "unit": req.unit,
        "completed": False,
        "added_by": user["_id"],
        "added_at": datetime.now(timezone.utc)
    }
    result = await db.list_items.insert_one(item_doc)
    item_doc.pop("_id", None)
    item_doc["added_at"] = item_doc["added_at"].isoformat()
    
    await db.catalogue_items.update_one(
        {"home_id": lst["home_id"], "name": req.name.lower()},
        {"$set": {"name": req.name, "category": req.category, "unit": req.unit, "last_used": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    return {"_id": str(result.inserted_id), **item_doc}

@api_router.get("/items")
async def get_items(list_id: str, request: Request):
    user = await get_current_user(request)
    lst = await db.shopping_lists.find_one({"_id": ObjectId(list_id)})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    
    is_member = await db.home_members.find_one({"home_id": lst["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    items = await db.list_items.find({"list_id": list_id}).to_list(1000)
    for item in items:
        item["_id"] = str(item["_id"])
    return items

@api_router.patch("/items/{item_id}")
async def update_item(item_id: str, req: UpdateItemRequest, request: Request):
    user = await get_current_user(request)
    item = await db.list_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    is_member = await db.home_members.find_one({"home_id": item["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.list_items.update_one({"_id": ObjectId(item_id)}, {"$set": {"completed": req.completed}})
    return {"message": "Item updated"}

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, request: Request):
    user = await get_current_user(request)
    item = await db.list_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    is_member = await db.home_members.find_one({"home_id": item["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.list_items.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Item deleted"}

# Catalogue endpoint
@api_router.get("/catalogue")
async def get_catalogue(home_id: str, request: Request):
    user = await get_current_user(request)
    is_member = await db.home_members.find_one({"home_id": home_id, "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    items = await db.catalogue_items.find({"home_id": home_id}).sort("last_used", -1).to_list(1000)
    for item in items:
        item["_id"] = str(item["_id"])
        item["last_used"] = item["last_used"].isoformat()
    return items

# Price comparison endpoint
@api_router.get("/items/{item_id}/prices")
async def get_item_prices(item_id: str, request: Request):
    user = await get_current_user(request)
    item = await db.list_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    is_member = await db.home_members.find_one({"home_id": item["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Route to the correct vendor group based on item category.
    # Medicine items are compared across pharmacy vendors;
    # everything else uses grocery quick-commerce vendors.
    applicable_vendors = vendors_for_category(item.get("category", ""))

    prices = []
    for vendor in applicable_vendors:
        price = calculate_price(item["name"], vendor, item["quantity"])
        eta = f"{10 + ((len(item['name']) + len(vendor)) % 35)} min"
        coupon = "Coupon applied" if (len(item['name']) + len(vendor)) % 4 == 0 else ""
        prices.append({
            "vendor": vendor,
            "price": price,
            "eta": eta,
            "coupon": coupon,
            "url": vendor_search_url(vendor, item["name"]),  # Bug #9 fix
        })
    
    min_price = min(p["price"] for p in prices)
    for p in prices:
        p["best"] = p["price"] == min_price
    
    return prices

# Basket comparison endpoint
@api_router.get("/lists/{list_id}/basket")
async def get_basket_comparison(list_id: str, request: Request):
    user = await get_current_user(request)
    lst = await db.shopping_lists.find_one({"_id": ObjectId(list_id)})
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")
    
    is_member = await db.home_members.find_one({"home_id": lst["home_id"], "user_id": user["_id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    items = await db.list_items.find({"list_id": list_id, "completed": False}).to_list(1000)
    
    # Split items by vendor group (grocery vs medicine).
    grocery_items = [i for i in items if i.get("category") not in MEDICINE_CATEGORIES]
    medicine_items = [i for i in items if i.get("category") in MEDICINE_CATEGORIES]

    def build_group(group_items, vendor_list):
        if not group_items:
            return []
        totals = []
        for vendor in vendor_list:
            total = sum(calculate_price(i["name"], vendor, i["quantity"]) for i in group_items)
            totals.append({
                "vendor": vendor,
                "total": round(total, 2),
                "url": vendor_home_url(vendor),  # clickable basket card
                "item_count": len(group_items),
            })
        min_total = min(b["total"] for b in totals)
        for b in totals:
            b["best"] = b["total"] == min_total
            b["savings"] = round(b["total"] - min_total, 2)
        return totals

    # Return both groups so the frontend can render two basket comparison sections.
    # 'baskets' (flat list) is also returned for backwards-compatibility with the
    # previous frontend that only knew about a single grocery basket.
    grocery_basket = build_group(grocery_items, GROCERY_VENDORS)
    medicine_basket = build_group(medicine_items, MEDICINE_VENDORS)

    return {
        "grocery": grocery_basket,
        "medicine": medicine_basket,
        "baskets": grocery_basket,  # legacy/back-compat — primary basket for grocery list
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('FRONTEND_URL', 'http://localhost:3000').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.homes.create_index("home_id", unique=True)
    await db.home_members.create_index([("home_id", 1), ("user_id", 1)])
    await db.shopping_lists.create_index([("home_id", 1), ("archived", 1)])
    await db.list_items.create_index("list_id")
    await db.catalogue_items.create_index([("home_id", 1), ("name", 1)])
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@homecart.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({"email": admin_email, "password_hash": hashed, "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")
    
    os.makedirs("memory", exist_ok=True)
    with open("memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin Account\n")
        f.write(f"- Email: {admin_email}\n")
        f.write(f"- Password: {admin_password}\n")
        f.write(f"- Role: admin\n\n")
        f.write(f"## Auth Endpoints\n")
        f.write(f"- POST /api/auth/register\n")
        f.write(f"- POST /api/auth/login\n")
        f.write(f"- GET /api/auth/me\n")
        f.write(f"- POST /api/auth/logout\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()