# HomeCart - Smart Grocery Listing & Price Comparison App

## Original Problem Statement
Create a smart grocery listing app for Indian households that allows users to manage shopping lists for groceries, vegetables, and medicines on daily/weekly/monthly basis. The app maintains a product catalogue, compares prices across 6 Indian platforms (Amazon Fresh, Blinkit, BigBasket, Swiggy Instamart, JioMart, Zepto), shows consolidated basket cost analysis (basket optimization), allows WhatsApp sharing, and supports multi-user households sharing the same list via unique Home IDs.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB)
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Database**: MongoDB
- **Authentication**: JWT with httpOnly cookies (bcrypt password hashing)
- **Design**: Organic & Earthy theme (Light), Cabinet Grotesk + Work Sans fonts, #1A3626 primary / #FF6B35 accent for best deals

## User Personas
- **Indian household shopper**: Plans recurring grocery purchases (daily vegetables, weekly groceries, monthly medicines)
- **Family members**: Share lists with spouse, parents, or roommates via Home ID
- **Budget-conscious buyers**: Compare prices across multiple Indian quick-commerce platforms

## Core Requirements (Static)
1. Unique Home ID per household (auto-generated or custom)
2. Unique user identity (email/password)
3. Multiple users per home with shared list access
4. Category sections: Groceries, Vegetables, Medicines
5. Product catalogue (history of added items)
6. List frequency: Daily / Weekly / Monthly
7. Item completion checkbox + archive system
8. Price comparison across 6 vendors with best deal highlighting
9. Basket optimization (consolidated cost view per vendor)
10. WhatsApp text-based sharing
11. JWT-based authentication

## What's Been Implemented (2026-02-28)
### Backend (`/app/backend/server.py`)
- Auth: register, login, logout, me, JWT with httpOnly cookies
- Homes: create, join, list, members
- Lists: create, list active, list archived, archive
- Items: add, list by list, update completion, delete
- Catalogue: auto-populated from past items, fetch by home
- Price comparison: per-item across 6 vendors with `best` flag
- Basket comparison: per-list consolidated totals with savings vs best
- MongoDB indexes for users.email (unique), homes.home_id (unique), members, lists, items, catalogue
- Admin seeding on startup

### Frontend
- `/app/frontend/src/pages/Login.js`: Email/password login
- `/app/frontend/src/pages/Register.js`: Name/email/password registration
- `/app/frontend/src/pages/Dashboard.js`: Main dashboard with home management, list creation, item CRUD, catalogue search, price comparison modal, basket comparison panel, WhatsApp share, archive
- `/app/frontend/src/contexts/AuthContext.js`: Auth state with httpOnly cookies (withCredentials)
- `/app/frontend/src/components/ProtectedRoute.js`: Route guard
- Design: Organic earthy theme with category header images (terracotta bowl, moss sphere, pebbles)

### Testing
- Backend: 12/12 pytest tests PASS
- Frontend: 14/14 E2E user flows PASS (login → home → list → items → price compare → basket → share → archive → logout)

## P0 Backlog (Next Phase)
- Real-time price scraping integration for 6 vendors (replace mock prices)
- React Native mobile app (Android + iOS)
- Voice-based item dictation (Gemini/Whisper)
- Deep-link redirects to vendor checkout pages with coupons pre-applied
- PDF export for lists

## P1 Backlog
- Home switcher dropdown (currently only toggles between first 2 homes)
- Price drop alerts via notifications
- Predictive shopping suggestions (ML-based recurring patterns)
- Affiliate commission tracking for monetization

## P2 Backlog
- DialogContent aria-describedby for full a11y compliance
- Split Dashboard.js (772 lines) into smaller components
- Suppress 401 console errors on initial auth check
- Alexa/Siri/Google Home integrations

## Test Credentials
- Admin: admin@homecart.com / admin123
- See `/app/memory/test_credentials.md`
