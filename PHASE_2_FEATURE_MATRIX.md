# Phase 2 — Native Mobile Feature Parity Matrix

Legend:
- `Web` = exists in the Vite PWA
- `API` = backend endpoint exists
- `Mobile` = native screen to build
- `Priority` = implementation order

## Customer

| # | Feature | Web | API | Mobile Screen | Priority |
|---|---------|-----|-----|---------------|----------|
| 1 | Customer registration | `/register` | `POST /api/auth/register` | `Auth/Register` | P1 |
| 2 | Customer login | `AuthModal` | `POST /api/auth/login` | `Auth/Login` | P1 |
| 3 | Password reset (email token) | `AuthModal` | `POST /api/auth/forgot-password`, `reset-password` | `Auth/ResetPassword` | P1 |
| 4 | View/edit profile | `/account` | `GET/PUT /api/auth/me` | `Account/Profile` | P1 |
| 5 | Home / discovery | `/` (`Home`) | `GET /api/foods`, `/api/listings/*` | `Home` | P1 |
| 6 | Food detail | `/food/:slug` | `GET /api/foods/:slug` | `Food/FoodDetail` | P1 |
| 7 | Cook / listing detail | `/cook-listing/:id` | `GET /api/listings/:id` | `Cook/CookListingDetail` | P2 |
| 8 | Search & filters | `DiscoveryFilters` | search via foods/listings | `Search` | P2 |
| 9 | Cart | `CartModal` | local state + `POST /api/orders` | `Cart/CartScreen` | P1 |
| 10 | Checkout | `OrderModal` | `POST /api/orders` | `Checkout/CheckoutScreen` | P1 |
| 11 | Delivery address / location | `CustomerLocationPicker` | `/api/location/*` | `Checkout/LocationPicker` | P1 |
| 12 | Payment method selection | `OrderModal` | `GET /api/payments/methods` | `Checkout/PaymentMethods` | P1 |
| 13 | Manual payment + proof upload | checkout flow | `POST /api/payments/proof` | `Checkout/PaymentProof` | P1 |
| 14 | Wallet / balance | `/account` | `GET /api/payments/balance` | `Wallet/Balance` | P2 |
| 15 | Transaction history | `/account` | ledger endpoints | `Wallet/Transactions` | P2 |
| 16 | Order history | (in `/account`) | `GET /api/orders` | `Orders/OrderHistory` | P1 |
| 17 | Order tracking | `/track/:orderNumber` | `GET /api/orders/:number` | `Orders/TrackOrder` | P1 |
| 18 | Delivery code display | `TrackOrder` | `GET /api/orders/:number` | `Orders/DeliveryCode` | P1 |
| 19 | Notifications | `NotificationBell` | `GET /api/notifications` | `Notifications` | P2 |
| 20 | Reviews & ratings | `ReviewModal` (?) | `/api/reviews/*` | `Reviews/AddReview` | P3 |
| 21 | Favorites | likes | `POST /api/listings/:id/like` | `Favorites` | P3 |
| 22 | Support / disputes | `ReportModal` | `/api/tickets`, `/api/disputes` | `Support` | P3 |

## Cook / Vendor

| # | Feature | Web | API | Mobile Screen | Priority |
|---|---------|-----|-----|---------------|----------|
| 1 | Cook registration | `/cook` onboarding | `POST /api/cooks/register` | `Cook/Onboarding` | P2 |
| 2 | Cook login | `AuthModal` | `POST /api/auth/login` | `Auth/Login` | P1 |
| 3 | Dashboard / stats | `Cook` page | `GET /api/cooks/dashboard` | `Cook/Dashboard` | P2 |
| 4 | Menu / food management | `Cook` | `POST/PATCH/DELETE /api/admin/foods` (cook scope) | `Cook/Menu` | P2 |
| 5 | Incoming orders | `Cook` | `GET /api/cooks/orders` | `Cook/Orders` | P2 |
| 6 | Accept order | `Cook` | `POST /api/cooks/orders/:n/accept` | `Cook/OrderActions` | P2 |
| 7 | Mark preparing / ready | `Cook` | `PATCH /api/cooks/orders/:n/status` | `Cook/OrderActions` | P2 |
| 8 | Pickup verification (rider) | `Cook` | `POST /api/cooks/orders/:n/verify-pickup` | `Cook/PickupVerify` | P2 |
| 9 | Earnings / wallet | `Cook` | `GET /api/cooks/earnings` | `Cook/Earnings` | P3 |
| 10 | Business profile | `Cook` | `PATCH /api/cooks/me` | `Cook/Profile` | P3 |

## Rider

| # | Feature | Web | API | Mobile Screen | Priority |
|---|---------|-----|-----|---------------|----------|
| 1 | Rider registration | `/rider` | `POST /api/rider/register` | `Rider/Onboarding` | P2 |
| 2 | Rider login | `/rider` | `POST /api/rider/login` | `Auth/Login` | P1 |
| 3 | Online / offline toggle | `Rider` | `PUT /api/rider/me/availability` | `Rider/Dashboard` | P2 |
| 4 | Available deliveries | `Rider` | `GET /api/rider/available` | `Rider/AvailableOrders` | P2 |
| 5 | Claim delivery | `Rider` | `POST /api/rider/orders/:n/claim` | `Rider/AvailableOrders` | P2 |
| 6 | Pickup code entry | `Rider` | `POST /api/rider/orders/:n/pickup` | `Rider/Pickup` | P2 |
| 7 | Start trip | `Rider` | `POST /api/rider/orders/:n/start-trip` | `Rider/Trip` | P2 |
| 8 | Delivery code entry | `Rider` | `POST /api/rider/orders/:n/verify` | `Rider/Deliver` | P2 |
| 9 | Live location updates | map | `POST /api/rider/location` | `Rider/Location` | P2 |
| 10 | Earnings / history | `Rider` | `GET /api/rider/earnings` | `Rider/Earnings` | P3 |

## Management / Admin / Moderation

| # | Feature | Web | API | Mobile Screen | Priority |
|---|---------|-----|-----|---------------|----------|
| 1 | Admin login | `Admin.tsx` | `POST /api/auth/login` | `Auth/AdminLogin` | P1 |
| 2 | Dashboard | `Admin` | `GET /api/admin/dashboard` | `Admin/Dashboard` | P3 |
| 3 | Orders list | `Admin` | `GET /api/admin/orders` | `Admin/Orders` | P3 |
| 4 | Foods / menu | `Admin` | `/api/admin/foods` | `Admin/Foods` | P3 |
| 5 | Riders | `Admin` | `/api/admin/riders` | `Admin/Riders` | P3 |
| 6 | Cooks / approvals | `Admin` | `/api/admin/cooks` | `Admin/Cooks` | P3 |
| 7 | Payments / manual review | `Admin` | `/api/admin/payments` | `Admin/Payments` | P3 |
| 8 | Disputes / tickets | `Admin` | `/api/tickets`, `/api/disputes` | `Admin/Disputes` | P3 |
| 9 | Moderation reports | `ModerationPanel` | `/api/moderation/*` | `Admin/Moderation` | P3 |
| 10 | Location / map view | `MapView` | `/api/location/*` | `Admin/Map` | P3 |

## Shared / Foundation

| # | Feature | Web | API | Mobile Screen | Priority |
|---|---------|-----|-----|---------------|----------|
| 1 | Auth state machine | `AuthProvider` | JWT | `Auth/AuthProvider` | P1 |
| 2 | Secure token storage | `localStorage` (web) | — | `Keychain`/`Keystore` via Expo SecureStore | P1 |
| 3 | API client | `lib/api.ts` | — | `mobile/lib/api.ts` | P1 |
| 4 | Global notifications | `NotificationListener` | push to add | `NotificationsProvider` | P2 |
| 5 | Deep links | PWA only | — | `Linking` config | P3 |
| 6 | Offline / reconnect | basic | — | `NetInfo` + retry queue | P4 |
