# OyeWell Location & Geo-Logistics Architecture

## Overview
A centralized, provider-abstracted location layer powers discovery, delivery, rider dispatch, live tracking, and admin geo-analytics.

## Core Components

### Backend
- `backend/src/lib/location.ts` — shared primitives: geocoding, reverse geocoding, distance, routing, ETA, validation, freshness and caching.
- `backend/src/lib/maps.ts` — `MapProvider` interface with `MOCK`, `GOOGLE` and `MAPBOX` implementations.
- `backend/src/lib/delivery.ts` — delivery zone resolution, fee and ETA calculation.
- `backend/src/lib/assignment.ts` — route-aware rider dispatch with progressive radius.
- `backend/src/lib/features.ts` — cached feature flags for gating delivery tiers.
- `backend/src/lib/order.ts` — `serializeOrder` adds `pickupLocation`, `pickupArea`, `cookName` and `riderLocation`.

### Frontend
- `frontend/src/components/MapView.tsx` — abstract visual map component.
- `frontend/src/components/DeliveryMap.tsx` — customer delivery map.
- `frontend/src/components/PinAdjustMap.tsx` — manual pin adjustment.
- `frontend/src/pages/TrackOrder.tsx` — live rider tracking via SSE.
- `frontend/src/pages/Rider.tsx` — rider navigation links for pickup/dropoff.
- `frontend/src/pages/Admin.tsx` — admin live map and service-area analytics.

## Data Flow
1. Customer enters an address; it is geocoded once and cached.
2. `resolveDelivery` finds the delivery zone and computes fee and ETA using road distance when possible.
3. Discovery (`/api/listings/around-me`) returns cooks in concentric rings around the customer.
4. Orders are dispatched to eligible riders based on distance, availability, mode, and route ETA.
5. Riders report locations; updates are validated for accuracy and realism, then broadcast via SSE.
6. Customers and admins see live maps; exact coordinates are masked for privacy.

## Security & Privacy
- Rider `userId` is not broadcast with location events.
- Cook exact coordinates are not exposed publicly; only `operatingArea` is shown.
- Admin live map only shows online, fresh rider positions and active cook listings.
- Locations are validated and rejected if they exceed bounds or accuracy thresholds.
- Velocity checks reject unrealistic rider jumps to prevent spoofing.

## Caching & Performance
- Geocoding and routing results are cached in memory with TTL.
- Feature flags are cached to avoid repeated DB hits.
- Map markers use `useMemo`; `MapView` reduces to a list under `save-data` / `reduced-motion`.
- Database indexes support `Order`, `RiderLocation` and `CookListing` geo queries.
