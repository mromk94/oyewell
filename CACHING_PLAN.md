# OyeWell Caching Implementation Plan

## Current state (audit)

- **No Redis or external cache**: `package.json` has no Redis/Upstash client, `docker-compose.yml` has no cache service.
- **No backend application cache**: every API call currently hits the database; no `Cache-Control` / `ETag` / `Last-Modified` headers on responses (only SSE explicitly disables caching).
- **No frontend query library**: data is fetched with raw `fetch` in `useEffect`, causing repeated requests on remounts and navigations.
- **Basic PWA service worker**: `frontend/public/sw.js` only precaches the SPA shell and same-origin static assets with stale-while-revalidate. It does not cache API calls.
- **Existing event system**: backend already emits events via `emitEvent` (`backend/src/lib/realtime.ts`), which can be used for event-driven invalidation.

## Target architecture

```
USER
 └─ PWA / browser cache (shell + assets)
 └─ Frontend data cache (TanStack Query / in-memory + localStorage)
 └─ CDN / HTTP cache headers for public resources
 └─ API
      ├─ Application logic
      └─ CacheService ─ Redis / Valkey
              └─ Database (fallback)
```

## Sequential implementation tasks

### Phase 0 — Infrastructure & core cache service
1. **Add cache infrastructure**
   - Add a `redis` or `valkey` service to `docker-compose.yml`.
   - Add `ioredis` (or `redis`) dependency to `backend/package.json`.
   - Add `REDIS_URL` / `CACHE_URL` to `.env` and `.env.example`.
   - Wire cache client in `backend/src/lib/cache.ts` with graceful fallback when unavailable.

2. **Create a central `CacheService`**
   - API: `get`, `set`, `delete`, `deleteByPattern`, `getOrSet`, `remember`, `invalidate`, `invalidateTags`, `healthCheck`.
   - Namespaced keys: `oyewell:{env}:{domain}:{resource}:{identifier}:{v}`.
   - TTL profiles: `veryLong` (1–24h), `medium` (5–30m), `short` (15s–2m), `veryShort` (1–15s), `none`.
   - Optional TTL jitter to avoid synchronized expiry.

3. **Establish cache categories & key conventions**
   - Document `static`, `semiStatic`, `dynamic`, `realTime` categories.
   - Define per-resource TTL and invalidation rules.
   - Add `CACHE_MATRIX.md` template as implementation proceeds.

### Phase 1 — Database protection (do before heavy caching)
4. **Index & query audit**
   - Review expensive joins, N+1 queries, geospatial/feed queries, and aggregation queries.
   - Add missing Prisma indexes for hot lookup patterns (`cookListingId`, `customerId`, `status`, `riderId`, etc.).
   - Fix obvious slow queries before hiding them behind cache.

### Phase 2 — Backend public-read caching
5. **Public configuration / categories**
   - Cache `RestaurantSetting`, payment-method lists, and static enums/flags with long TTL.
   - Invalidate on admin updates.

6. **Cook / listing discovery**
   - Cache public cook listings, cook profiles, and listing detail pages as `semiStatic`.
   - Use coarse geohash/location bucket in keys (not raw lat/lng).
   - Invalidate on cook edit, price change, stock change, kitchen status change.

7. **Menu / food listing pages**
   - Cache menu structure and food cards.
   - Always re-fetch authoritative price/availability at order creation.

8. **Home / Explore / Feed**
   - Build aggregated or bucketed feed caches.
   - Use stale-while-revalidate for content that can be slightly stale.
   - Keep `Food Around Me` bucketed by geo cell.

9. **Search**
   - Cache repeated search queries with short TTL.
   - Normalize keys (lowercase, trim, filters hash, location bucket).
   - Bound total search cache size / TTL.

### Phase 3 — Dynamic & operational caching
10. **Delivery zones & pricing**
    - Cache delivery zones, pricing rules, and map settings.
    - No stale cache for live rider availability or active trip assignment.

11. **Rider presence**
    - Add short-expiry presence keys (`rider:presence:{id}`) with heartbeat.
    - Use for discovery, but verify assignment atomically against the database.

12. **Order state**
    - Cache order details for read performance with very short TTL or event invalidation only.
    - Payment status, wallet, and ledger remain authoritative from the database.

13. **Notifications**
    - Cache unread count and notification list with short TTL.
    - Invalidate immediately on mark-read / new notification.

### Phase 4 — Admin & management
14. **Admin dashboard data**
    - Cache read-heavy counts, analytics, and lists with short TTL.
    - Label stale data in the UI (`Updated 30s ago`).
    - Invalidate on admin write actions.

15. **Admin write invalidation**
    - Every admin route that creates/updates/deletes must trigger targeted invalidation for affected keys/tags.

### Phase 5 — Frontend caching
16. **Introduce TanStack Query or SWR**
    - Add `@tanstack/react-query` to `frontend/package.json`.
    - Wrap `QueryClientProvider` in `main.tsx`.
    - Migrate the highest-traffic read endpoints first: `Home`, `Explore`, `cook listings`, `Account orders`.
    - Configure `staleTime`, `gcTime`, retry, and background refetch.

17. **Frontend query cache invalidation**
    - Tie mutations to query invalidation.
    - Clear private queries on logout/login to prevent cross-user cache leakage.

18. **PWA / service worker alignment**
    - Keep `sw.js` for the SPA shell and assets only.
    - Ensure API calls are not cached by the SW (except safe public GETs if explicitly allowed).
    - Add `Cache-Control` headers for immutable build assets.

### Phase 6 — HTTP cache headers & media
19. **HTTP cache headers**
    - Add `Cache-Control: public, max-age=..., stale-while-revalidate=...` for public GET resources.
    - Add `Cache-Control: private, no-store` for authenticated / user-specific endpoints.
    - Use `ETag` for static resources and large lists where appropriate.

20. **Media CDN strategy**
    - Ensure image/video URLs are served from object storage/CDN, not through the API.
    - Use immutable/versioned media URLs.

### Phase 7 — Safety & observability
21. **Cache failure handling**
    - Cache service must fall back to the database if Redis is down.
    - Add circuit-breaker/backoff to avoid DB stampede during cache outage.
    - Log cache connection errors and treat them as warnings, not fatal.

22. **Stampede protection**
    - Add request coalescing / single-flight for expensive cache-miss paths.
    - Use stale-while-revalidate on popular shared keys.

23. **Cache observability**
    - Log cache hits, misses, and invalidations.
    - Add `/health/cache` endpoint.
    - Track hit rate for key endpoints.

24. **Testing & correctness**
    - Test cache hit, miss, TTL expiry, write invalidation, partial invalidation, user/admin isolation, and fallback.
    - Load-test the highest-traffic flows (Home, feed, search) before/after.
    - Document final cache matrix (resource, TTL, invalidation, stale-allowed, scope, fallback).

## Non-goals / red lines

- Do **not** cache wallet balance, payment status, or order state as authoritative.
- Do **not** cache private user data globally or in shared keys.
- Do **not** use `FLUSHALL` in normal operations.
- Do **not** cache bad queries before fixing them.
