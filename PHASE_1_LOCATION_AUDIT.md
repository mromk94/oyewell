# OyeWell Location & Geo-Logistics — Phase 1 Audit

## 1. Existing location systems

### Backend
- `lib/maps.ts` — map provider abstraction with `MockMapProvider`, `GoogleMapsProvider`, `MapboxMapProvider`. Exposes `geocode()` and `isPointInZone()`. Currently only `geocode()` is implemented for all providers; `isPointInZone()` is a stub.
- `lib/delivery.ts` — uses `getMapProvider().geocode()` for order address → coordinates, `haversineMeters()` for straight-line distance, `findDeliveryZone()` for zone matching (city, area, radius, polygon).
- `lib/assignment.ts` — geocodes order address, ranks eligible riders by straight-line distance from rider `RiderLocation` to the order.
- `lib/listings.ts` (route) — `Food Around Me` API: filters by `cook.latitude / longitude` within a `radiusKm` using `distanceKm()` from `lib/maps.js` (haversine).
- `routes/rider.ts` — `POST /location` receives `{ latitude, longitude }` and stores it in `RiderLocation`.
- `routes/cooks.ts` — cook profile apply/update accepts `latitude`, `longitude`, `serviceRadiusKm`.

### Frontend
- `navigator.geolocation` is **not currently used** in the searched source set.
- Address entry is plain text inputs in `CookListingDetail.tsx` and `CartModal.tsx`.
- `MapPin` icon is used decoratively; no interactive map component exists.
- `Rider.tsx` displays order address text and has a `MapPin` icon.

## 2. Existing map provider
- `lib/maps.ts` loads `Mapbox` access token or `Google Maps` API key from env.
- Fallback `MOCK` provider uses a hash of the address to return deterministic coordinates.
- Provider is selected by `process.env.MAP_PROVIDER` (defaults to `MOCK`).

## 3. Existing geocoding provider
- `MockMapProvider.geocode()` — deterministic fake.
- `GoogleMapsProvider.geocode()` — Google Geocoding API.
- `MapboxMapProvider.geocode()` — Mapbox Geocoding API.
- No reverse geocoding endpoint currently exists.

## 4. Existing routing provider
- None. Only straight-line `haversineMeters()` and `distanceKm()` exist.

## 5. Existing geospatial database support
- Prisma schema uses `Float` for `latitude` / `longitude` on `CookProfile`, `Restaurant`, `UserAddress`, `RiderLocation`.
- `DeliveryZone` stores a JSON `boundary` with city/area/radius/polygon descriptors.
- No PostGIS or native `geography`/`point` columns. No spatial indexes.
- Existing indexes: `@@index([latitude, longitude])` on `RiderLocation` (helps but not spatial).

## 6. Existing rider location tracking
- `RiderLocation` model stores one row per rider with `latitude`, `longitude`, `updatedAt`.
- `POST /rider/location` updates it.
- No timestamp-specific field beyond `updatedAt`; no staleness logic.

## 7. Existing Food Around Me logic
- `routes/listings.ts` `GET /listings/around-me`:
  - Takes `lat`, `lng`, `radiusKm`.
  - Filters to cooks with non-null lat/lng.
  - Computes straight-line distance with `distanceKm()`.
  - Returns listings within `radiusKm`, sorted by `createdAt` (not by distance).

## 8. Existing delivery distance calculations
- `lib/delivery.ts` `haversineMeters()` for fee distance if `perMeterKobo` rule is set.
- `lib/assignment.ts` `haversineMeters()` for ranking eligible riders.
- All current distance is straight-line.

## 9. Existing delivery pricing calculations
- `resolveDelivery()` in `lib/delivery.ts` fetches `DeliveryPricingRule` per `deliveryType` and `deliveryZoneId`.
- Base fee + `perMeterKobo * haversineMeters(center, customer_coords)`.
- ETA uses `estimatedMinutes` from rule or zone.

## 10. Existing location permissions
- None. Frontend does not request `navigator.geolocation`.
- No location accuracy stored.
- No anti-spoofing validation.

## Recommendations for next phases
1. Reuse `lib/maps.ts` as the central location service by extending it with `reverseGeocode`, `distance`, `route`, `eta`.
2. Create a shared `Location` type (`lat/lng/address/city/...`) used by all modules.
3. Add reverse geocoding endpoint and customer location permission UX.
4. Improve `Food Around Me` to sort by distance and add fallback radius expansion.
5. Add road-distance option behind a provider abstraction with cost/fallback controls.
6. Consider spatial indexing once the PostgreSQL migration can be applied.
