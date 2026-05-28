"""HomeCart full backend test suite covering auth, homes, lists, items, prices, basket."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://deal-cart-tracker.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register(s, suffix):
    email = f"TEST_user_{suffix}_{int(time.time()*1000)}@test.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": f"Test {suffix}"})
    assert r.status_code == 200, r.text
    return r.json(), email


# ------------------ Auth ------------------
class TestAuth:
    def test_register_login_me_logout(self):
        s = _new_session()
        user, email = _register(s, "auth1")
        assert user["email"] == email.lower()
        # /me works with cookie
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200 and r.json()["email"] == email.lower()
        # logout
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # cookies cleared -> /me should 401
        s.cookies.clear()
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401
        # login
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "password123"})
        assert r.status_code == 200
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200

    def test_login_invalid(self):
        s = _new_session()
        r = s.post(f"{API}/auth/login", json={"email": "nobody_TEST@test.com", "password": "x"})
        assert r.status_code == 401

    def test_register_duplicate(self):
        s = _new_session()
        _, email = _register(s, "dup")
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "password123", "name": "X"})
        assert r.status_code == 400

    def test_admin_login(self):
        s = _new_session()
        r = s.post(f"{API}/auth/login", json={"email": "admin@homecart.com", "password": "admin123"})
        assert r.status_code == 200


# ------------------ Homes ------------------
class TestHomes:
    def test_create_join_members(self):
        s1 = _new_session(); _register(s1, "h1")
        s2 = _new_session(); _register(s2, "h2")

        home_id = f"HOME-TEST-{int(time.time()*1000)}"
        r = s1.post(f"{API}/homes", json={"home_name": "TEST Home", "home_id": home_id})
        assert r.status_code == 200, r.text
        assert r.json()["home_id"] == home_id

        # duplicate home_id
        r = s1.post(f"{API}/homes", json={"home_name": "TEST Home", "home_id": home_id})
        assert r.status_code == 400

        # list my homes
        r = s1.get(f"{API}/homes")
        assert r.status_code == 200
        assert any(h["home_id"] == home_id for h in r.json())

        # join
        r = s2.post(f"{API}/homes/join", json={"home_id": home_id})
        assert r.status_code == 200
        # already member
        r = s2.post(f"{API}/homes/join", json={"home_id": home_id})
        assert r.status_code == 400
        # invalid home
        r = s2.post(f"{API}/homes/join", json={"home_id": "HOME-NOPE-XYZ"})
        assert r.status_code == 404

        # members listing - both visible
        r = s1.get(f"{API}/homes/{home_id}/members")
        assert r.status_code == 200
        members = r.json()
        assert len(members) == 2

        # non-member cannot view members
        s3 = _new_session(); _register(s3, "h3")
        r = s3.get(f"{API}/homes/{home_id}/members")
        assert r.status_code == 403


# ------------------ Lists, Items, Prices, Basket ------------------
class TestListsItemsAndPrices:
    @pytest.fixture(scope="class")
    def ctx(self):
        s1 = _new_session(); _register(s1, "l1")
        s2 = _new_session(); _register(s2, "l2")
        home_id = f"HOME-TEST-{int(time.time()*1000)}"
        r = s1.post(f"{API}/homes", json={"home_name": "TEST List Home", "home_id": home_id})
        assert r.status_code == 200
        s2.post(f"{API}/homes/join", json={"home_id": home_id})
        return {"s1": s1, "s2": s2, "home_id": home_id}

    def test_create_list_and_visibility(self, ctx):
        r = ctx["s1"].post(f"{API}/lists", json={"frequency": "Weekly", "home_id": ctx["home_id"]})
        assert r.status_code == 200, r.text
        list_id = r.json()["_id"]
        ctx["list_id"] = list_id

        # s2 (same home) also sees it
        r = ctx["s2"].get(f"{API}/lists", params={"home_id": ctx["home_id"]})
        assert r.status_code == 200
        assert any(l["_id"] == list_id for l in r.json())

        # outsider not allowed
        s3 = _new_session(); _register(s3, "l3")
        r = s3.get(f"{API}/lists", params={"home_id": ctx["home_id"]})
        assert r.status_code == 403
        r = s3.post(f"{API}/lists", json={"frequency": "Weekly", "home_id": ctx["home_id"]})
        assert r.status_code == 403

    def test_add_get_update_delete_items(self, ctx):
        list_id = ctx["list_id"]
        # add 3 items across categories
        items = []
        for name, cat, q, u in [("Tomato", "Vegetables", 2, "kg"),
                                 ("Atta", "Groceries", 5, "kg"),
                                 ("Paracetamol", "Medicines", 1, "strip")]:
            r = ctx["s1"].post(f"{API}/items", json={"list_id": list_id, "name": name, "category": cat, "quantity": q, "unit": u})
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["name"] == name and data["category"] == cat
            items.append(data)

        # s2 sees items (multi-user)
        r = ctx["s2"].get(f"{API}/items", params={"list_id": list_id})
        assert r.status_code == 200 and len(r.json()) >= 3

        # mark first complete
        r = ctx["s2"].patch(f"{API}/items/{items[0]['_id']}", json={"completed": True})
        assert r.status_code == 200
        r = ctx["s1"].get(f"{API}/items", params={"list_id": list_id})
        assert any(i["_id"] == items[0]["_id"] and i["completed"] for i in r.json())

        # delete last
        r = ctx["s1"].delete(f"{API}/items/{items[2]['_id']}")
        assert r.status_code == 200
        r = ctx["s1"].get(f"{API}/items", params={"list_id": list_id})
        ids = [i["_id"] for i in r.json()]
        assert items[2]["_id"] not in ids

        ctx["remaining_item_id"] = items[1]["_id"]

    def test_catalogue_populated(self, ctx):
        r = ctx["s1"].get(f"{API}/catalogue", params={"home_id": ctx["home_id"]})
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "Tomato" in names and "Atta" in names

    def test_item_prices(self, ctx):
        r = ctx["s1"].get(f"{API}/items/{ctx['remaining_item_id']}/prices")
        assert r.status_code == 200
        prices = r.json()
        assert len(prices) == 6
        vendors = {p["vendor"] for p in prices}
        assert vendors == {"Amazon Fresh", "Blinkit", "BigBasket", "JioMart", "Zepto", "Swiggy Instamart"}
        best = [p for p in prices if p.get("best")]
        assert len(best) >= 1
        assert all("price" in p and "eta" in p for p in prices)

    def test_basket_comparison(self, ctx):
        r = ctx["s1"].get(f"{API}/lists/{ctx['list_id']}/basket")
        assert r.status_code == 200
        baskets = r.json()
        assert len(baskets) == 6
        assert all("total" in b and "savings" in b and "best" in b for b in baskets)
        best = [b for b in baskets if b["best"]]
        assert len(best) >= 1 and best[0]["savings"] == 0

    def test_archive_list(self, ctx):
        r = ctx["s1"].post(f"{API}/lists/{ctx['list_id']}/archive")
        assert r.status_code == 200
        # not in active
        r = ctx["s1"].get(f"{API}/lists", params={"home_id": ctx["home_id"]})
        assert all(l["_id"] != ctx["list_id"] for l in r.json())
        # in archived
        r = ctx["s1"].get(f"{API}/lists/archived", params={"home_id": ctx["home_id"]})
        assert any(l["_id"] == ctx["list_id"] for l in r.json())


# ------------------ Unauthorized access ------------------
class TestUnauth:
    def test_no_cookie(self):
        s = _new_session()
        for path in ["/auth/me", "/homes", "/catalogue?home_id=x"]:
            r = s.get(f"{API}{path}")
            assert r.status_code == 401
