# OYEWELL — LOCATION, MAP & GEO-LOGISTICS INFRASTRUCTURE

## FOLLOW-UP IMPLEMENTATION PROMPT

You have already implemented or are implementing the OyeWell dual delivery architecture:

* Neighborhood Delivery
* Professional Delivery
* Delivery Partners
* Customer delivery selection
* Rider assignment
* KYC
* Professional upgrades
* Delivery wallet
* Delivery tracking
* Admin delivery controls

Now extend that architecture with a **centralized OyeWell Location & Geo-Logistics Layer**.

This is NOT a request to simply add Google Maps to the UI.

The goal is to create a reusable location infrastructure that powers:

1. Food Around Me
2. Local food discovery
3. Neighborhood Delivery
4. Professional Delivery
5. Rider matching
6. Delivery pricing
7. Delivery ETA
8. Pickup/drop-off routing
9. Customer delivery tracking
10. Rider navigation
11. Admin delivery monitoring
12. Future OyeWell errands
13. Future package delivery
14. Marketplace density analysis

The system should treat geographic intelligence as a reusable OyeWell platform capability.

---

# CRITICAL RULE

DO NOT create a second location system.

Before writing code, inspect the existing implementation for:

* location
* geolocation
* coordinates
* address
* delivery radius
* Food Around Me
* rider location
* maps
* distance calculation
* routing
* ETA
* location permissions
* reverse geocoding
* geospatial queries

Reuse and consolidate existing functionality wherever possible.

If an existing location system is good enough, extend it.

If it is fragmented, carefully consolidate it without breaking existing functionality.

---

# PHASE 1 — FULL LOCATION AUDIT

Before modifying anything, inspect:

## FRONTEND

Search for:

* navigator.geolocation
* latitude
* longitude
* coordinates
* location
* maps
* Google Maps
* Mapbox
* Leaflet
* geocoding
* reverse geocoding
* delivery address
* current address
* rider location
* Food Around Me
* nearby
* distance
* radius
* ETA

## BACKEND

Inspect:

* location services
* address services
* rider location tracking
* delivery assignment
* distance calculation
* pricing calculation
* Food Around Me API
* geospatial queries
* database indexes

## DATABASE

Inspect existing:

* latitude
* longitude
* address
* city
* state
* country
* postal code
* location fields
* delivery radius
* rider coordinates

Produce an audit before implementation.

Report:

1. Existing location systems
2. Existing map provider
3. Existing geocoding provider
4. Existing routing provider
5. Existing geospatial database support
6. Existing rider location tracking
7. Existing Food Around Me logic
8. Existing delivery distance calculations
9. Existing delivery pricing calculations
10. Existing location permissions

Do not rewrite anything during the audit.

---

# PHASE 2 — CREATE A CENTRAL LOCATION SERVICE

Create or extend a centralized backend Location Service.

The exact implementation should follow the current architecture.

Conceptually:

```text
OyeWell Location Service
        |
        +-- Geocoding
        +-- Reverse Geocoding
        +-- Distance
        +-- Nearby Search
        +-- Routing
        +-- ETA
        +-- Service Radius
        +-- Location Validation
```

Every major feature should use this service instead of implementing its own distance/location calculations.

---

# PHASE 3 — STANDARD LOCATION MODEL

Create a consistent internal representation of a location.

Conceptually:

```text
Location
- latitude
- longitude
- address
- city
- state
- country
- postalCode
- placeId/providerId where appropriate
- accuracy
```

Do not blindly create a new Location table if the existing database already has an appropriate structure.

First determine whether the current schema can be extended.

---

# PHASE 4 — LOCATION TYPES

The system should understand different location contexts.

Examples:

```text
CUSTOMER_LOCATION
COOK_LOCATION
RESTAURANT_LOCATION
PICKUP_LOCATION
DROPOFF_LOCATION
RIDER_LOCATION
DELIVERY_LOCATION
```

This is primarily an architectural concept.

Do not expose unnecessary private location information.

---

# PHASE 5 — CUSTOMER LOCATION

Improve the existing customer location experience.

When appropriate, ask:

### Where are you?

Options:

**Use my current location**

**Enter my address**

**Choose on map**

Do not force location permission immediately when unnecessary.

If permission is denied, the application should still function using manually entered location.

---

# PHASE 6 — LOCATION PERMISSION UX

The first experience should be simple.

Instead of:

> "We require access to your geolocation API."

Use:

### Find food near you 📍

> Allow OyeWell to use your location to show food and delivery options near you.

Buttons:

**Allow Location**

**Enter Location Manually**

Never block the entire application simply because location permission was denied.

---

# PHASE 7 — REVERSE GEOCODING

When the customer provides coordinates, use reverse geocoding to determine a human-readable location.

Example:

Coordinates:

```text
6.6018
3.3515
```

Could resolve to:

> Ikeja, Lagos

The exact provider should come from the existing infrastructure.

Do not expose raw coordinates unnecessarily to the user.

---

# PHASE 8 — SAVED LOCATIONS

Customers should eventually be able to save:

### Home

### Work

### Other

Example:

Home

> Ikeja GRA

Work

> Yaba

Allow users to edit/delete saved locations.

Do not expose saved addresses publicly.

---

# PHASE 9 — FOOD AROUND ME

This is one of the most important uses of the new location infrastructure.

Food discovery should use actual geographic distance.

When customer location is available:

```text
Customer
   |
   +---- Cook A: 0.8 km
   |
   +---- Cook B: 1.4 km
   |
   +---- Restaurant C: 2.1 km
   |
   +---- Cook D: 3.9 km
```

Prioritize local results.

---

# PHASE 10 — LOCAL-FIRST DISCOVERY

Implement the previously established rule:

### Show nearby food first.

The system should prioritize food within the customer's configured local radius.

Only expand outward when there are insufficient relevant results.

Example:

```text
Ring 1
0–2 km

Ring 2
2–5 km

Ring 3
5–10 km

Ring 4
Broader results
```

DO NOT hardcode these exact distances.

Make them configurable.

---

# PHASE 11 — "AROUND ME" MUST ACTUALLY MEAN AROUND ME

Do not simply label a generic restaurant feed:

> Food Around Me

while showing restaurants hundreds of kilometers away.

The backend must actually filter/rank geographically.

The user should see nearby results first.

---

# PHASE 12 — FALLBACK LOGIC

If there are no sufficient nearby results:

Show:

> Not much food is available very close to you.

Then expand gradually.

Example:

### Around You

first.

Then:

### Nearby

Then:

### More Options

This is better than immediately mixing distant restaurants into the local feed.

---

# PHASE 13 — DISTANCE CALCULATION

Create one centralized distance calculation method.

Use proper geographic distance calculations.

Do NOT create separate formulas across:

* Food Around Me
* delivery
* riders
* checkout
* pricing

Everything should use the same service.

---

# PHASE 14 — ROAD DISTANCE VS STRAIGHT-LINE DISTANCE

The system should distinguish:

### Geographic distance

Straight-line distance used for:

* fast nearby filtering
* initial candidate selection
* broad marketplace queries

### Route distance

Actual road distance used for:

* delivery pricing
* ETA
* rider navigation
* delivery route estimation

Do not use straight-line distance as the final delivery distance where accurate routing is available.

---

# PHASE 15 — DELIVERY ROUTING

For every active delivery, the system should understand:

```text
Pickup
   ↓
Drop-off
```

The routing service should provide:

* route distance
* estimated travel time
* route geometry if available
* navigation information

Reuse the selected map provider's routing API where possible.

Do not build a routing engine yourself.

---

# PHASE 16 — MAP PROVIDER ABSTRACTION

Do not hardwire the entire application directly to one map provider.

Create an internal abstraction.

Conceptually:

```text
MapProvider
   |
   +-- geocode()
   +-- reverseGeocode()
   +-- route()
   +-- distance()
   +-- autocomplete()
```

The application should depend on OyeWell's location service.

This gives us the ability to change providers later.

---

# PHASE 17 — MAP UI

The visible map should be contextual.

DO NOT turn the OyeWell homepage into a giant map.

The primary OyeWell experience remains:

FOOD

IMAGES

VIDEO

DISCOVERY

The map appears when it adds value.

---

# MAP SHOULD APPEAR IN:

## Customer

Delivery tracking

Address selection

Optional Food Around Me map

Pickup/dropoff preview

## Rider

Pickup navigation

Dropoff navigation

Active delivery

## Admin

Live delivery monitoring

Marketplace density

Operational analysis

---

# PHASE 18 — FOOD MAP

Create an optional map view for Food Around Me.

Customer can switch:

### LIST

or

### MAP

Do not make the map mandatory.

Map markers may represent:

* restaurants
* approved cooks

Use clustering when there are many results.

Do not expose exact private residential addresses of cooks.

For home-based cooks, show an approximate service area or safe pickup representation where appropriate.

---

# PHASE 19 — COOK LOCATION PRIVACY

This is extremely important.

A Cook may operate from a private residence.

Do not expose:

> 12 Example Street, Apartment 4

to every OyeWell user.

Instead use:

> Ikeja GRA

or an approximate map location.

Only reveal the exact operational pickup information to the delivery partner when necessary for an active order.

---

# PHASE 20 — RIDER LOCATION

When a rider is ONLINE:

The backend may maintain the rider's current operational location.

Store:

* latitude
* longitude
* timestamp
* accuracy where available

Do not store excessively frequent location updates unnecessarily.

Use a sensible update strategy.

---

# PHASE 21 — RIDER LOCATION FRESHNESS

A rider location should have a timestamp.

Example:

```text
lastLocationAt
```

Do not treat an old location as current.

For example:

If the rider's location is 45 minutes old:

DO NOT use it for active dispatch.

Mark it stale.

The exact freshness threshold should be configurable.

---

# PHASE 22 — ONLINE DOES NOT MEAN AVAILABLE

The system must distinguish:

ONLINE

from:

AVAILABLE

A rider may be:

ONLINE

but currently delivering another order.

Therefore:

```text
ONLINE
AVAILABLE
BUSY
OFFLINE
```

should be treated separately.

---

# PHASE 23 — RIDER MATCHING

When a delivery is created:

Input:

```text
deliveryType
pickupLatitude
pickupLongitude
dropoffLatitude
dropoffLongitude
```

Find eligible partners.

Filter:

* account active
* KYC approved
* delivery approval
* correct delivery capability
* professional approval where required
* not banned
* not suspended
* not paused
* online
* available
* location fresh
* appropriate delivery method
* within configured radius

---

# PHASE 24 — NEIGHBORHOOD DISPATCH

For Neighborhood Delivery:

Prioritize:

1. nearest eligible neighborhood partners
2. professional partners who opted into neighborhood jobs
3. local proximity
4. availability
5. appropriate vehicle/mode

Do not simply choose the geographically closest person.

The candidate must pass all eligibility rules.

---

# PHASE 25 — PROFESSIONAL DISPATCH

For Professional Delivery:

Only eligible Professional Delivery Partners.

Rank based on:

* proximity
* availability
* service capability
* operational status
* current workload
* reliability metrics where appropriate

---

# PHASE 26 — PROGRESSIVE SEARCH RADIUS

Implement configurable dispatch rings.

Example:

```text
Ring 1
0–1 km

Ring 2
1–3 km

Ring 3
3–5 km

Ring 4
5–10 km
```

These are examples only.

Admin should configure:

* ring distances
* acceptance timeout
* maximum search radius

---

# PHASE 27 — DO NOT BROADCAST TO EVERY RIDER

When a delivery appears:

Do not immediately send it to every rider in the city.

Instead:

1. find nearest eligible riders
2. offer job
3. wait
4. expand
5. repeat

This protects:

* rider experience
* notification volume
* system load
* assignment efficiency

---

# PHASE 28 — ROUTE-AWARE DISPATCH

Where routing is available, improve candidate ranking.

Example:

Rider A:

Straight-line:
1.0 km

Actual road route:
5.0 km

Rider B:

Straight-line:
1.4 km

Actual road route:
2.0 km

Rider B may be the better candidate.

Use route information intelligently.

Do not route every rider candidate individually if that would create excessive API cost.

Use geographic filtering first.

Use detailed routing only for the smaller candidate set.

---

# PHASE 29 — DELIVERY ETA

ETA should be calculated from:

* pickup location
* dropoff location
* route
* delivery mode
* current rider state
* preparation time where available

For food orders:

```text
Food preparation time
+
Rider arrival time
+
Pickup
+
Travel time
```

The customer should see a realistic range rather than false precision.

Example:

> Estimated arrival: 35–50 min

---

# PHASE 30 — DELIVERY PRICING

Use route distance when appropriate.

Pricing engine receives:

```text
deliveryType
distance
location
deliveryMode
```

Then calculates:

Neighborhood price

or

Professional price

Do not let frontend calculate the authoritative price.

Backend is authoritative.

---

# PHASE 31 — CUSTOMER DELIVERY MAP

After assignment:

Show:

# Your delivery is on the way

Map:

```text
Pickup 📍
    |
    |
    🛵 Rider
    |
    |
    🏠 You
```

Show:

* rider status
* estimated arrival
* delivery type
* order status

Avoid exposing unnecessary personal rider information.

---

# PHASE 32 — LIVE RIDER MOVEMENT

If existing realtime infrastructure supports it:

Update rider location while actively delivering.

Do not update continuously at extreme frequency.

Use a sensible interval/event strategy.

The map should move smoothly without generating unnecessary backend traffic.

---

# PHASE 33 — RIDER NAVIGATION

Inside rider dashboard:

### GO TO PICKUP

Show:

Pickup

Distance

ETA

### GET DIRECTIONS

This may launch the user's preferred navigation app.

Do not attempt to recreate full Google Maps navigation inside OyeWell unless there is a strong reason.

OyeWell should manage:

* delivery state
* pickup
* dropoff
* earnings
* verification

The navigation provider can handle turn-by-turn navigation.

---

# PHASE 34 — RIDER PICKUP MAP

When rider accepts:

Show:

```text
Pickup

📍 Mama Grace's Kitchen

Ikeja GRA

1.3 km

ETA: 6 min

[ GET DIRECTIONS ]

[ I'M AT PICKUP ]
```

---

# PHASE 35 — RIDER DROPOFF MAP

After pickup:

Show:

```text
Deliver To

📍 Customer

Allen Avenue

4.2 km

ETA: 15 min

[ GET DIRECTIONS ]

[ I'M AT DELIVERY ]
```

---

# PHASE 36 — ADMIN LIVE MAP

Create a delivery operations map inside admin.

Filters:

### Delivery Type

All

Neighborhood

Professional

### Status

Searching

Assigned

At Pickup

Picked Up

In Transit

Completed

### Area

Configurable geographic areas

---

# PHASE 37 — ADMIN MAP DETAILS

Clicking an active delivery should show:

Delivery ID

Delivery type

Customer

Cook/restaurant

Rider

Pickup area

Dropoff area

Distance

ETA

Status

Started time

Last rider location

Last location update

---

# PHASE 38 — ADMIN MAP PRIVACY

The admin map may display operationally necessary information.

However:

* restrict access to authorized admins
* log sensitive access where appropriate
* avoid exposing unnecessary personal information
* do not expose location histories indefinitely unless operationally necessary

---

# PHASE 39 — LOCATION-BASED ADMIN ANALYTICS

Create the foundation for:

### Demand Heatmap

Where are customers ordering?

### Supply Heatmap

Where are riders available?

### Food Supply

Where are cooks/restaurants concentrated?

### Delivery Bottlenecks

Where are deliveries taking too long?

---

# PHASE 40 — MARKETPLACE DENSITY

Eventually calculate:

```text
orders per area
riders per area
cooks per area
average delivery distance
average delivery time
```

This helps OyeWell identify:

* underserved neighborhoods
* rider shortages
* food shortages
* high-demand zones
* expansion opportunities

---

# PHASE 41 — SERVICE AREAS

Allow OyeWell to define geographic service areas.

For example:

* Lagos Island
* Ikeja
* Yaba
* Lekki

Do not hardcode these.

Create an admin-managed geographic configuration.

Each area may have:

* delivery availability
* food discovery radius
* delivery pricing
* delivery types
* rider requirements
* operating hours

---

# PHASE 42 — FUTURE ERRANDS

Do not fully implement generic errands yet.

But make the location architecture compatible with:

```text
FOOD DELIVERY

PACKAGE DELIVERY

ERRAND

SHOPPING
```

Every job fundamentally has:

```text
pickup
dropoff
distance
route
delivery partner
delivery type
price
payout
status
```

---

# PHASE 43 — LOCATION ERROR HANDLING

Handle:

GPS unavailable

Permission denied

Poor accuracy

Location timeout

Invalid coordinates

Address not found

Map provider failure

Routing failure

API timeout

Network unavailable

Do not show technical error messages.

Instead:

> We couldn't find your location.

or:

> We couldn't calculate the route right now.

Provide a fallback where possible.

---

# PHASE 44 — LOCATION ACCURACY

Store accuracy when available.

Do not treat every coordinate as equally reliable.

If GPS accuracy is poor:

* ask user to confirm location
* allow map pin adjustment
* allow manual address entry

---

# PHASE 45 — MAP PIN ADJUSTMENT

For address selection:

Allow the customer to:

1. search address
2. see map
3. move pin
4. confirm location

This is especially useful in areas where addresses are imperfect.

---

# PHASE 46 — NIGERIA-SPECIFIC LOCATION REALITY

Design for imperfect addressing.

Do not assume:

> Every Nigerian location has a perfect street address.

Support:

* landmarks
* nearby locations
* area names
* estate names
* building descriptions
* delivery instructions

Example:

> "After the filling station, enter the second gate. Blue building beside the pharmacy."

Allow appropriate delivery instructions.

---

# PHASE 47 — CUSTOMER DELIVERY INSTRUCTIONS

Add:

### Delivery Instructions

Optional.

Example:

> "Call me when you reach the gate."

or:

> "Ask security for OyeWell delivery."

Keep this separate from the official address.

---

# PHASE 48 — LOCATION SECURITY

Never trust coordinates submitted by the client blindly.

Validate:

* latitude range
* longitude range
* reasonable movement
* timestamp
* authenticated user
* delivery context

Do not allow clients to arbitrarily submit another rider's location.

---

# PHASE 49 — ANTI-SPOOFING FOUNDATION

You do not need an overly aggressive anti-spoofing system initially.

But create signals for suspicious behavior.

Potential signals:

* impossible movement
* location jumps
* unrealistic speed
* stale location
* repeated GPS mismatch
* delivery completion far from destination

Use these as risk signals.

Do not automatically punish legitimate users because GPS can be imperfect.

---

# PHASE 50 — API COST CONTROL

This is extremely important.

Do not call external map/routing APIs unnecessarily.

Use a layered approach:

### Layer 1

Database geospatial filtering.

Cheap.

### Layer 2

Approximate distance.

Cheap.

### Layer 3

Routing API.

More expensive.

Only call routing for candidates/operations that actually require it.

Cache route results when safe.

---

# PHASE 51 — CACHING

Cache appropriate:

* geocoding results
* route calculations
* common area coordinates
* service area configuration

Do not cache sensitive live rider locations inappropriately.

Live operational data should remain appropriately fresh.

---

# PHASE 52 — DATABASE INDEXING

Inspect the database and implement appropriate geospatial/indexing strategy.

Do not blindly add indexes.

Verify the database technology.

Use the database's native geospatial capabilities where available.

Test query performance.

The key queries must be efficient:

```text
find food near customer

find riders near pickup

find service area

find nearby delivery partners
```

---

# PHASE 53 — FRONTEND MAP PERFORMANCE

Maps must not make OyeWell slow.

Use:

* lazy loading
* dynamic imports where appropriate
* marker clustering
* limited marker count
* debounced searches
* viewport-based loading
* route simplification where appropriate

Do not load a full map engine on every page if the user never needs a map.

---

# PHASE 54 — MOBILE/PWA

Because OyeWell may be used on mobile:

Test:

* iOS
* Android
* mobile browser
* PWA

Check:

* location permission
* background/foreground behavior
* map rendering
* GPS updates
* network interruptions
* app switching to navigation
* return from navigation

Do not assume desktop browser behavior will match mobile.

---

# PHASE 55 — DESIGN

The map UI must match OyeWell.

Do not make it look like an unrelated Google Maps clone.

Use OyeWell's:

* typography
* spacing
* cards
* buttons
* badges
* colors
* rounded corners
* transitions

The map should feel embedded into OyeWell.

---

# PHASE 56 — DO NOT OVERUSE MAPS

The final UX principle:

### Food discovery

Map optional.

### Home feed

No map required.

### Checkout

Small location/delivery context.

### Active delivery

Map strongly recommended.

### Rider pickup

Map strongly recommended.

### Rider dropoff

Map strongly recommended.

### Admin

Map strongly recommended.

This preserves OyeWell's visual food-first identity.

---

# PHASE 57 — TESTING

Create tests for:

## Location

* location permission
* manual location
* reverse geocoding
* invalid coordinates
* stale coordinates

## Food

* nearby filtering
* radius expansion
* local-first ranking

## Delivery

* rider proximity
* neighborhood eligibility
* professional eligibility
* progressive dispatch
* route distance
* ETA

## Rider

* location updates
* stale rider
* busy rider
* offline rider

## Customer

* address
* map selection
* delivery tracking

## Admin

* live delivery map
* filters
* location access

---

# PHASE 58 — CONCURRENCY TESTING

Test:

Two riders accept simultaneously.

Test:

Rider location changes while accepting.

Test:

Rider goes offline while being offered a delivery.

Test:

Rider becomes paused while a delivery offer exists.

Test:

Delivery is cancelled while routing is active.

Test:

Customer changes delivery type while dispatch is active.

All of these must resolve safely.

---

# PHASE 59 — REGRESSION TESTING

Verify that adding the location infrastructure does NOT break:

* login
* registration
* food feed
* Hero
* food discovery
* ordering
* payments
* cooks
* restaurants
* rider system
* wallet
* admin
* notifications

Run the complete existing test suite.

---

# PHASE 60 — FINAL ARCHITECTURE

The final architecture should conceptually become:

```text
                         OYEWELL
                            |
                    LOCATION SERVICE
                            |
        +-------------------+-------------------+
        |                   |                   |
     DISCOVERY           DELIVERY            ADMIN
        |                   |                   |
        |                   |                   |
   Food Around Me      Dispatch Engine      Live Map
        |                   |
        |          +--------+--------+
        |          |                 |
        |     Neighborhood       Professional
        |          |                 |
        |          +--------+--------+
        |                   |
        +-------------------+
                            |
                    GEO-LOGISTICS
                            |
             +--------------+--------------+
             |              |              |
          Distance        Routing          ETA
             |              |              |
             +--------------+--------------+
                            |
                       Rider Location
```

---

# PHASE 61 — IMPLEMENTATION ORDER

Do NOT implement this all at once.

Implement in this order:

## PHASE A

Audit existing location/map infrastructure.

## PHASE B

Centralize location services.

## PHASE C

Database/geospatial optimization.

## PHASE D

Customer location and Food Around Me.

## PHASE E

Rider location.

## PHASE F

Neighborhood dispatch.

## PHASE G

Professional dispatch.

## PHASE H

Routing and ETA.

## PHASE I

Customer delivery tracking map.

## PHASE J

Rider pickup/dropoff maps.

## PHASE K

Admin live delivery map.

## PHASE L

Marketplace geographic analytics.

## PHASE M

Performance/security/cost optimization.

## PHASE N

Full regression testing.

---

# PHASE 62 — REPORTING REQUIREMENT

After each implementation phase, report:

### IMPLEMENTED

Exactly what changed.

### FRONTEND FILES

List exact files.

### BACKEND FILES

List exact files.

### DATABASE

List schema/migration/index changes.

### APIs

List new/modified endpoints.

### MAP PROVIDER

Explain what provider functionality was used.

### REUSED SYSTEMS

Explain what existing OyeWell infrastructure was reused.

### TESTS

List tests run.

### PERFORMANCE

Explain any performance considerations.

### SECURITY

Explain location/privacy protections.

### REGRESSIONS

Confirm what existing features were tested.

### NEXT PHASE

State exactly what should happen next.

---

# FINAL INSTRUCTION

The purpose of this implementation is NOT:

"Add a map to OyeWell."

The purpose is:

# MAKE LOCATION A CORE OYEWELL PLATFORM SERVICE.

OyeWell should understand:

WHERE THE CUSTOMER IS

WHERE THE FOOD IS

WHERE THE COOK IS

WHERE THE PICKUP IS

WHERE THE DROPOFF IS

WHERE THE RIDERS ARE

WHICH RIDERS ARE ELIGIBLE

HOW FAR THEY ARE

HOW LONG THE ROUTE TAKES

WHICH DELIVERY TYPE IS REQUIRED

AND WHICH DELIVERY PARTNER SHOULD HANDLE IT.

The visible map is only the UI representation of this intelligence.

The underlying geospatial infrastructure must be reusable, secure, fast, cost-efficient and scalable.

Most importantly:

**DO NOT REBUILD EXISTING OYEWELL SYSTEMS.**

**SURGICALLY EXTEND THEM.**

**REUSE EXISTING AUTH, USERS, ORDERS, PAYMENTS, WALLET, DELIVERY, RIDER, ADMIN, NOTIFICATION AND FOOD DISCOVERY SYSTEMS.**

**DO NOT CREATE DUPLICATE SERVICES OR DATABASE TABLES WHERE AN EXISTING SYSTEM CAN BE EXTENDED.**

**AUDIT FIRST. IMPLEMENT SECOND. TEST AFTER EVERY PHASE.**
