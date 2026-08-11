# OyeWell — Management, Trust & Safety, Communication, Support, Disputes
## Phase A — Current-System Audit

### 1. Existing Architecture Snapshot

#### Frontend
- **Framework**: React 18 + Vite + TypeScript + TailwindCSS + Framer Motion + Lucide icons.
- **Routing** (`App.tsx`): `/`, `/food/:slug`, `/track/:orderNumber`, `/rider`, `/login`, `/register`, `/account`, `/admin`, `/cook`, `/cook/listing/:id`.
- **State/Context**: `AuthProvider` (multi-role token), `CartProvider`, `Toast`.
- **Customer pages**: `Home`, `FoodDetail`, `TrackOrder`, `Account`, `Login`, `Register`, `CookListingDetail`.
- **Cook page** (`Cook.tsx`): apply, dashboard, menu, orders, earnings, profile. Uses `lib/cook.ts`.
- **Rider page** (`Rider.tsx`): orders, available, verify, earnings, profile. Uses `lib/rider.ts`.
- **Admin page** (`Admin.tsx`): dashboard, menu, orders, sides, customers, delivery, payments, settings, email, riders, cooks. Uses `lib/admin.ts` and `admin_token`.
- **API libraries**: `lib/api.ts`, `lib/admin.ts`, `lib/rider.ts`, `lib/cook.ts`, `lib/listings.ts`, `lib/messages.ts` (not present), `lib/notifications.ts`.

#### Backend
- **Framework**: Express + TypeScript (ESM) + Prisma ORM + PostgreSQL.
- **Routes** (`index.ts`): `/api/foods`, `/api/auth`, `/api/delivery`, `/api/orders`, `/api/sides`, `/api/payments`, `/api/admin`, `/api/rider`, `/api/cooks`, `/api/listings`, `/api/messages`, `/api/reviews`, `/api/events`, `/api/location`.
- **Auth**: JWT `Bearer` token; `requireAuth`, `requireRole`, `requireAdmin` middleware; `User.roles` array.
- **Order engine**: `lib/order.ts` `createOrder` supports `RESTAURANT` and `COOK` sources.
- **Payment**: `lib/payment.ts` supports `MOCK`, `PAYSTACK`, `FLUTTERWAVE`, `CRYPTO`, `BANK_TRANSFER`.
- **Rider engine**: application, orders, earnings, location, inspections, payouts.
- **Cook engine**: apply, profile, listings, kitchen status, orders, earnings.
- **Real-time**: Server-Sent Events `/api/events` with `emitEvent`.
- **Rate-limiting**: `rateLimit` middleware (120 req/min).

#### Database (`prisma/schema.prisma`)
- `User` with `role` enum and `roles` array.
- `Rider` with `RiderLocation`, `RiderInspection`, `RiderPayoutRequest`.
- `CookProfile`, `CookListing`, `CookListingMedia`, `CookEarning`.
- `Order`, `OrderItem`, `OrderSide`, `OrderStatusHistory`, `Payment`, `PaymentAttempt`.
- `Message` (order-only chat), `Review`.
- `UserAddress`, `DeliveryZone`, `DeliveryPricingRule`.
- `RestaurantSetting`, `PaymentMethodConfig`, `EmailConfig`.
- `FeatureFlag`, `GenericTask`.

### 2. Existing Management / Admin Capability

| Capability | Current State |
|------------|---------------|
| Admin dashboard | `/admin` with `dashboard`, `menu`, `orders`, `sides`, `customers`, `delivery`, `payments`, `settings`, `email`, `riders`, `cooks` tabs. |
| Customer role change | `PATCH /api/admin/customers/:id/role` (single role). |
| Rider approval/controls | `approve`, `pause`, `suspend`, `ban`, `restore`, `inspections`, `payouts`. |
| Cook approval | `approveCook`, `rejectCook`, `fetchAdminCooks`; `approveCookListing`, `rejectCookListing`, `fetchAdminCookListings`. |
| Earnings | `fetchAdminCookEarnings`. |
| Audit logging | **None**. No `AuditLog` model or `audit.ts` service. |
| Granular permissions | **None**. Only `ADMIN` role; no per-action permissions. |
| Employee management | **None**. No `Employee` or `EmployeeRole` models. |
| Geographic/community moderators | **None**. No `Moderator`, `ModeratorArea`, or location-based assignment. |
| Approval engine | **Partial**. Only cook/listing/rider approve/reject; no generic `Approval` model. |
| Support tickets | **None**. No `Ticket` model or routes. |
| Disputes | **None**. No `Dispute` model or routes. |
| Chat system | **Basic**. `Message` tied to `Order`; no conversation list, moderation, or reporting. |
| Terms/legal acceptance | **None**. No `TermsAcceptance` or `LegalDocument` models. |
| Moderator UI | **None**. Admin has no moderator-specific case views. |
| Exports/reporting | **None**. No CSV/PDF export or reporting endpoints. |
| Search | **None** for cases, tickets, disputes, employees. |

### 3. What Can Be Reused

| Capability | Reuse Strategy |
|------------|----------------|
| Auth/roles | `User.roles` array and `requireRole` middleware already support `ADMIN`, `COOK`, `RIDER`, `CUSTOMER`. Add management roles to `roles` string array. |
| Order/chat | `Message` model can be extended to support conversations and moderation. |
| Order status history | `OrderStatusHistory` can be extended for dispute timeline evidence. |
| Cook profile statuses | `CookProfileStatus` and `CookKitchenStatus` enums already have `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`, etc. |
| Admin dashboard | `Admin.tsx` can gain new tabs for `employees`, `moderators`, `tickets`, `disputes`, `audit-logs`, `approvals`, `reports`, `legal`. |
| Existing approval endpoints | `/api/admin/cooks/:id/approve`, `/api/admin/cooks/:id/reject`, listing approve/reject. Refactor into a generic approval engine. |
| Notifications | `lib/notifications.ts` exists; extend for ticket/dispute updates. |

### 4. What Needs New Models / Tables

1. `ManagementEmployee` / `Employee` — admin staff with tier/role/permissions.
2. `Permission` — granular per-action permissions.
3. `AuditLog` — immutable log of sensitive actions.
4. `Approval` — generic approval workflow (cook, listing, rider, refund, etc.).
5. `ModeratorArea` — geographic assignments for community moderators.
6. `Ticket` — customer support tickets.
7. `Dispute` — order/transaction disputes with status and resolution.
8. `DisputeEvidence` / `CaseEvidence` — attached evidence records.
9. `LegalDocument` / `TermsAcceptance` — legal doc versions and user acceptance.
10. `Report` — user reports for content/moderation.

### 5. What Needs New Backend Routes

- `GET/POST /api/admin/employees`
- `GET/POST /api/admin/permissions`
- `GET/POST /api/admin/audit-logs`
- `GET/POST /api/admin/approvals`
- `GET/POST /api/admin/tickets`, `PATCH /api/admin/tickets/:id/assign`, `POST /api/admin/tickets/:id/reply`
- `GET/POST /api/admin/disputes`, `PATCH /api/admin/disputes/:id/assign`, `POST /api/admin/disputes/:id/resolve`
- `GET/POST /api/admin/reports`
- `GET/POST /api/admin/moderators`
- `GET/POST /api/support/tickets` (customer-facing)
- `POST /api/disputes` (customer/cook-facing)
- `GET/POST /api/legal/terms`

### 6. What Needs New Frontend Routes / Components

- `/admin/employees`
- `/admin/permissions`
- `/admin/audit-logs`
- `/admin/approvals`
- `/admin/tickets`
- `/admin/disputes`
- `/admin/reports`
- `/admin/moderators`
- `/admin/settings/legal`
- Customer: `/help`, `/support/tickets`, `/disputes`
- Cook: `/cook/disputes`, `/cook/support`

### 7. Potential Breaking Points

1. `User.roles` is a string array but there is no RBAC engine beyond `requireRole`. Adding permissions requires careful middleware changes.
2. `Admin.tsx` is large (~35 KB). Splitting it into sub-pages is recommended.
3. `Message` is currently order-scoped; extending it to general conversations requires schema changes.
4. `OrderStatusHistory` uses a `status` string and `actor` string; adding `actorType` would make audit timeline more reliable.
5. No existing file upload service beyond URL strings; evidence uploads need a real CDN/object-store flow.

### 8. Recommended Implementation Order (Groups A-S)

A. Repository/system audit (this report).  
B. Management domain (`Employee`, `Permission`).  
C. Admin tiers and RBAC.  
D. Employee management UI.  
E. Geographic/community moderator system.  
F. Approval engine (refactor existing approvals).  
G. Audit logging.  
H. Chat (extend `Message` to conversations).  
I. Moderation (reports, moderator assignments).  
J. Ticketing.  
K. Disputes.  
L. Evidence/timeline system.  
M. Legal documents and acceptance.  
N. Cook onboarding redesign (extend existing).  
O. Cook approval and packaging review (extend existing).  
P. Management dashboard.  
Q. Exports/reporting.  
R. Security audit.  
S. Performance optimization.
