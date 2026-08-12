# Phase 1 — Native Mobile Audit

## 1. Mobile project status
- **No native iOS, Android, or Flutter project exists** in the repository.
- The existing frontend is a **Vite + React + TypeScript + Tailwind CSS PWA**.
- PWA is configured: `frontend/public/manifest.json`, `frontend/public/sw.js`, `frontend/src/main.tsx` registers the SW.
- **Mobile build target is currently the PWA only.**

## 2. PWA + Frontend Architecture
- **Framework**: React 18 + React Router DOM 6.
- **Styling**: Tailwind CSS 3.4 with custom `brand` color tokens (`#0f0f0f`, `#1a1a1a`, `#f4f4f0`) and `Inter` font.
- **Motion**: Framer Motion, Lucide icons.
- **State**: `AuthProvider` (context), `CartProvider` (context), `localStorage` for customer/rider/admin tokens.
- **Router pages** (`frontend/src/pages`):
  - `/` Home
  - `/food/:slug` Food detail
  - `/track/:orderNumber` Order tracking
  - `/rider` Rider experience
  - `/cook` Cook experience
  - `/cook-listing/:id` Cook listing detail
  - `/login`, `/register`, `/account` Customer auth/account
  - `/admin` Admin management
- **Shared components** (`frontend/src/components`):
  - Cart, account, auth, notification bell/listener, order/cook cards, maps, toasts.
- **Real-time on web**: `NotificationListener` likely polls the backend; backend has an in-process `EventEmitter` bus (`backend/src/lib/realtime.ts`) but no persistent pub/sub or WebSocket.

## 3. Backend API Inventory
- **Runtime**: Node.js, Express 4, TypeScript, ESM.
- **Database**: Prisma 5.13 with PostgreSQL (or compatible) via `DATABASE_URL`.
- **Cache/Queue**: `ioredis` is installed; used for some cache but not fully quantified here.
- **Email**: Nodemailer.
- **Auth**: JWT (`jsonwebtoken`) with `JWT_SECRET`, `JWT_EXPIRES_IN`.
- **Routes** (`backend/src/routes`):
  - `auth.ts` — customer/rider/admin login, register, forgot/reset password, change password, forgot/reset, `/me`.
  - `admin.ts` — admin dashboard, foods, orders, riders, deliveries, etc. (under `requireAuth` + `requireAdmin`).
  - `rider.ts` — rider register/login/orders/availability/claim/pickup/start/verify/earnings.
  - `cooks.ts` — cook profiles, listings, earnings, approvals.
  - `orders.ts`, `payments.ts`, `delivery.ts`, `sides.ts`, `foods.ts` — order lifecycle, payment, delivery.
  - `management.ts`, `moderation.ts`, `approvals.ts`, `tickets.ts`, `disputes.ts`, `evidence.ts`, `legal.ts`, `audit.ts` — management/moderation.
  - `messages.ts`, `chat.ts`, `events.ts`, `webhooks.ts` — messaging, events, webhooks.
- **Middleware**: `auth.ts` (`requireAuth`, `requireAdmin`, `requireRole`, `requirePermission`, `requireRider`), generic `rateLimit`.

## 4. Authentication Inventory
- Customer token stored in `localStorage` as `customer_token`.
- Rider token stored in `localStorage` as `rider_token`.
- Admin token stored in `localStorage` as `admin_token`.
- Tokens are JWT, 7-day default expiry, no refresh token, no secure keychain storage.
- Login endpoints differ per role: `/api/auth/login` for admin/customer, `/api/rider/login` for riders, cook likely uses `/api/auth/login`.
- Roles: `CUSTOMER`, `ADMIN`, `RIDER`, `COOK` plus permissions via `hasPermission`.

## 5. Feature Parity (High Level)
- **Customer**: home, discovery, search, food/cook details, cart, checkout, manual/gateway payment, order tracking, wallet/account, notifications, reviews, disputes, favorites, referrals.
- **Cook**: onboarding/KYC, menu/food management, order accept/prepare/ready, earnings/wallet, analytics.
- **Rider**: register/login, availability, open deliveries, claim, pickup code, trip, delivery code, earnings.
- **Management**: admin dashboard, orders, payments, users, cooks, riders, moderation, disputes, KYC, audit.

## 6. What is reusable
- **Backend API**: can be consumed by mobile directly.
- **Design tokens**: Tailwind `brand` colors, `Inter` font, border-radius `2xl`, white-on-dark branding.
- **Icon set**: Lucide (has React Native/Expo equivalent).
- **PWA assets**: `pwa-icon-*` icons, `manifest.json`, copy/brand.

## 7. What is missing
- Native iOS/Android project (no Xcode, no Android project, no Flutter, no Expo).
- Secure token storage (Keychain / Keystore).
- Push notification infrastructure on backend (FCM/APNs).
- Deep linking / app links configuration.
- Native camera/location/file picker integration.
- Biometric auth (optional).
- Mobile API client with offline/retry logic.
- Mobile-specific navigation shell.

## 8. What is broken / risks
- Real-time is limited to in-process `EventEmitter` — not suitable for multi-instance server deployments.
- Tokens in `localStorage` are not secure for mobile; must use Keychain/Keystore.
- Password reset flow was just hardened but DB user has access issues in this environment; production `prestart` runs `db push`.

## 9. Files that will change / be created
- New `mobile/` directory for the native app (Expo/React Native recommended).
- `mobile/src/lib/api.ts` to mirror web API client.
- `mobile/src/lib/auth.ts` with secure token storage.
- `mobile/src/navigation/` for role-based bottom tab navigation.
- `mobile/src/theme.ts` (design tokens).
- Backend may need small additions for push tokens (`/rider/push-token`, `/user/push-token`) and notification delivery (FCM/APNs).

## 10. What will NOT be changed
- Existing web/PWA remains untouched and functional.
- Backend business logic and order/delivery state machines stay as-is.
- Database schema only changed if a new push-token table is needed.

## 11. Risks
- Backend real-time is not scalable; mobile push/notification infrastructure may need backend work.
- Multi-role single-app UX is complex (customer ↔ cook ↔ rider switching).
- Deep linking and app-store configuration require platform-specific credentials.

## 12. Testing Plan
- Validate backend API parity with a mobile-style request (same endpoints, same headers).
- Verify PWA still builds and works after creating `mobile/` directory.
- Check `api.ts` on mobile can reach `API_BASE` (env config).
- Test auth token storage/retrieval on iOS Simulator and Android Emulator.
