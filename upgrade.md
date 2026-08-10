OYEWELL — NEIGHBORHOOD FOOD MARKETPLACE + MULTI-MEDIA FOOD FEED + SMART RIDER NETWORK

MASTER IMPLEMENTATION INSTRUCTIONS FOR THE IDE AI

You are working inside an EXISTING, FUNCTIONAL OyeWell production application.

The frontend, backend, database, authentication, food ordering, payments, delivery/rider infrastructure, admin functionality, and existing Hero/feed experience already exist and are currently working.

Your job is NOT to rebuild OyeWell from scratch.

Your job is to surgically extend the existing system into a broader food marketplace while preserving every existing working capability.

---

0. ABSOLUTE DEVELOPMENT DOCTRINE

Before touching code, understand and obey these rules.

Rule 1 — SURGICAL EXTENSION ONLY

Do not rewrite functioning systems simply because you would architect them differently.

Do not create duplicate:

- authentication systems
- user systems
- wallet systems
- payment systems
- order systems
- notification systems
- rider systems
- location systems
- admin systems
- media systems
- database models
- API services
- state-management systems

First inspect what already exists.

If an existing service can be extended safely, extend it.

If an existing component can support the new functionality, enhance it.

If an existing database table can safely accommodate the new concept, extend it instead of creating a parallel duplicate.

Only introduce a new service/table/component when the existing architecture genuinely cannot support the requirement.

---

Rule 2 — EXISTING OYEWELL MUST CONTINUE WORKING

After every major phase:

1. Run type checking.
2. Run linting.
3. Run existing tests.
4. Build frontend.
5. Build backend.
6. Verify database migrations.
7. Verify existing authentication.
8. Verify existing restaurant ordering.
9. Verify existing payment flow.
10. Verify existing rider functionality.

Do not move forward while introducing known regressions.

---

Rule 3 — DATABASE FIRST, BUT SAFELY

Before modifying the schema:

- inspect the current ORM/schema
- inspect relationships
- inspect existing enums
- inspect existing indexes
- inspect existing constraints
- inspect existing transaction/payment models
- inspect existing user model
- inspect existing rider model
- inspect existing restaurant/merchant model
- inspect existing order model
- inspect existing media models
- inspect existing location models

Do not duplicate existing concepts.

All schema changes must be backward compatible wherever reasonably possible.

Create proper migrations.

Do not simply modify the production database manually.

---

Rule 4 — PRESERVE EXISTING URLs AND FLOWS

Existing routes must continue working.

Do not break existing:

- /
- authentication routes
- customer dashboard
- restaurant/merchant dashboard
- existing Hero/feed
- ordering
- checkout
- payment
- order tracking
- rider section
- admin
- profile
- existing APIs

New marketplace functionality should be introduced as an attached layer.

---

PRODUCT VISION

OyeWell should evolve from a traditional food ordering platform into a:

LOCAL FOOD DISCOVERY + ORDERING NETWORK

There should now be multiple food supply sources:

1. Existing restaurants / food businesses
2. Verified OyeWell Cooks / Hosts
3. Potentially other approved food providers in the future

The customer should not need to understand the technical distinction.

They simply discover food.

---

MAJOR UX CONCEPT

The primary customer experience should behave more like TikTok's content categorization.

Instead of forcing all food into one feed, introduce distinct discovery sections.

For example:

HOME

Existing/general OyeWell experience.

FOOD AROUND ME

Hyperlocal food discovery based on the customer's actual location.

RESTAURANTS

Existing professional restaurant/merchant food.

OYEWELL COOKS

Food prepared by approved independent cooks/hosts.

FOLLOWING / PERSONALIZED

If the existing architecture supports personalization, prepare for personalized food discovery.

Do NOT blindly use these exact names if the current UI/design system suggests better terminology.

The important requirement is:

«The new Cook/Neighborhood marketplace is a separate but deeply integrated content layer.»

It must feel like part of OyeWell without contaminating or destabilizing the existing restaurant ordering experience.

---

PHASE 1 — FULL CODEBASE AUDIT

DO NOT IMPLEMENT FEATURES YET.

First perform a comprehensive audit.

Inspect:

Frontend

Find:

- application structure
- routing
- authentication pages
- auth state
- user state
- feed/Hero implementation
- image handling
- video handling
- restaurant pages
- menus
- cart
- checkout
- payment
- orders
- location
- maps
- rider UI
- admin UI
- notifications
- chat if present
- design system
- loading states
- error handling
- responsive/mobile architecture
- PWA behavior

Backend

Inspect:

- API architecture
- controllers/routes
- services
- middleware
- guards
- authentication
- authorization
- users
- restaurants
- cooks/hosts if any existing concept exists
- menus
- food items
- orders
- payments
- delivery
- riders
- location
- notifications
- messaging/chat
- media
- admin
- cron/background jobs
- websockets/realtime infrastructure

Database

Inspect:

- User
- roles
- permissions
- restaurants
- food
- menus
- orders
- payments
- transactions
- riders
- delivery
- addresses
- location
- media
- reviews
- notifications
- messaging
- admin

Output a written architecture report before coding.

The report should identify:

1. What can be reused.
2. What needs extension.
3. What needs new tables.
4. What needs new APIs.
5. What needs new frontend routes.
6. What needs new components.
7. Potential breaking points.
8. Migration strategy.
9. Existing technical debt that directly affects this project.
10. Recommended implementation order.

DO NOT make broad refactors during this phase.

---

PHASE 2 — UNIFIED AUTHENTICATION + USER ROLES

The existing authentication route should become the central OyeWell Authentication Service.

Reuse the existing auth path.

Do NOT create separate login systems for:

- customers
- cooks
- riders
- admins

They should authenticate through the same underlying authentication infrastructure.

The authenticated user's role/permissions determine what they can access.

---

Required user categories

The architecture must support at minimum:

CUSTOMER

Can:

- browse food
- order
- chat with cooks regarding orders/listings
- track orders
- rate/review
- manage profile
- manage addresses
- become a cook later if approved

COOK / HOST

Can:

- create cook profile
- submit kitchen
- submit food listings
- upload images/videos
- set prices
- define portions
- define preparation times
- define availability
- open/close kitchen
- pause listings
- manage orders
- communicate with customers
- mark orders preparing
- mark orders ready
- see earnings
- see order history
- manage menu

RIDER

Can:

- manage rider profile
- set availability
- go online/offline
- receive nearby delivery opportunities
- accept eligible delivery jobs
- navigate to pickup
- confirm pickup
- deliver
- confirm delivery
- view earnings/history

ADMIN

Can:

- approve/reject cooks
- approve/reject food listings
- manage users
- manage riders
- pause/ban riders
- pause/ban cooks
- manage marketplace
- manage content
- manage orders
- resolve disputes
- monitor delivery
- control location policies
- moderate media
- inspect audit logs

---

IMPORTANT ROLE DESIGN

Do not assume a user can only have one role.

Prefer a flexible role/permission model if the existing architecture allows it.

For example, one person may eventually be:

CUSTOMER + COOK

or

CUSTOMER + RIDER

or

CUSTOMER + COOK + RIDER

Do not create unnecessary duplicate user accounts.

The account remains one identity.

Roles are capabilities.

---

AUTHORIZATION

Authentication answers:

"Who is this?"

Authorization answers:

"What is this person allowed to do?"

Implement proper server-side authorization.

Never trust frontend role information.

A user must not be able to simply modify frontend state and gain:

- cook privileges
- rider privileges
- admin privileges
- payment privileges
- order-management privileges

All sensitive authorization must be enforced server-side.

---

PHASE 3 — COOK/HOST MARKETPLACE DATA MODEL

Create a mature model for the new food-provider ecosystem.

Use existing entities where possible.

Conceptually the system needs to support:

CookProfile

Potential fields:

- userId
- displayName
- profilePhoto
- bio
- location
- service radius
- cuisine/specialty
- verification status
- approval status
- rating
- total orders
- kitchen status
- availability
- preparation capacity
- createdAt
- updatedAt

---

KITCHEN STATUS

Support:

OPEN

CLOSED

PAUSED

SUSPENDED

PENDING_APPROVAL

ADMIN_DISABLED

A cook should be able to easily:

OPEN KITCHEN

CLOSE KITCHEN

PAUSE ORDERS

RESUME ORDERS

---

FOOD LISTING

Create/reuse an appropriate food item model supporting:

- cook/host ownership
- title
- description
- price
- currency
- portion description
- preparation time
- minimum preparation time
- maximum preparation time
- availability
- quantity/stock
- ingredients
- allergens
- cuisine/category
- images
- videos
- media ordering
- approval status
- visibility
- active/inactive
- createdAt
- updatedAt

Listings must support:

DRAFT

PENDING_REVIEW

APPROVED

REJECTED

PAUSED

SOLD_OUT

ARCHIVED

---

IMPORTANT

A cook must never be able to publicly publish an unapproved food listing if OyeWell requires approval.

The backend must enforce this.

Not merely the frontend.

---

PHASE 4 — MULTI-MEDIA FOOD POSTS

Upgrade the existing Hero/content system.

The current Hero image should evolve from a single-image experience into a multi-media post experience.

Think:

OYEWELL FOOD POST

A post can contain:

- image
- image
- video
- image
- video
- etc.

Similar to a social-media carousel.

---

MEDIA REQUIREMENTS

Each post should support multiple media items.

Each media item needs:

- type
- URL/storage reference
- thumbnail where applicable
- ordering/index
- width
- height
- duration for video where available
- metadata
- upload status

Types:

IMAGE

VIDEO

---

FEED BEHAVIOR

The Hero/content viewer should support:

- horizontal/gesture-based slide navigation
- multiple media per post
- image slides
- video slides
- autoplay video when visible
- pause video when no longer visible
- mute/unmute
- progress indicator
- slide counter
- smooth transitions
- lazy loading
- preloading of the next media item
- responsive sizing
- mobile optimization

Do not autoplay multiple videos simultaneously.

Only the currently active/visible video should play.

---

PERFORMANCE REQUIREMENT

Do NOT simply load every high-resolution image and video immediately.

Implement:

- lazy loading
- responsive media
- appropriate thumbnails
- poster images
- video compression strategy where existing infrastructure supports it
- progressive loading
- preload only what is useful
- caching

The feed should feel instant.

---

PHASE 5 — FOOD AROUND ME

This is a critical feature.

Create a location-aware discovery system.

The section should be called something appropriate such as:

FOOD AROUND ME

The goal is:

«Show the customer food that is genuinely available near their current location.»

---

LOCATION HIERARCHY

Use the best available location source.

Possible hierarchy:

1. Explicit user-selected location
2. Device/browser geolocation permission
3. Saved delivery address
4. Existing location service
5. Coarse IP-derived location as fallback

Do not treat IP geolocation as equivalent to GPS.

---

PROXIMITY GATING

The customer should primarily see food within a reasonable delivery radius.

The radius must be configurable.

For example:

Tier 1:
Very close

Tier 2:
Nearby

Tier 3:
Wider local area

Only expand outward when appropriate.

---

CRITICAL REQUIREMENT

If there are sufficient approved and available food providers nearby:

SHOW LOCAL FOOD FIRST.

Do not fill the feed with distant food simply because it is popular.

If there are no suitable nearby providers:

expand the search radius gradually.

If there are still no suitable providers:

show external/wider-area options.

Clearly distinguish wider-area results when necessary.

---

LOCATION-AWARE RANKING

Create a ranking mechanism that can consider:

- distance
- availability
- current kitchen status
- preparation time
- delivery feasibility
- rating
- popularity
- freshness
- inventory
- user preferences

But distance and actual deliverability should be heavily weighted for "Food Around Me."

---

EDGE CASES

Handle:

- user denies location permission
- location unavailable
- GPS inaccurate
- location changes
- user moves
- cook closes kitchen
- cook becomes unavailable
- food sells out
- rider unavailable
- provider outside delivery radius

Do not expose precise provider home addresses publicly.

Protect cook privacy.

---

PHASE 6 — COOK/HOST PORTAL

Create a completely new Cook/Host dashboard.

Potential route:

/cook

or

/host

Use whichever routing convention best matches the existing application.

This must be an exceptionally simple interface.

Assume the cook is NOT tech-savvy.

The design should be:

- extremely clear
- visual
- large touch targets
- minimal technical terminology
- obvious actions
- mobile-first
- fast
- friendly
- self-explanatory

---

PRIMARY COOK DASHBOARD

The cook should immediately understand:

Kitchen status

🟢 OPEN

or

🔴 CLOSED

Large toggle:

OPEN KITCHEN

CLOSE KITCHEN

---

TODAY

Show:

- Today's orders
- Orders waiting for preparation
- Currently cooking
- Ready for pickup
- Completed
- Today's earnings

---

PRIMARY ACTIONS

Large buttons:

+ ADD FOOD

MY MENU

ORDERS

KITCHEN STATUS

EARNINGS

MESSAGES

PROFILE

---

ADD FOOD FLOW

This must be incredibly easy.

Step 1:

What are you making?

Food name.

Step 2:

Show us the food

Upload:

- photos
- video

Allow multiple media.

Step 3:

How much?

Price.

Step 4:

How much food does the customer get?

Simple portion selector/text.

Step 5:

How long will it take?

Preparation time.

Step 6:

How many can you make?

Quantity/capacity.

Step 7:

Anything customers should know?

Ingredients/allergens/notes.

Step 8:

Preview

Show exactly how the listing will appear.

Then:

SUBMIT FOR APPROVAL

---

MENU MANAGEMENT

Cook can:

- edit
- pause
- delete/archive
- duplicate
- change price
- change availability
- change quantity
- change preparation time

Never permanently delete important transactional history.

Use archival/deactivation where appropriate.

---

ORDER MANAGEMENT

Each order should have a simple lifecycle:

NEW ORDER

↓

ACCEPT

↓

PREPARING

↓

READY FOR PICKUP

↓

PICKED UP

↓

DELIVERED

↓

COMPLETED

---

COOK NOTIFICATION

When an order arrives:

🔔 NEW FOOD ORDER

"Someone just ordered your Afang Soup."

Show:

- customer order
- quantity
- preparation deadline
- earnings
- pickup information

Buttons:

ACCEPT ORDER

DECLINE

If accepted:

START COOKING

Then:

FOOD IS READY

---

COOK CHAT

Create order-linked messaging.

Customer and cook can communicate about:

- availability
- preparation time
- reasonable order details
- pickup timing
- special instructions

The conversation must remain linked to the order/listing.

Do not expose unnecessary private contact information.

---

PHASE 7 — CUSTOMER FOOD DISCOVERY

Create the new marketplace section without destroying the current OyeWell experience.

The customer should be able to switch between discovery modes easily.

Potential UI:

HOME | FOOD AROUND ME | COOKS | RESTAURANTS

Use a polished segmented navigation pattern rather than overwhelming the user with many tabs.

---

COOK PROFILE

A cook's profile should feel like a mini food brand.

Show:

- profile image
- cook name
- location area (not exact home address)
- specialties
- rating
- completed orders
- verification status
- kitchen status
- estimated preparation time
- food listings
- multimedia posts

---

FOOD DETAIL

Show:

- media carousel
- food name
- price
- portion
- preparation time
- availability
- ingredients
- cook profile
- distance
- estimated delivery
- rating
- reviews

Primary CTA:

ORDER NOW

Secondary:

CHAT WITH COOK

---

PHASE 8 — ORDER STATE MACHINE

Do not create a completely separate order system if the existing order system can be extended.

Extend the existing order architecture to support different fulfillment sources.

For example:

ORDER_SOURCE:

RESTAURANT

COOK

OTHER_FUTURE_SOURCE

The existing order engine should remain the central order engine.

---

COOK ORDER LIFECYCLE

Recommended state model:

PENDING_PAYMENT

PAYMENT_CONFIRMED

AWAITING_COOK_CONFIRMATION

COOK_ACCEPTED

PREPARING

READY_FOR_PICKUP

RIDER_ASSIGNED

RIDER_AT_PICKUP

PICKED_UP

OUT_FOR_DELIVERY

DELIVERED

CUSTOMER_CONFIRMED

COMPLETED

CANCELLED

REFUNDED

DISPUTED

Do not blindly add all states if equivalent states already exist.

Map them into the existing state machine where possible.

---

PHASE 9 — PAYMENT PROTECTION / ESCROW-LIKE FLOW

The conceptual transaction should be:

CUSTOMER PAYMENT

↓

OYEWELL SECURES PAYMENT

↓

COOK ACCEPTS

↓

COOK PREPARES

↓

RIDER PICKS UP

↓

CUSTOMER RECEIVES

↓

ORDER COMPLETED

↓

COOK SETTLEMENT

Do NOT release cook earnings merely because the cook marks the order "ready."

Settlement should be tied to successful fulfillment according to the existing payment architecture and applicable business rules.

---

IMPORTANT

Do not invent a fake financial escrow mechanism if the existing payment provider/platform has a specific settlement architecture.

Inspect the existing payment system.

Implement the safest compatible transaction/ledger architecture.

Every financial transition must be:

- idempotent
- auditable
- transactional
- traceable
- protected from double settlement

---

PHASE 10 — RIDER SYSTEM OVERHAUL

Upgrade the existing /rider section.

Do not create a second rider system.

The existing rider architecture becomes the delivery network for BOTH:

- existing restaurant orders
- new Cook/Host orders

---

RIDER DISCOVERY MODEL

When an order becomes ready/eligible for delivery:

The system should identify riders near the pickup location.

Eligible riders must satisfy:

- within delivery/assignment radius
- active
- online
- not banned
- not paused
- not suspended
- not blocked
- sufficient capacity if capacity rules exist
- valid rider status
- compatible delivery mode if relevant

---

RIDER AUTO-ASSIGNMENT

The system should make eligible nearby orders visible to eligible riders.

A rider can see:

AVAILABLE DELIVERY

Pickup area

Drop-off area

Distance

Estimated route

Estimated earnings

Food/order type

Pickup deadline

---

ACCEPT DELIVERY

The first eligible rider who successfully accepts the order gets the assignment.

This must be concurrency-safe.

Example:

Rider A and Rider B see the same order.

Both attempt to accept.

Only ONE transaction succeeds.

The backend must atomically claim the delivery.

The other rider receives:

«"This delivery has already been accepted."»

Do NOT rely on frontend state for this.

---

ADMIN RIDER CONTROL

Admins need controls:

PAUSE RIDER

Temporarily prevent rider from accepting new jobs.

BAN RIDER

Prevent rider from participating.

SUSPEND RIDER

Temporary enforcement state.

RESTORE RIDER

Return to eligible status.

These checks must happen SERVER-SIDE before delivery assignment.

---

RIDER DASHBOARD

Show:

ONLINE / OFFLINE

Large obvious toggle.

Then:

AVAILABLE NEAR YOU

Delivery opportunities.

Each card:

- pickup distance
- delivery distance
- estimated earnings
- food type
- deadline
- approximate pickup location

CTA:

ACCEPT DELIVERY

---

RIDER DELIVERY FLOW

ACCEPTED

↓

NAVIGATE TO PICKUP

↓

ARRIVED AT PICKUP

↓

VERIFY ORDER

↓

PICKED UP

↓

NAVIGATE TO CUSTOMER

↓

ARRIVED

↓

DELIVERED

↓

CUSTOMER CONFIRMATION

↓

COMPLETED

---

PICKUP VERIFICATION

Use the safest existing verification mechanisms.

Potentially:

- order code
- QR code
- PIN
- pickup confirmation

Do not rely solely on a rider pressing "picked up."

---

CUSTOMER DELIVERY TRACKING

The existing customer tracking system should be reused.

For Cook orders, customer should be able to see:

COOK PREPARING

↓

FOOD READY

↓

RIDER FOUND

↓

RIDER PICKED UP

↓

RIDER ON THE WAY

↓

DELIVERED

---

PHASE 11 — REAL-TIME SYSTEM

Reuse existing websocket/realtime infrastructure if present.

Realtime events should include, where applicable:

- new order
- cook accepts order
- cook starts preparing
- food ready
- rider opportunity created
- rider accepts
- rider arrives
- pickup
- delivery
- customer confirmation
- cancellation

Avoid unnecessary polling.

If polling already exists and replacing it would be risky, improve incrementally.

---

PHASE 12 — ADMIN MARKETPLACE MANAGEMENT

Extend the existing admin dashboard.

Create sections for:

COOKS

- pending applications
- approved
- suspended
- banned
- performance

FOOD LISTINGS

- pending review
- approved
- rejected
- flagged

ORDERS

Filter by:

- restaurant
- cook
- status
- location
- rider

RIDERS

- active
- online
- paused
- suspended
- banned
- available deliveries
- active deliveries

---

COOK APPROVAL

Admin should be able to:

APPROVE

REJECT

REQUEST CHANGES

SUSPEND

RESTORE

---

FOOD MODERATION

Admin should be able to inspect:

- photos
- videos
- description
- ingredients
- pricing
- cook
- previous complaints
- ratings

---

PHASE 13 — SAFETY, TRUST AND MODERATION

This is a marketplace involving food prepared by third parties.

Do not treat this as merely a social feed.

Build the architecture so OyeWell can enforce:

- provider approval
- listing approval
- food safety requirements appropriate to the operating jurisdiction
- complaint handling
- refund/dispute handling
- provider suspension
- rider suspension
- content moderation
- audit logs

Do not make unsupported claims that every cook is "certified" unless that is actually true.

---

PHASE 14 — NOTIFICATIONS

Reuse the existing notification infrastructure.

Support:

CUSTOMER

- order received
- cook accepted
- cook declined
- preparing
- ready
- rider assigned
- rider picked up
- arriving
- delivered
- refund
- message

COOK

- new order
- customer message
- order accepted
- cancellation
- rider arriving
- pickup
- settlement

RIDER

- new delivery opportunity
- delivery accepted
- order changed
- cancellation
- admin pause/ban

---

PHASE 15 — PERFORMANCE

The new system must be designed for smooth operation.

Optimize:

- feed rendering
- media loading
- location queries
- nearby-food queries
- rider matching
- websocket events
- database indexes
- pagination
- caching
- image/video delivery
- API response size

Do not load thousands of listings at once.

Use pagination/infinite scrolling.

Use database-level geospatial querying if the existing database supports it or introduce an appropriate geospatial strategy.

Do not calculate huge geographic datasets in application memory.

---

PHASE 16 — SECURITY

Audit all new endpoints.

Ensure:

- authentication required where appropriate
- role checks
- ownership checks
- rate limits
- input validation
- upload validation
- media validation
- authorization
- payment authorization
- order authorization
- chat authorization

A cook must only be able to manage their own listings.

A rider must only manage their own deliveries.

A customer must only access their own orders/conversations.

Admin functions must be protected.

---

PHASE 17 — IDEMPOTENCY

This is extremely important for:

- payments
- order creation
- rider acceptance
- settlement
- delivery confirmation
- refunds
- notifications

Network retries must not create:

- duplicate orders
- duplicate payments
- duplicate riders
- duplicate settlements
- duplicate deliveries

Use proper idempotency keys and database constraints where appropriate.

---

PHASE 18 — UI/UX DESIGN STANDARD

The new interface must feel like an evolution of the current OyeWell design.

Do not introduce a completely unrelated visual language.

Use the existing:

- typography
- spacing
- components
- colors
- cards
- buttons
- navigation
- responsive patterns

But improve the experience where needed.

The Cook portal should be especially simple.

Avoid:

- technical terminology
- complicated tables
- excessive configuration
- hidden controls
- tiny buttons
- confusing dashboards

Prefer:

"Add Food"

rather than:

"Create Listing"

Prefer:

"Open Kitchen"

rather than:

"Set Availability Status = ACTIVE"

The backend can be sophisticated.

The user interface should not feel sophisticated.

---

PHASE 19 — RESPONSIVE DESIGN

All new functionality must work properly on:

- mobile browsers
- Android
- iOS
- desktop
- PWA where applicable

Pay particular attention to:

- media feed
- cook dashboard
- rider dashboard
- chat
- checkout
- location permissions
- camera/upload
- video playback

---

PHASE 20 — TESTING

Create or extend tests for:

AUTH

- customer
- cook
- rider
- admin
- multi-role users

COOK

- application
- approval
- listing creation
- listing approval
- kitchen open/close
- menu editing
- order acceptance
- preparation
- ready state

CUSTOMER

- discovery
- location filtering
- ordering
- payment
- chat
- tracking
- confirmation

RIDER

- online/offline
- nearby order visibility
- acceptance
- concurrent acceptance
- banned rider
- paused rider
- pickup
- delivery

PAYMENT

- success
- failure
- retry
- cancellation
- refund
- settlement
- duplicate request

MEDIA

- image upload
- video upload
- carousel
- autoplay
- pause
- multiple media
- invalid media

---

PHASE 21 — CONCURRENCY TEST

Explicitly test this scenario:

Order #123 becomes available.

Rider A accepts.

Rider B accepts milliseconds later.

Expected:

Rider A = SUCCESS

Rider B = REJECTED BECAUSE ALREADY CLAIMED

Database must never contain two active riders for the same delivery.

---

PHASE 22 — LOCATION TESTING

Test:

1. Customer near cook.
2. Customer far from cook.
3. No nearby cooks.
4. Several nearby cooks.
5. Cook outside delivery radius.
6. Customer denies location.
7. GPS unavailable.
8. Customer changes location.
9. Cook closes kitchen.
10. Cook becomes unavailable.
11. Rider unavailable.
12. Multiple riders nearby.

---

PHASE 23 — MIGRATION STRATEGY

Do not perform destructive migrations casually.

Before migration:

- backup schema
- inspect production compatibility
- create migration
- test migration locally
- test against staging
- verify existing records
- verify rollback strategy

Existing users must remain valid.

Existing orders must remain valid.

Existing restaurants must remain valid.

Existing riders must remain valid.

Existing transactions must remain valid.

---

PHASE 24 — OBSERVABILITY

Add appropriate logging around:

- cook onboarding
- listing approval
- order lifecycle
- payment state
- rider assignment
- rider acceptance
- delivery lifecycle
- settlement
- disputes
- moderation

Never log sensitive credentials or payment secrets.

Use structured logs where existing infrastructure supports them.

---

PHASE 25 — IMPLEMENTATION ORDER

Implement strictly in this order.

PHASE A

Audit existing architecture.

PHASE B

Extend authentication/user/role architecture.

PHASE C

Extend database schema.

PHASE D

Implement backend marketplace services.

PHASE E

Implement Cook/Host portal.

PHASE F

Implement customer discovery sections.

PHASE G

Upgrade Hero/feed to multi-media posts.

PHASE H

Implement location-aware "Food Around Me."

PHASE I

Extend order/payment lifecycle.

PHASE J

Upgrade rider marketplace/dispatch.

PHASE K

Implement realtime events.

PHASE L

Extend admin.

PHASE M

Testing/security/performance.

PHASE N

Production-readiness audit.

---

CRITICAL ARCHITECTURAL PRINCIPLE

The final architecture should look conceptually like this:

                OYEWELL
                   |
      +------------+-------------+
      |            |             |
   CUSTOMER      PROVIDERS      RIDERS
      |            |             |
      |       +----+----+        |
      |       |         |        |
      |   RESTAURANTS  COOKS     |
      |       |         |        |
      +-------+---------+--------+
                  |
                ORDERS
                  |
               PAYMENT
                  |
               DELIVERY
                  |
                RIDERS
                  |
              CUSTOMER

The customer experience is unified.

The supply sources are differentiated internally.

---

DO NOT CREATE TWO OYEWELLS

The existing restaurant system and new Cook marketplace must share:

- authentication
- users
- payments
- orders
- notifications
- location
- delivery
- riders
- reviews where appropriate
- admin
- analytics
- media infrastructure

The marketplace is an extension of OyeWell, not a second application.

---

FINAL UX TARGET

A customer opens OyeWell.

They see beautiful food content.

They can switch between:

HOME

FOOD AROUND ME

COOKS

RESTAURANTS

They see a beautiful food post.

They swipe through photos/video.

They like what they see.

They open it.

They see:

"Amaka's Kitchen"

"1.8 km away"

"Usually ready in 2 hours"

"⭐ 4.9"

They can:

CHAT WITH COOK

or

ORDER NOW

They pay.

OyeWell secures the transaction.

The cook receives the order.

The cook accepts.

The cook prepares it.

The cook taps:

FOOD READY

Nearby eligible riders receive the delivery opportunity.

One rider accepts.

The rider picks up the food.

The rider delivers.

The customer confirms.

The transaction completes.

The cook receives their settlement.

The customer rates the food.

The cook's reputation grows.

The rider's reputation grows.

OyeWell earns its commission.

---

FINAL DEVELOPMENT INSTRUCTION

Before modifying any file, understand how the current application accomplishes the equivalent functionality.

Do not duplicate existing services.

Do not create parallel authentication.

Do not create parallel orders.

Do not create parallel payments.

Do not create parallel riders.

Do not create parallel notification systems.

Do not replace functioning infrastructure unnecessarily.

Extend the existing architecture.

Use feature boundaries and clean abstractions so that the new marketplace can be enabled/disabled without destroying the existing restaurant experience.

Every implementation decision must prioritize:

1. Existing functionality
2. Data integrity
3. Security
4. Financial correctness
5. Performance
6. Mobile usability
7. Maintainability
8. Scalability

After each phase, report:

- Files changed
- Database changes
- APIs added/modified
- Components added/modified
- Existing systems reused
- Tests performed
- Bugs discovered
- Bugs fixed
- Remaining risks

DO NOT silently make large architectural changes.

If you discover that an existing architecture fundamentally conflicts with this design, STOP and explain the conflict before performing a destructive rewrite.

The goal is a mature, production-grade OyeWell marketplace that feels simple to customers, cooks, riders, and admins while remaining technically sophisticated underneath.