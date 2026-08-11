---
description: Staged rollout plan for the delivery network features
---

# Delivery Network Rollout Strategy

Use this workflow to release the delivery-network changes safely.

## Pre-flight
1. Run `npm run build` in `backend/` and `frontend/`.
2. Run `npm test` in `backend/`.
3. Apply the latest Prisma migration (`npx prisma migrate deploy` from `backend/`).
4. Seed default `FeatureFlag` rows: `neighborhood_delivery`, `professional_delivery`, `delivery_type_switching`.

## Stage 1 — Foundation
- Enable `neighborhood_delivery` flag only.
- Deploy backend/frontend.
- Verify existing restaurant/cook order flow still works.

## Stage 2 — Onboard riders
- Open rider application endpoints.
- Approve a small cohort of neighborhood riders.
- Test `/rider/orders` and `/rider/orders/:orderNumber/claim`.

## Stage 3 — Neighborhood dispatch
- Enable cook `Food is Ready` flow.
- Verify `dispatchOrder` rings and SSE events.
- Run a few end-to-end deliveries.

## Stage 4 — Pricing rules
- Populate `DeliveryPricingRule` for active zones.
- Confirm delivery fee/ETA in cart and checkout.

## Stage 5 — Professional tier
- Enable `professional_delivery` flag.
- Onboard professional riders and run inspections.
- Test professional order flow and pricing.

## Stage 6 — Customer switch + radius expand
- Enable `delivery_type_switching`.
- Test `/orders/:orderNumber/switch-delivery-type` and `/admin/orders/:id/expand-dispatch`.

## Stage 7 — Financial
- Verify rider earnings, withdrawal requests, and admin payout settlement.

## Stage 8 — Analytics and monitoring
- Enable admin dashboards and `/delivery-analytics`.
- Monitor safety report and cancellation rates.

// turbo
npm test
