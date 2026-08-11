# OYEWELL — PRODUCTION-GRADE CACHING & PERFORMANCE ARCHITECTURE

## MASTER MULTI-PHASE IMPLEMENTATION PROMPT

You are working on the existing OyeWell production application.

OyeWell currently has a functioning frontend and backend, but a major performance problem has been identified:

> Too many requests are going directly to the application server and database without an appropriate caching strategy.

This causes:

* unnecessary database reads
* repeated identical API requests
* slower page rendering
* slower navigation
* unnecessary server load
* unnecessary database load
* poor performance on mobile networks
* increased infrastructure cost
* poor scalability
* unnecessary repeated queries
* sluggish feeling when navigating between existing pages

Your task is to implement a **production-grade, application-wide caching architecture**.

This is NOT an instruction to blindly cache every request.

The goal is:

> **Reduce unnecessary origin/database requests while keeping user-visible information correct, fresh enough, and predictable.**

The system must feel:

* fast
* smooth
* responsive
* seamless
* reliable
* consistent
* scalable

Caching must be implemented across the existing OyeWell ecosystem, including:

* Home
* Food Discovery
* Explore
* Restaurants
* Cooks
* Food Listings
* Food Posts
* Menus
* Profiles
* Location-aware discovery
* Delivery
* Riders
* Orders
* Wallet-related non-sensitive read data where appropriate
* Notifications where appropriate
* Management
* Admin
* Moderation
* Configuration
* Search
* Public content
* Media
* Analytics/read-heavy data

BUT:

Do NOT cache sensitive or rapidly changing transactional information incorrectly.

---

# PHASE 0 — FULL PERFORMANCE AUDIT

Before writing caching code, inspect the entire application.

Do NOT immediately start adding cache calls.

Identify:

### Frontend

Inspect:

* Home page
* Food discovery
* Explore
* Restaurant pages
* Cook pages
* Food listings
* Food posts
* Profiles
* Dashboard
* Cook dashboard
* Rider dashboard
* Delivery pages
* Orders
* Wallet
* Notifications
* Admin
* Management
* Moderation
* Search
* Maps/location
* Chat
* Media
* Authentication

Identify:

* API requests
* server-side requests
* client-side requests
* repeated requests
* duplicate requests
* requests triggered on every render
* requests triggered on every navigation
* polling
* automatic refresh
* React/query hooks
* server components where applicable
* client components
* existing state management
* existing data-fetching libraries
* existing browser caching
* existing service workers/PWA behavior

---

# PHASE 1 — BACKEND AUDIT

Inspect every major backend service.

Identify:

* high-frequency endpoints
* read-heavy endpoints
* expensive queries
* repeated queries
* duplicate database queries
* N+1 queries
* aggregation queries
* geospatial queries
* menu queries
* feed queries
* profile queries
* admin queries
* rider queries
* delivery queries
* configuration queries

Determine:

> Which queries are repeatedly asking the database for information that does not change frequently?

Those are the first caching candidates.

---

# PHASE 2 — DATABASE AUDIT

Inspect database access patterns.

Identify:

* queries repeated within seconds
* expensive joins
* expensive aggregations
* frequently requested records
* frequently requested relationships
* location queries
* popularity queries
* feed ranking queries
* menu queries
* restaurant queries
* cook queries

Do not use caching to hide fundamentally broken database queries.

Where appropriate:

1. optimize the query,
2. add appropriate database indexes,
3. then cache the result.

Caching should not become an excuse for poor database design.

---

# PHASE 3 — DETERMINE THE EXISTING INFRASTRUCTURE

Before introducing anything new, inspect whether OyeWell already uses:

* Redis
* Upstash
* Memcached
* CDN
* Vercel caching
* Cloudflare
* HTTP cache headers
* React Query
* TanStack Query
* SWR
* Next.js caching
* service worker
* PWA cache
* server-side cache
* database query caching

If an appropriate caching infrastructure already exists:

> EXTEND IT.

Do NOT introduce a second caching technology unnecessarily.

If Redis already exists, prefer a properly structured Redis caching layer rather than installing another unrelated cache.

---

# PHASE 4 — CREATE A CENTRAL CACHE SERVICE

Do NOT scatter raw Redis calls throughout the application.

Create or extend a central cache service.

Conceptually:

```text
CacheService
 ├── get()
 ├── set()
 ├── delete()
 ├── deleteByPattern()
 ├── getOrSet()
 ├── remember()
 ├── invalidate()
 ├── invalidateTags()
 ├── getWithMetadata()
 └── healthCheck()
```

Use the existing architecture's conventions.

The rest of the application should communicate with the cache through this service.

Do not allow every developer/service to invent arbitrary cache keys.

---

# PHASE 5 — CACHE KEY STANDARD

Create a consistent cache-key strategy.

Do NOT create random strings such as:

```text
cache1
cache2
homepage
data
```

Keys should be namespaced.

Conceptually:

```text
oyewell:{environment}:{domain}:{resource}:{identifier}:{version}
```

Examples:

```text
oyewell:prod:restaurant:123:v1
oyewell:prod:cook:456:v1
oyewell:prod:menu:123:v2
oyewell:prod:food:nearby:{locationBucket}:v1
oyewell:prod:feed:{userContext}:v1
```

Follow the existing infrastructure conventions.

Never include unnecessary sensitive information in cache keys.

Do not place:

* passwords
* tokens
* payment information
* secrets
* private personal data

inside cache keys.

---

# PHASE 6 — CACHE VERSIONING

Support cache versioning.

For example:

```text
menu:v1
menu:v2
```

If the data structure changes significantly, allow old keys to expire naturally rather than requiring dangerous manual cleanup everywhere.

---

# PHASE 7 — CACHE CATEGORIES

Every cached resource must belong to a category.

At minimum:

## STATIC

Changes rarely.

Examples:

* public configuration
* categories
* supported food types
* static location metadata
* help content
* public feature configuration

Long TTL.

---

## SEMI-STATIC

Changes occasionally.

Examples:

* restaurant profile
* cook profile
* menu
* food listing
* public profile information

Moderate TTL.

---

## DYNAMIC

Changes frequently.

Examples:

* food availability
* kitchen status
* rider availability
* delivery estimates
* feed ranking
* order progress

Short TTL or event-driven invalidation.

---

## REAL-TIME / TRANSACTIONAL

Do not use ordinary stale caching as the authoritative source.

Examples:

* wallet balance during a transaction
* payment status
* order state transitions
* delivery state transitions
* chat messages
* authentication state
* financial ledger
* payout state

These should rely on the authoritative database/event system.

Caching may be used only as an optimization where correctness is guaranteed.

---

# PHASE 8 — TTL STRATEGY

Do NOT use one global TTL.

Create TTLs based on data behavior.

Use configuration rather than scattering hard-coded TTL numbers throughout the application.

Example starting strategy:

### Very long

For truly static/public configuration:

```text
1 hour – 24 hours
```

### Medium

For menus, profiles and relatively stable content:

```text
5 – 30 minutes
```

### Short

For discovery and availability:

```text
15 seconds – 2 minutes
```

### Very short

For rapidly changing operational information:

```text
1 – 15 seconds
```

### No normal stale cache

For critical transactional state:

* payment
* wallet ledger
* order state
* authentication
* financial transactions

These TTLs are starting points, not hard-coded requirements.

Inspect actual application behavior and choose appropriate values.

---

# PHASE 9 — STALE-WHILE-REVALIDATE

Where appropriate, implement stale-while-revalidate behavior.

The goal:

> The user should see useful data immediately while the system quietly refreshes it in the background.

Conceptually:

```text
User requests data
       ↓
Fresh cache?
   ┌───┴───┐
  YES      NO
   │        │
Return    stale cache?
            │
       ┌────┴────┐
      YES        NO
       │          │
Return stale     DB/API
       │
Background refresh
```

This is especially useful for:

* Home
* Explore
* Food Discovery
* restaurant lists
* cook lists
* menus
* public profiles

Do NOT use stale data where it can cause financial or operational mistakes.

---

# PHASE 10 — CACHE-ASIDE PATTERN

For normal read-heavy resources, use cache-aside where appropriate.

Conceptually:

```text
Request
   ↓
Cache
   ↓
Hit?
 ┌─┴─┐
YES NO
 │   │
Return
     ↓
   Database
     ↓
   Cache
     ↓
   Return
```

Avoid writing unnecessary cache entries for one-time reads.

---

# PHASE 11 — HOME PAGE CACHING

The Home page must be heavily optimized.

Inspect every request Home currently makes.

Determine:

* which data is static
* which data is semi-static
* which data is user-specific
* which data is location-specific
* which data is dynamic

Do NOT make Home hit the database independently for every component.

Where appropriate, create an aggregated Home response or efficient server-side composition.

Cache reusable portions.

For example:

```text
Home
 ├── Featured
 ├── Nearby food
 ├── Popular nearby
 ├── Restaurants
 ├── Cooks
 └── Categories
```

Do not cache the entire Home page identically for every user if location/personalization differs.

Use appropriate location/user segmentation.

---

# PHASE 12 — FOOD DISCOVERY CACHING

Food Discovery is read-heavy.

Cache:

* nearby food candidates
* popular nearby food
* trending local food
* featured content
* public food posts
* public cook profiles
* public restaurant information

However:

availability and orderability must be validated against authoritative state before allowing an order.

Do not allow a stale cache to create an order for food that is no longer available.

---

# PHASE 13 — LOCATION-AWARE CACHE

Do NOT create one cache key for:

> Food Around Me

because different users are in different locations.

Use location bucketing/geohashing or the existing location strategy.

Conceptually:

```text
food:nearby:{geoBucket}
```

instead of:

```text
food:nearby
```

This allows nearby users to share cache results where appropriate.

Do not use overly precise coordinates as cache keys.

That would:

* destroy cache hit rates
* expose unnecessary location precision
* create too many keys

Use a sensible geographic bucket.

---

# PHASE 14 — PERSONALIZED FEED CACHING

If the feed eventually becomes personalized:

Do NOT create a unique expensive database query for every screen refresh.

Use a combination of:

* location bucket
* broad user preference segments
* cached candidate pools
* lightweight personalization

Avoid exploding the number of cache keys.

The cache should help the recommendation system, not make it more expensive.

---

# PHASE 15 — RESTAURANT CACHING

Cache read-heavy restaurant data:

* restaurant profile
* restaurant metadata
* public menu
* categories
* public images
* opening information where appropriate

Invalidate when:

* restaurant updates menu
* restaurant changes pricing
* restaurant changes availability
* restaurant closes
* admin modifies restaurant

Do not wait for TTL when a known write occurs.

Use event-driven invalidation.

---

# PHASE 16 — COOK CACHING

Cache public cook data:

* public profile
* public name
* profile image
* public description
* public food listings
* public food posts
* rating summary

Do NOT cache private cook information publicly.

When a cook:

* edits a listing
* changes price
* pauses food
* closes kitchen
* publishes content

invalidate the affected cache keys.

---

# PHASE 17 — FOOD LISTING CACHING

Cache:

* food name
* description
* public image
* public media
* price
* public availability metadata

But ensure that:

> Cached presentation data does not become the authoritative order price.

When the customer actually orders:

1. fetch/validate authoritative price
2. validate availability
3. validate cook status
4. validate delivery eligibility
5. create order

Never trust stale cached price data for financial settlement.

---

# PHASE 18 — MENU CACHING

Menus are an excellent cache candidate.

Cache:

* menu structure
* categories
* food items
* public descriptions
* public images

Invalidate immediately after:

* item creation
* item deletion
* price update
* availability change
* category update

Use TTL as a safety net.

---

# PHASE 19 — EXPLORE PAGE CACHING

Explore pages should be heavily cached.

Cache:

* categories
* popular food
* featured content
* trending food
* public restaurants
* public cooks
* editorial sections

Do not repeatedly hit the database for information that changes only occasionally.

---

# PHASE 20 — SEARCH CACHING

Inspect search.

Cache repeated searches where appropriate.

Use normalized keys.

Example:

```text
search:food:{normalizedQuery}:{locationBucket}:{filtersHash}
```

But do not cache every random query forever.

Use:

* short TTL
* bounded cache
* sensible eviction
* normalization

Avoid caching highly personalized/private search results globally.

---

# PHASE 21 — DELIVERY CACHING

Delivery requires special care.

Cache relatively stable information:

* delivery zones
* pricing configuration
* public rider profile information
* service availability configuration
* static delivery rules

Do NOT rely on stale cache for:

* rider availability
* current order assignment
* delivery state
* active pickup
* active trip
* payment state

Those require authoritative state.

---

# PHASE 22 — RIDER AVAILABILITY

Rider availability is highly dynamic.

If the system already uses Redis or another fast store for operational state, use it appropriately.

Do not repeatedly query the primary database every few seconds to determine:

> Is Rider X online?

Use a fast operational presence mechanism.

Presence should have a short expiry/heartbeat.

Example concept:

```text
rider:presence:{riderId}
TTL = short
```

If the heartbeat expires:

> Treat the rider as unavailable.

Do not permanently store "online" state without an expiry mechanism.

---

# PHASE 23 — DELIVERY ORDER DISCOVERY

For neighborhood delivery:

Do NOT query every rider from the database repeatedly.

Use the existing location infrastructure to efficiently identify eligible nearby riders.

Potentially cache:

* rider presence
* geographic buckets
* eligibility state

But verify final assignment atomically.

The system must prevent two riders from accepting the same order.

Caching must NEVER replace transactional locking/atomic assignment.

---

# PHASE 24 — ORDER CACHING

Order details can be cached for read performance, but the database remains authoritative.

If an order changes:

```text
CREATED
→ ACCEPTED
→ PREPARING
→ READY
→ PICKED UP
→ DELIVERING
→ DELIVERED
```

invalidate/update the relevant cache immediately.

Do not let a customer see:

> “Preparing”

for several minutes after the order is already delivered because of an aggressive TTL.

Use event-driven cache invalidation or update.

---

# PHASE 25 — WALLET / MONEY

Be extremely conservative.

Never allow a stale cache to become the authoritative balance.

The financial ledger/database remains authoritative.

For displayed balances:

* short-lived UI cache may be acceptable
* invalidate after transactions
* refetch after deposits
* refetch after withdrawals
* refetch after transfers
* refetch after payouts

Before any financial operation:

> Verify against authoritative state.

Never calculate a user's spendable balance solely from cached data.

---

# PHASE 26 — PAYMENTS

Do NOT cache payment status as authoritative.

Payment confirmation must use:

* authoritative payment provider response
* database transaction
* webhook/event where applicable

Cache only presentation data if safe.

---

# PHASE 27 — CHAT

Do not treat chat like ordinary cached page content.

Chat needs:

* authoritative message storage
* real-time delivery where supported
* pagination
* unread count
* presence where appropriate

Use caching only for things such as:

* recent conversation summaries
* conversation list
* participant metadata
* unread counters where safely synchronized

Never lose or duplicate messages because of caching.

---

# PHASE 28 — NOTIFICATIONS

Use caching carefully for:

* notification count
* notification list
* notification preferences

When a notification is marked read:

> update/invalidate cache immediately.

Do not allow the user to mark something read and then have it mysteriously return because an old cache survived.

---

# PHASE 29 — USER PROFILE CACHING

Public user data can be cached.

Private user data should be carefully scoped.

Never use a globally shared cache key for private user information.

Use user-scoped keys.

Example:

```text
user:{userId}:profile
```

Do not expose:

* passwords
* authentication secrets
* private financial data
* sensitive KYC data

through general cache mechanisms.

---

# PHASE 30 — ADMIN CACHING

Admin screens can also be slow because they often contain:

* counts
* dashboards
* analytics
* lists
* aggregates
* reports

Cache read-heavy dashboard statistics where appropriate.

Examples:

* total users
* active cooks
* active restaurants
* total orders
* delivery statistics
* revenue summaries
* moderation counts

But make the admin dashboard clearly indicate when data is approximate or recently updated if the cached statistics are not real-time.

For example:

> Updated 30 seconds ago

Do not make administrators think a cached statistic is live if it isn't.

---

# PHASE 31 — ADMIN ACTIONS

Admin WRITE actions must invalidate affected caches.

Examples:

Admin features restaurant:

```text
write
 ↓
database
 ↓
invalidate relevant cache
 ↓
feed refreshes
```

Admin removes post:

```text
remove
 ↓
database
 ↓
invalidate post cache
 ↓
invalidate affected feed cache
```

Admin changes configuration:

```text
update config
 ↓
invalidate config cache
```

Do not require administrators to manually clear the cache after every change.

---

# PHASE 32 — CACHE INVALIDATION STRATEGY

Use multiple strategies:

### TTL

Safety net.

### Explicit invalidation

Preferred after known writes.

### Event-driven invalidation

Preferred for important domain changes.

### Stale-while-revalidate

For read-heavy content where slight staleness is acceptable.

Do not rely solely on TTL for everything.

---

# PHASE 33 — CACHE TAGS / DEPENDENCIES

Where the caching infrastructure supports it, use logical tags.

Example:

```text
restaurant:123
menu:123
food:456
cook:789
post:999
location:ikeja
```

If Cook 789 updates a food item:

invalidate:

```text
food:456
cook:789
feed buckets affected by 456
```

Do not flush the entire cache.

---

# PHASE 34 — NEVER USE GLOBAL CACHE FLUSHES IN NORMAL OPERATIONS

Do NOT implement:

```text
FLUSHALL
```

as part of ordinary application behavior.

A single cook updating their menu should NOT invalidate the entire OyeWell cache.

Invalidate only affected keys/tags.

---

# PHASE 35 — CACHE STAMPEDE PROTECTION

Handle the case where:

```text
cache expires
+
10,000 users request same resource
+
all 10,000 hit database
```

This is a cache stampede.

Implement appropriate protection such as:

* request coalescing
* locks
* single-flight
* stale-while-revalidate
* jittered TTLs

Only one process should regenerate an expensive cache entry when practical.

---

# PHASE 36 — TTL JITTER

Avoid giving thousands of cache entries exactly the same expiry time.

Where appropriate, introduce small TTL variation.

Conceptually:

```text
base TTL
+
small random jitter
```

This prevents synchronized cache expiration.

Do NOT apply jitter where deterministic expiry is operationally required.

---

# PHASE 37 — NEGATIVE CACHING

For expensive queries where "nothing exists" is a common result, consider short negative caching.

Example:

```text
No food nearby
```

Instead of querying the database repeatedly every second.

Negative caches must have short TTLs so newly added food becomes visible quickly.

---

# PHASE 38 — CACHE SIZE / EVICTION

Do not allow the cache to grow without control.

Establish:

* maximum memory expectations
* eviction strategy
* TTL policies
* namespace ownership
* monitoring

Prefer caching high-value/high-frequency data.

Do not cache every random response.

---

# PHASE 39 — FRONTEND DATA CACHING

Backend caching alone is NOT sufficient.

Inspect the frontend data-fetching architecture.

If using a library such as:

* TanStack Query
* SWR
* Next.js data cache
* existing application state

use it properly.

The frontend should avoid repeatedly requesting the same data during:

* navigation
* component remount
* tab switching
* modal opening
* scrolling

Configure appropriate:

* staleTime
* cacheTime/gcTime
* refetch policies
* retry policies
* background refresh

Follow the actual library/version already used by OyeWell.

Do not blindly copy configuration from another framework.

---

# PHASE 40 — FRONTEND STALE DATA

The UI should distinguish between:

> Data that can safely be slightly stale

and:

> Data that must be refreshed.

Examples:

Safe to briefly cache:

* restaurant description
* cook bio
* food images
* category list

Refresh more aggressively:

* kitchen open/closed
* current availability
* delivery status

Always verify:

* payment
* wallet transaction
* order submission

against authoritative backend state.

---

# PHASE 41 — PREFETCHING

Use intelligent prefetching.

Examples:

When the user is viewing:

> Restaurant A

prefetch:

* restaurant menu
* likely next content

When the user is viewing a Food Post:

prefetch the next small number of feed items.

Do NOT prefetch huge amounts of data.

Do not waste bandwidth.

---

# PHASE 42 — MEDIA CACHING

Images and videos should be aggressively optimized.

Use the existing CDN/storage infrastructure.

Implement where appropriate:

* CDN
* immutable asset URLs
* compression
* responsive image sizes
* thumbnails
* video previews
* cache-control headers

Static media should not repeatedly travel from the application server.

The application server should generally return metadata/reference URLs rather than acting as a media pipe.

---

# PHASE 43 — HTTP CACHE HEADERS

Where appropriate, use correct HTTP headers:

* Cache-Control
* ETag
* Last-Modified
* Vary

Do not use public caching for private authenticated responses.

Be extremely careful with:

```text
Cache-Control: public
```

for user-specific data.

Never accidentally allow one user's private response to become a shared CDN response.

---

# PHASE 44 — AUTHENTICATED RESPONSE SAFETY

Review all caching of authenticated endpoints.

A response containing user-specific information must not accidentally become globally shared.

Pay particular attention to:

* profiles
* wallets
* orders
* dashboards
* admin
* notifications
* KYC
* private messages
* delivery assignments

---

# PHASE 45 — LOCATION PRIVACY

Do not cache highly precise user location globally.

Use appropriate:

* user-scoped cache
* geographic buckets
* coarse location
* short TTL

Never allow User A's private location response to be served to User B.

---

# PHASE 46 — ADMIN / MANAGEMENT CACHE ISOLATION

Ensure management/admin caches are isolated from public caches.

For example:

```text
public:restaurant:123
admin:restaurant:123
```

Do not accidentally serve internal administrative metadata to public users.

---

# PHASE 47 — CACHE CONSISTENCY RULE

Whenever a write changes cached data, determine:

> What cached data became stale because of this write?

Example:

Cook changes food price.

Potentially affected:

* food listing cache
* cook page cache
* food post cache
* menu cache
* local feed candidate cache

Invalidate/update the appropriate dependent entries.

Do not blindly flush everything.

---

# PHASE 48 — WRITE-THROUGH VS CACHE-ASIDE

Choose the correct pattern per resource.

Do NOT force one caching pattern everywhere.

For relatively stable resources:

> cache-aside

may be appropriate.

For operational state:

> event-driven updates

may be better.

For high-frequency ephemeral state:

> fast operational store + expiry

may be appropriate.

For financial state:

> authoritative database/ledger first.

Document why each major strategy was chosen.

---

# PHASE 49 — CACHE OBSERVABILITY

Build visibility into the caching layer.

Track:

* cache hit rate
* cache miss rate
* cache latency
* database query reduction
* cache errors
* eviction
* memory usage
* hot keys
* stampede events
* invalidation failures

At minimum, provide logs/metrics that allow developers to answer:

> “Is caching actually helping?”

Do not assume it is.

---

# PHASE 50 — CACHE FAILURE BEHAVIOR

The application must continue functioning if the cache is temporarily unavailable.

This is critical.

If Redis/cache fails:

```text
Cache unavailable
      ↓
Application continues
      ↓
Database becomes fallback
```

Do NOT make the entire website unusable because Redis is unavailable.

Log the cache failure.

Use database fallback where safe.

However, avoid allowing a cache outage to cause an uncontrolled database stampede.

Use rate limiting/backoff where appropriate.

---

# PHASE 51 — DATABASE PROTECTION

The cache layer must protect the database.

But also protect the database during:

* cache cold start
* cache restart
* deployment
* Redis failure
* mass expiration
* traffic spike

Use:

* request coalescing
* controlled fallback
* connection pooling
* query limits
* appropriate indexes
* rate limiting
* stale data where safe

---

# PHASE 52 — DEPLOYMENT SAFETY

Cache changes must be safe during deployment.

Avoid situations where:

* new application expects cache format v2
* old application expects v1
* deployment causes errors

Use versioned cache keys where appropriate.

Allow old entries to expire naturally.

---

# PHASE 53 — CACHE WARMING

Do not aggressively pre-populate the entire cache.

Where useful, warm high-value resources such as:

* popular restaurants
* popular food
* featured content
* public configuration

after deployment or based on real traffic.

Do not waste resources warming thousands of irrelevant records.

---

# PHASE 54 — RATE LIMITING

Caching is not a replacement for rate limiting.

Review endpoints that could be abused to force cache misses.

Protect:

* search
* feed
* location queries
* media
* admin
* login
* posting
* engagement

---

# PHASE 55 — USER ACTIONS

When a user performs an action, the UI should feel immediate.

Examples:

User likes food:

```text
Tap Like
 ↓
UI updates immediately
 ↓
backend records like
 ↓
relevant cache invalidated/updated
```

Use optimistic UI where safe.

If the backend rejects the action:

> Roll back the UI cleanly.

Do not make the user wait several seconds for a like to visually appear.

---

# PHASE 56 — COOK ACTIONS

When a cook:

* posts food
* edits food
* changes price
* closes kitchen
* opens kitchen
* marks sold out
* publishes a post

the UI should update immediately.

The backend then:

1. persists the authoritative change
2. invalidates affected caches
3. optionally publishes an event
4. allows affected users to see refreshed information

Do not force cooks to refresh the entire page manually.

---

# PHASE 57 — RESTAURANT ACTIONS

Same principle.

When a restaurant updates:

* menu
* price
* availability
* opening state
* food image

invalidate the affected cache.

Do not require a global cache flush.

---

# PHASE 58 — RIDER ACTIONS

For riders:

* online
* offline
* pause
* accept order
* reject order
* pickup
* delivery

must update operational state correctly.

Do not rely on long TTL caches for rider availability.

Use fast state with expiry/heartbeat where appropriate.

---

# PHASE 59 — ADMIN ACTIONS

When an admin:

* approves cook
* rejects cook
* approves restaurant
* features content
* removes content
* changes delivery pricing
* changes system configuration
* suspends a user
* pauses a rider
* changes moderation status

affected caches must be invalidated immediately.

Administrative writes should be treated as high-priority invalidation events.

---

# PHASE 60 — CONFIGURATION CACHING

System configuration is an excellent caching candidate.

Examples:

* delivery radius
* delivery fees
* supported regions
* feature flags
* content limits
* platform settings

Cache these centrally.

But:

> Administrative configuration changes must invalidate the configuration cache immediately.

Do not wait 24 hours for TTL expiry.

---

# PHASE 61 — FEATURE FLAGS

If OyeWell has feature flags:

Cache them appropriately.

But ensure:

* admin changes propagate quickly
* critical flags have short propagation windows
* private/user-specific flags are scoped correctly

---

# PHASE 62 — TEST CACHE CORRECTNESS

Create tests for:

### Cache hit

Second request should avoid database where appropriate.

### Cache miss

Database is queried.

### TTL expiration

Expired data is refreshed.

### Write invalidation

Changing data invalidates the correct key.

### Partial invalidation

Changing one restaurant does not invalidate every restaurant.

### User isolation

User A cannot receive User B's private cached data.

### Admin isolation

Public users cannot receive admin data.

### Cache failure

Application gracefully falls back.

### Stampede

Multiple simultaneous requests do not produce uncontrolled database load.

### Race condition

Concurrent updates do not leave stale cache indefinitely.

---

# PHASE 63 — LOAD TESTING

After implementation, compare:

### BEFORE

Measure:

* request count
* database queries
* response latency
* page load
* API latency

### AFTER

Measure:

* cache hit rate
* database query reduction
* API latency
* page load
* server load
* database load

The implementation should demonstrate measurable improvement.

Do not claim success simply because Redis contains data.

---

# PHASE 64 — CACHE TTL REVIEW

For every cache introduced, document:

```text
Resource
Cache key
TTL
Why this TTL
Invalidated by
Whether stale data is acceptable
Fallback behavior
Privacy scope
```

Example:

```text
Restaurant Menu
TTL: 10 minutes
Invalidated by: menu update
Stale allowed: yes for display
Authoritative order price: database
Scope: public restaurant
```

This documentation should live with the implementation.

---

# PHASE 65 — FINAL CACHE MATRIX

Create an internal cache matrix similar to:

| Resource            | Cache                  |            TTL | Invalidation        | Stale Allowed |
| ------------------- | ---------------------- | -------------: | ------------------- | ------------- |
| Home public content | Yes                    |          short | event/TTL           | Yes           |
| Food feed           | Yes                    |          short | event/TTL           | Yes           |
| Restaurant profile  | Yes                    |         medium | update              | Yes           |
| Restaurant menu     | Yes                    |         medium | menu update         | Yes           |
| Cook profile        | Yes                    |         medium | update              | Yes           |
| Food listing        | Yes                    |         medium | update              | Limited       |
| Food media          | Yes/CDN                |           long | immutable/versioned | Yes           |
| Likes               | carefully              |          short | like event          | Limited       |
| Views               | aggregated             |          short | event               | Yes           |
| Orders              | controlled             |     very short | order events        | Limited       |
| Delivery state      | operational            |     very short | event               | No            |
| Rider presence      | fast store             |        seconds | heartbeat           | No            |
| Wallet balance      | no authoritative cache |            N/A | transaction         | No            |
| Payment status      | no authoritative cache |            N/A | payment event       | No            |
| Chat messages       | specialized            |          short | realtime            | No            |
| Admin statistics    | Yes                    |          short | event/TTL           | Yes           |
| Configuration       | Yes                    |    medium/long | immediate           | Usually       |
| KYC/private data    | carefully restricted   | short/no cache | event               | No            |

This matrix is illustrative.

Determine the final values from the actual application architecture.

---

# PHASE 66 — DO NOT OVER-CACHE

This is extremely important.

The goal is NOT:

> “Make everything cached.”

The goal is:

> “Never hit the database unnecessarily.”

If data changes frequently, caching it aggressively may make the product worse.

If data is private, careless caching may create a security issue.

If data is transactional, stale data may create financial or operational problems.

Use engineering judgment.

---

# PHASE 67 — USER EXPERIENCE REQUIREMENT

The final experience should feel like:

```text
User taps
 ↓
UI responds immediately
 ↓
Cached data appears instantly where safe
 ↓
Background refresh happens quietly
 ↓
Fresh data replaces stale data
```

The user should NOT constantly see:

> Loading...

between every screen.

Avoid:

* unnecessary spinners
* blank screens
* repeated skeleton screens
* repeated API calls
* visible refreshes
* jumping layouts

Use cached data and background refresh appropriately.

---

# PHASE 68 — IMPORTANT TTL EDGE CASES

Explicitly test:

### User opens page immediately before TTL expires.

Should not cause unnecessary database traffic.

### Thousands of users hit the same resource after TTL expiry.

Must avoid cache stampede.

### Admin updates data while cache still has old data.

Old cache must be invalidated.

### Cook changes menu while customers are browsing.

Customers should receive updated information quickly.

### Rider goes offline.

Expired presence must remove them from availability.

### Redis/cache restarts.

Application must recover gracefully.

### Deployment occurs.

Old/new cache versions must not break each other.

### Cache contains corrupted/unexpected data.

Application should safely fall back.

### User changes location.

Do not continue serving the previous area's Food Around Me feed incorrectly.

### User logs out.

Private cached data must not remain available to another user on the same device/session.

### User logs into a different account.

Do not leak previous user's cached private information.

### Network reconnects after offline mode.

Synchronize appropriately without duplicating actions.

---

# PHASE 69 — PWA / MOBILE CACHE

OyeWell has mobile/PWA considerations.

Inspect the existing service worker and browser caching.

Do not create conflicts between:

* browser cache
* service worker cache
* frontend query cache
* backend cache
* CDN cache
* Redis cache

Each layer must have a clear responsibility.

Do NOT blindly cache authenticated API responses in a service worker.

Be particularly careful with:

* wallet
* orders
* chat
* delivery
* authentication
* private profiles

---

# PHASE 70 — FINAL ARCHITECTURE

The final architecture should resemble:

```text
                         USER
                           │
                           ▼
                    CDN / EDGE CACHE
                           │
                           ▼
                 FRONTEND DATA CACHE
                           │
                           ▼
                    APPLICATION API
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
              APPLICATION      CACHE SERVICE
                LOGIC          Redis/etc.
                    │             │
                    └──────┬──────┘
                           │
                           ▼
                       DATABASE
```

For real-time operational state:

```text
Rider / Delivery / Presence
            │
            ▼
      Fast operational store
            │
            ▼
       Application
            │
            ▼
         Database
```

For media:

```text
User
 ↓
CDN
 ↓
Object Storage
```

The application server should not unnecessarily act as the media delivery pipe.

---

# PHASE 71 — IMPLEMENTATION RULES

Throughout the implementation:

## DO

* inspect first
* reuse existing infrastructure
* centralize caching
* define cache keys
* define TTLs
* use invalidation
* use event-driven invalidation where appropriate
* use stale-while-revalidate where safe
* protect against stampedes
* protect private data
* measure cache performance
* test failures
* test race conditions
* optimize database queries
* optimize frontend fetching
* optimize media
* document the architecture

## DO NOT

* add random cache calls everywhere
* cache everything
* cache private data publicly
* cache wallet balances as authoritative
* cache payment status as authoritative
* cache order state aggressively
* use global cache flushes
* create duplicate cache systems
* create unnecessary new infrastructure
* hide bad database queries behind caching
* make the cache a single point of failure
* make users manually refresh
* use infinite TTLs for mutable data

---

# PHASE 72 — FINAL PRODUCTION REVIEW

After implementation, perform a complete review.

Answer:

1. How many database requests did Home previously make?
2. How many does it make now?
3. How many repeated queries were removed?
4. What is the cache hit rate?
5. Which endpoints benefit most?
6. Which endpoints intentionally bypass cache?
7. What are the TTLs?
8. What invalidates each cache?
9. What happens if Redis/cache goes down?
10. What happens if the cache is empty?
11. What happens during mass expiry?
12. Can private data leak through caching?
13. Can stale data cause financial problems?
14. Can stale data cause delivery problems?
15. Can stale data cause availability problems?
16. Does the frontend still repeatedly refetch?
17. Are images/videos being served through the appropriate CDN/cache?
18. Are admin changes reflected quickly?
19. Are cook changes reflected quickly?
20. Are rider state changes appropriately real-time?
21. Is the database significantly less burdened?
22. Does the website feel materially faster?

Fix any problems discovered during this review.

---

# FINAL INSTRUCTION

Do not simply implement a Redis wrapper and call the task complete.

This is an **application-wide performance architecture project**.

Inspect the actual OyeWell codebase.

Understand how every major part currently retrieves data.

Then introduce caching strategically.

The ultimate goal is:

> **OyeWell should feel fast because users are receiving data from the closest appropriate layer, not because the database is being hammered faster.**

Use:

* CDN/edge caching where appropriate
* frontend caching where appropriate
* server/application caching
* Redis/fast operational state where appropriate
* database optimization
* event-driven invalidation
* TTL
* stale-while-revalidate
* request coalescing
* cache stampede protection
* intelligent prefetching

while preserving correctness.

The final system should be capable of handling substantial growth without turning every page view, swipe, menu view, rider check, admin dashboard refresh, or user action into another unnecessary database request.

Most importantly:

> **Performance must never come at the cost of correctness, privacy, financial accuracy, delivery accuracy, or user trust.**
