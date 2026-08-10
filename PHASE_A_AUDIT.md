# OyeWell Marketplace Upgrade — Phase A Architecture Audit

## 1. Existing Architecture Snapshot

### Frontend
- **Framework**: React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Lucide icons.
- **Routing** (`App.tsx`): `/`, `/food/:slug`, `/track/:orderNumber`, `/rider`, `/login`, `/register`, `/account`, `/admin`.
- **State/Context**: `AuthProvider` (single customer token), `CartProvider` (localStorage cart), `Toast`.
- **Customer pages**: `Home` (full-screen vertical food feed), `FoodDetail`, `TrackOrder`, `Account`, `Login`, `Register`.
- **Admin page** (`Admin.tsx`): tabbed dashboard (`dashboard`, `menu`, `orders`, `sides`, `customers`, `delivery`, `payments`, `settings`, `email`, `riders`); uses `admin_token` in localStorage; calls `/api/admin` routes.
- **Rider page** (`Rider.tsx`): separate `rider_token`; tabs for `orders`, `available`, `verify`, `earnings`, `profile`; calls `/api/rider` routes.
- **API lib**: `lib/api.ts` (customer-facing), `lib/admin.ts`, `lib/rider.ts`.
- **Feed/Content**: `Home` loads `Food` list and renders `FoodCard` (single full-screen hero image per item); `OrderButton`/`OrderModal` for checkout. No multi-media carousel.

### Backend
- **Framework**: Express + TypeScript (ESM) + Prisma ORM + PostgreSQL.
- **Routes** (`index.ts`): `/api/foods`, `/api/auth`, `/api/delivery`, `/api/orders`, `/api/sides`, `/api/payments`, `/api/admin`, `/api/rider`.
- **Auth**: JWT `Bearer` token; `requireAuth`, `requireAdmin`, `requireRider` middleware; `role` is a single `UserRole` enum (`CUSTOMER`, `ADMIN`, `RIDER`).
- **Order engine**: `lib/order.ts` `createOrder` from cart; resolves `DeliveryZone`, creates `Payment`, decrements `FoodOption` stock.
- **Payment**: `lib/payment.ts` supports `MOCK`, `PAYSTACK`, `FLUTTERWAVE`, `CRYPTO`, `BANK_TRANSFER`; proof-of-payment image upload; admin manual verification.
- **Rider engine**: `/rider` login/register, `/rider/orders`, `/rider/available`, `/rider/orders/:orderNumber/claim`, `/rider/orders/:orderNumber/verify`, `/rider/earnings`.
- **Admin**: `admin.ts` CRUD for foods, sides, orders, delivery zones, payment methods, settings, customers, riders.
- **Real-time**: none. Polling only.

### Database (`prisma/schema.prisma`)
- **User** (`id`, `email`, `password`, `firstName`, `lastName`, `phone`, `role`)
- **Rider** (`userId`, `vehicle`, `bankName`, `bankAccountName`, `bankAccountNumber`, `isActive`, `available`, `isApproved`)
- **Food / FoodOption** (restaurant items with `PLATE`/`PORTION`/`PIECE` and stock)
- **Side / OrderSide**
- **Order / OrderItem / OrderStatusHistory / Payment / PaymentAttempt**
- **DeliveryZone** (boundary `Json`)
- **RestaurantSetting / PaymentMethodConfig / EmailConfig**
- **No models for**: cook profiles, multi-media posts, messages/chat, customer addresses, rider location, reviews/ratings, audit logs, geospatial coordinates on users/providers.

### Infrastructure
- Docker Compose: Postgres, backend (with `db push`/dev), frontend dev.
- Migrations exist in `backend/prisma/migrations`.
- No CI/tests detected.

## 2. What Can Be Reused

| Capability | Reuse Strategy |
|------------|----------------|
| Auth (JWT + `/api/auth`) | Extend `User`/`UserRole` and token payload to support `COOK`; reuse login/register/change-password. |
| Cart/Checkout (`lib/order.ts`) | Add `source` and `cookListingId` fields to `Order`/`OrderItem` so existing engine handles cook orders. |
| Payment/Settlement (`lib/payment.ts`, `Payment`) | Already idempotency-keyed; reuse for cook orders. Add cook settlement ledger. |
| Delivery (`DeliveryZone`, `resolveDelivery`) | Reuse for delivery radius; later add distance/radius query for "Food Around Me". |
| Rider (`Rider` model, `/api/rider`) | Reuse as-is for restaurant and cook deliveries; extend with online/offline location if needed. |
| Admin dashboard (`Admin.tsx`) | Add `cooks`, `cook-listings`, `rider-control` tabs. |
| Order tracking (`TrackOrder`) | Extend status labels for cook flow. |
| Media upload | Currently only `heroImage` string; need to build multi-media. |

## 3. What Needs Extension

### Authentication / Users
- `UserRole` must gain `COOK`.
- Support multi-role user (CUSTOMER + COOK + RIDER) without duplicate accounts.
- Best path: add `roles String[]` to `User`, default to `[$1]` from `role`, keep `role` for compatibility; token returns `roles`.

### Database
- `CookProfile` model.
- `CookListing` / `FoodListing` model (distinct from `Food` to avoid conflating restaurant items).
- `CookListingMedia` (or generic `Media`) for multi-image/video.
- `Order.source` (RESTAURANT | COOK | OTHER_FUTURE) and `cookListingId`/`cookId`.
- `Address` model for customers (saved addresses + coordinates).
- `CookOrderStatus` mapping to existing order status list.
- `Message` / `Conversation` for cook-customer chat.
- `Review` for cook/listing/rider.
- Optional `RiderLocation` for dispatch.

### Backend
- `/api/cooks` (apply, profile, listings, open/close, orders, earnings, messages).
- `/api/listings` (discovery, food around me, cook detail).
- `/api/delivery/nearby` for location-based discovery.
- `/api/rider` extensions: online toggle, location, concurrency-safe claim, pause/ban checks.
- `/api/admin` extensions: cook/listing moderation, rider controls.
- `/api/orders` extension: `source`, `cookId` in create.

### Frontend
- `/cook` (or `/host`) portal route.
- Customer discovery: `/food-around-me`, `/cooks`, `/restaurants` (or tabs).
- `FoodCard` upgraded to multi-media carousel.
- Cook profile/detail pages.
- Chat UI.

## 4. What Needs New Tables

1. `CookProfile`
2. `CookListing`
3. `CookListingMedia` (or generic `Media`)
4. `UserAddress` (with lat/lon)
5. `Message` / `Conversation`
6. `Review`
7. `RiderLocation` (optional)
8. `CookEarning` / `CookSettlement` (settlement ledger)

## 5. New APIs

- `POST /api/cooks/apply` and related CRUD.
- `GET /api/cooks/me`
- `POST /api/cook/listings` (create)
- `PATCH /api/cook/listings/:id/status`
- `GET /api/listings` (discovery with filters)
- `GET /api/listings/nearby`
- `GET /api/listings/:id`
- `POST /api/cook/orders/:id/accept`
- `POST /api/cook/orders/:id/preparing`
- `POST /api/cook/orders/:id/ready`
- `GET /api/cook/earnings`
- `POST /api/conversations/:orderId/message`
- `GET /api/admin/cooks/pending`, `/api/admin/cooks/:id/approve`, etc.
- `POST /api/admin/riders/:id/pause` etc.
- `POST /api/rider/me/online`, `/api/rider/location`

## 6. New Frontend Routes/Components

- `/cook` portal (kitchen status, add food, menu, orders, earnings, profile).
- `/cook/listing/:id`? Could be `FoodDetail` reused for cook listings.
- `/cooks/:cookId` profile.
- Discovery tabs: `FoodAroundMe`, `Cooks`, `Restaurants`.
- Multi-media `FoodCard` carousel component.
- `CookDashboard`, `CookListingForm`, `CookOrders`, `CookEarnings`, `CookMenu`.

## 7. Potential Breaking Points

1. **Single `UserRole` enum** — cannot represent multi-role. Must migrate to `roles[]` or accepted hack.
2. **`Food` table only supports restaurant items** — conflating with cook listings if extended directly. Better add `CookListing`.
3. **No geospatial coordinates** — "Food Around Me" will require lat/lon and distance math.
4. **No concurrency-safe claim** — `rider/orders/:orderNumber/claim` has race window.
5. **JWT token carries only one `role`** — admin/cook/rider routes will need `roles` array checks.
6. **No real-time infrastructure** — status updates use polling; must decide if websockets needed or keep polling.
7. **Stock decremented at order creation** — cook listings may want stock/capacity; same pattern fine but `CookListing` stock field.
8. **Payment settlement not split** — need `CookEarning` ledger and `OYE_WELL` commission concept.

## 8. Migration Strategy

1. Phase A (this report).
2. Phase B: add `COOK` to `UserRole`, add `roles String[]` to `User`, keep `role` for back-compat; update auth token payload.
3. Phase C: create `CookProfile`, `CookListing`, `CookListingMedia`, `UserAddress`, `Message`, `Review`, `CookEarning`; add `Order.source` and cook FKs; create migrations.
4. Phase D: backend cook/listing/nearby/message APIs.
5. Phase E: `/cook` portal.
6. Phase F: customer discovery tabs.
7. Phase G: multi-media `FoodCard`.
8. Phase H: location-aware nearby queries.
9. Phase I: extend order lifecycle (cook statuses + settlement).
10. Phase J: rider dispatch + concurrency + controls.
11. Phase K: real-time (optional: polling improvements first).
12. Phase L: admin marketplace sections.
13. Phase M: tests, security, performance.
14. Phase N: final production-readiness.

## 9. Existing Technical Debt

- `User.role` is single enum; no roles array.
- No geospatial indexes (Postgres can support `point` or ` geography` types).
- No real-time; all status updates require refresh.
- `rider.ts` claim not atomic concurrency-safe.
- Frontend has two separate login tokens (`customer_token`, `rider_token`, `admin_token`) — should unify to one token with roles.
- No upload service for images/videos (only base64 string on payment proof, limited to 2 MB).
- `DeliveryZone` uses arbitrary `Json` boundary; no actual distance math.
- `Food`/`Order` models conflate restaurant and future cook sources.

## 10. Recommended Implementation Order (Phases A-N)

A. Audit (done).  
B. Auth/role (add `COOK`, `roles[]`).  
C. Database schema (cook, listing, media, order source, address, message, review).  
D. Backend marketplace services.  
E. Cook portal.  
F. Customer discovery.  
G. Multi-media feed.  
H. Food Around Me (location).  
I. Extended order/payment lifecycle.  
J. Rider dispatch/controls.  
K. Realtime/polling improvements.  
L. Admin marketplace.  
M. Tests/security/performance.  
N. Production-readiness.
