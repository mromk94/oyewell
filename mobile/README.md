# OYE Well Mobile

Native iOS and Android clients for the OYE Well food marketplace.

## Tech stack

- **Expo SDK 51** with React Native 0.74
- **React Navigation 6** (stack + bottom tabs)
- **Expo SecureStore** for token storage
- **Expo Notifications / Linking / Location / Image Picker** for native capabilities
- **TypeScript** with strict mode

## Setup

```bash
cd mobile
cp .env.example .env
npm install
```

## Run

```bash
npx expo start
```

Then press `i` for iOS or `a` for Android (requires simulator/emulator).

## Environment

Set `EXPO_PUBLIC_API_URL` in `.env` to point at your backend. Defaults to `http://localhost:4000`.

## Roles

The app is role-aware and switches the bottom tabs based on `user.role`:

- `CUSTOMER` — home, orders, cart, wallet, account
- `COOK` — dashboard, account
- `RIDER` — dashboard, account
- `ADMIN` / `MANAGEMENT` — dashboard, account

## Security

- Tokens are stored in iOS Keychain / Android Keystore via `expo-secure-store`.
- Backend is the source of truth for all business logic; the mobile app only renders state and invokes API endpoints.
- No backend secrets are bundled in the app; the API base URL is configurable through `.env`.

## Next steps

- Wire cook order-accept and menu-management endpoints.
- Wire rider delivery-claim, pickup, and trip flow endpoints.
- Wire management moderation, payment review, and KYC endpoints.
- Configure APNs and FCM push credentials for production.
- Set up EAS build for App Store / Play Store submissions.
