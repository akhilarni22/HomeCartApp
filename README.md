# Here are your Instructions
The use-case: Many people in India buy Groceries, vegetables and medicines on a weekly and monthly basis and have a habit of listing down the requirements before the purchase. This app will help them list the groceries along with the quantity required and then would prefetch the best offer for that product so that the user can make an informed purchase.

Help me create an app for listing groceries, vegetables and medicines for home. The users should be able to list the groceries required on a daily, weekly, or Monthly basis, and the app should also maintain a catalogue of all the item being added and the previous items for quick addition. Once a product is listed, the app should check prices of that product on the internet and display the best deal/offer and once the user selects the offer, the app would redirect the user over to the particular app or website where the offer is available with the product preselected and coupon applied if applicable and send the user directly to the checkout page of that app.

Salient features:
1. Every account must have a House number or Home number - unique identifier.
2. Every user will must have a unique identity(email/phone).
3. More than one user can be associated to a House or Home.
4. All of the users associated to the House or Home will have access to the same list.
5. Have different sections for adding Groceries, Vegetables, and Medicines.
6. Maintain a catalogue of all the previously added products for easier selection in the future.
7. Users should be able to download and share the list via WhatsApp.
8. Provide a checkbox on the list to mark completed when the purchase has been made or if the user no longer needs that product.
9. Once the purchase has been made or a new list is created and the older list should be saved in the archives if the user intends to review it in the future.
10. Compare the prices of the items in the list across other apps like Amazon Fresh, Blinkit, Big Basket, Swiggy Instamart, Jio Mart and Zepto and display all the prices across the apps and mark the best offer available.
11. Give a consolidated view of total cost and savings of all the items in the list broken down by apps. Meaning, if a user wants to buy all the items of any one App like Amazon Fresh, then they should be able to view how much the overall list would cost on Blinkit, Zepto, and other platforms too. This would negate the cases where only one or two items are cheaper on one platform, but overall going with another platform would've been a better deal as more items are cheaper or on better deals on the other platform.

Phase 2: Oral dictation of the items aided by AI and integration with Gemini, Siri, and Amazon Echo for editing and updating the list. AI Image Recognition to enable the user to add Groceries and Medicines by uploading photos and prescriptions.



Built a smart grocery listing & price comparison app for Indian households with:

Multi-user homes with unique Home IDs (create/join), shared lists across members
Shopping lists (Daily/Weekly/Monthly) with 3 categories (Groceries/Vegetables/Medicines), item completion tracking, archive system, and auto-populated product catalogue for quick re-adding
Mock price comparison across 6 Indian platforms (Amazon Fresh, Blinkit, BigBasket, Swiggy Instamart, JioMart, Zepto) with basket optimization showing total cost per vendor and best-deal highlighting in orange
WhatsApp text sharing, item-level price comparison modal, and full JWT auth (httpOnly cookies + bcrypt)
Organic earthy design with Cabinet Grotesk + Work Sans fonts, custom category header images
Testing: Backend 12/12 PASS, Frontend 14/14 E2E flows PASS. Admin credentials: admin@homecart.com / admin123

⚠️ MOCKED: Price comparison uses simulated prices via calculate_price() — vendor links currently route to Google search. Real-time scraping for actual vendor APIs is deferred to Phase 2.

Next Action Items
Real price integration — Replace mock with actual scraping/APIs for the 6 vendors; deep-link to checkout pages with coupons applied
React Native apps — Android + iOS native builds (web is fully responsive in the meantime)
Voice dictation — Add Gemini/Whisper voice-to-item entry
PDF export — Alongside WhatsApp text share
Home switcher — Currently toggles between 2 homes; build proper dropdown for 3+ homes
💡 Potential improvement: Would you like to add affiliate commission tracking when users redirect to vendor checkout? Each successful purchase via your app could generate revenue — a natural monetization path that aligns with the basket-optimization value prop without charging users.

