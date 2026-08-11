# MASTER IMPLEMENTATION PROMPT — OMK FOOD MARKETPLACE

## End-to-End Order Orchestration, Payment Gateway Integration, Vendor Workflow, Rider Dispatch, Pickup/Delivery Verification & Real-Time State Synchronization

You are working on an existing production-oriented food marketplace application.

The application already contains substantial implementations for:

* Customers
* Cooks / food vendors
* Restaurants
* Riders / delivery agents
* Admin
* Orders
* Payments
* Manual payment/proof-of-payment
* Wallet/deposit systems
* Order status
* Delivery status
* Rider dashboards
* Open delivery marketplace
* Delivery codes
* Pickup/delivery verification
* Notifications
* Real-time communication
* Database persistence
* Potential Redis infrastructure
* Potential WebSocket/SSE infrastructure
* Payment gateway integrations or partially implemented integrations

The problem is NOT that these systems need to be rebuilt.

The problem is that many existing systems appear to be **scattered, partially connected, duplicated, admin-dependent, or not consistently synchronized**.

Your job is to turn the existing implementation into one coherent, reliable, event-driven order lifecycle.

---

# ABSOLUTE RULES

## RULE 1 — DO NOT REBUILD WHAT ALREADY EXISTS

Before modifying anything, inspect the repository deeply.

Search for and identify all existing implementations related to:

* Orders
* Order state
* Order status
* Payment status
* Payment proof
* Manual payment confirmation
* Paystack
* Flutterwave
* Stripe
* Vendors
* Cooks
* Restaurants
* Riders
* Deliveries
* Delivery status
* Pickup
* Delivery confirmation
* Delivery codes
* Verification codes
* OTP
* Notifications
* WebSockets
* Socket.IO
* SSE
* Redis
* Pub/Sub
* Event emitters
* Background workers
* Queues
* Cron jobs
* Transactions
* Wallet
* Escrow
* Payouts
* Commissions
* Admin order controls
* Rider open-delivery feeds
* Customer order tracking

Inspect:

* frontend
* backend
* API routes
* services
* controllers
* gateways
* database schema
* Prisma/ORM models
* migrations
* hooks
* stores
* state managers
* notification systems
* WebSocket infrastructure
* Redis infrastructure
* environment configuration
* existing tests

Do not assume something is missing simply because it is difficult to find.

---

# RULE 2 — SURGICAL CHANGES ONLY

The existing system must be preserved wherever possible.

Do NOT:

* rewrite the application
* replace the database architecture
* create duplicate order systems
* create duplicate payment systems
* create duplicate delivery systems
* create duplicate code-generation systems
* create duplicate notification systems
* create parallel status fields unnecessarily
* remove working functionality
* change unrelated UI
* change unrelated business logic
* rename database fields without necessity
* introduce a new framework simply because it is easier
* replace existing Redis/WebSocket infrastructure without proving that it is necessary

If an existing implementation can be repaired or connected, repair/connect it.

---

# RULE 3 — INVESTIGATE BEFORE CODING

Do not immediately start changing files.

First construct an architecture map.

Determine:

1. What creates an order?
2. What is the authoritative Order model?
3. What is the authoritative Payment model?
4. What is the authoritative Delivery model?
5. What represents the vendor/cook?
6. What represents the rider?
7. What represents payment confirmation?
8. What represents vendor acceptance?
9. What represents food preparation?
10. What represents food readiness?
11. What represents delivery availability?
12. What represents rider acceptance?
13. What represents pickup?
14. What represents trip start?
15. What represents delivery arrival?
16. What represents customer confirmation?
17. What represents final delivery?
18. Where is the delivery verification code generated?
19. Where is the pickup verification code generated?
20. How are codes stored?
21. How are codes validated?
22. How are notifications triggered?
23. How are real-time updates broadcast?
24. What currently depends on Admin?
25. Which Admin dependencies are intentional?
26. Which Admin dependencies are accidental?
27. Which states are database-authoritative?
28. Which states exist only in frontend state?
29. Which states are duplicated?
30. Which operations can currently be performed twice?

Produce this map before making substantial changes.

---

# TARGET ARCHITECTURE

The desired system should behave as an automated state machine.

Admin should NOT be the orchestrator of the order.

Admin should primarily be:

* payment reviewer for manual payments
* exception handler
* dispute handler
* fraud/risk reviewer
* operational override
* monitoring interface

The normal successful order lifecycle should operate automatically.

---

# TARGET ORDER LIFECYCLE

The normal lifecycle should approximately be:

CUSTOMER CREATES ORDER
↓
ORDER CREATED
↓
PAYMENT REQUIRED
↓
CUSTOMER SUBMITS PAYMENT
↓
PAYMENT CONFIRMED

For manual payment:

CUSTOMER SUBMITS PROOF
↓
ADMIN REVIEWS
↓
ADMIN APPROVES PAYMENT
↓
PAYMENT CONFIRMED

For automated gateways:

CUSTOMER PAYS
↓
GATEWAY CALLBACK/WEBHOOK
↓
SERVER VERIFIES PAYMENT
↓
PAYMENT CONFIRMED

Then:

PAYMENT CONFIRMED
↓
VENDOR NOTIFIED
↓
VENDOR ACCEPTS ORDER
↓
ORDER ACCEPTED
↓
DELIVERY/PICKUP WORKFLOW CREATED/ACTIVATED
↓
DELIVERY/PICKUP CODE GENERATED IF REQUIRED
↓
VENDOR PREPARES FOOD
↓
FOOD READY
↓
DELIVERY BECOMES AVAILABLE TO RIDERS
↓
REAL-TIME BROADCAST
↓
RIDERS SEE OPEN DELIVERY
↓
RIDER ACCEPTS DELIVERY
↓
DELIVERY ASSIGNED
↓
VENDOR + CUSTOMER + RIDER UPDATED
↓
RIDER GOES TO PICKUP
↓
RIDER ARRIVES
↓
COOK PROVIDES PICKUP VERIFICATION CODE
↓
RIDER ENTERS CODE
↓
SERVER VALIDATES CODE
↓
PICKUP CONFIRMED
↓
RIDER RECEIVES PACKAGE
↓
RIDER STARTS TRIP
↓
TRIP IN PROGRESS
↓
RIDER ARRIVES AT CUSTOMER
↓
CUSTOMER PROVIDES DELIVERY VERIFICATION CODE
↓
RIDER ENTERS CODE
↓
SERVER VALIDATES CODE
↓
DELIVERY CONFIRMED
↓
ORDER COMPLETED
↓
FINANCIAL SETTLEMENT / COMMISSION / PAYOUT PROCESSING
↓
ALL PARTIES RECEIVE FINAL STATUS

Every transition must be authoritative and persisted server-side.

---

# PHASE 1 — FULL SYSTEM AUDIT

DO NOT MODIFY CODE YET.

Perform a repository-wide audit.

Create a report containing:

## A. Order architecture

Identify:

* Order model
* Order creation
* Order status enum
* Order status transitions
* Order APIs
* Order services
* Order frontend state
* Vendor order views
* Customer order views
* Admin order views

## B. Payment architecture

Identify:

* Payment model
* Payment status
* Manual payment flow
* Proof upload
* Proof approval
* Payment confirmation
* Payment gateway implementations
* webhook endpoints
* verification endpoints
* transaction records
* wallet interaction

## C. Delivery architecture

Identify:

* Delivery model
* Rider assignment
* open deliveries
* rider acceptance
* pickup
* trip start
* delivery
* completion

## D. Code architecture

Find every implementation related to:

* order codes
* delivery codes
* pickup codes
* OTP
* verification
* code generation
* code validation

There must ultimately be one authoritative mechanism.

## E. Real-time architecture

Determine whether the project currently uses:

* Redis Pub/Sub
* Redis Streams
* Socket.IO
* WebSockets
* SSE
* polling
* React Query refetching
* Firebase
* another event mechanism

Determine what is already working.

DO NOT add Redis simply because Redis is available.

If Redis + WebSockets already exist, connect them properly.

If another existing event infrastructure is better, use it.

---

# PHASE 2 — DEFINE THE AUTHORITATIVE STATE MACHINE

After the audit, define the existing state fields and determine whether they can represent the complete lifecycle.

Do not create multiple competing status fields unless genuinely necessary.

Prefer explicit state machines.

For example:

## ORDER STATE

Possible states may include:

* PENDING_PAYMENT
* PAYMENT_REVIEW
* PAYMENT_CONFIRMED
* AWAITING_VENDOR
* ACCEPTED
* PREPARING
* READY_FOR_PICKUP
* RIDER_ASSIGNED
* PICKUP_IN_PROGRESS
* PICKED_UP
* IN_TRANSIT
* ARRIVED
* DELIVERED
* COMPLETED
* CANCELLED
* FAILED

Use the project's existing terminology if equivalent fields already exist.

DO NOT blindly introduce these exact enum values.

Map the existing architecture first.

---

# PAYMENT STATE

Payment state should be separate from order state.

Possible states:

* PENDING
* PROOF_SUBMITTED
* UNDER_REVIEW
* CONFIRMED
* FAILED
* EXPIRED
* REFUNDED
* CANCELLED

Again, use existing architecture where possible.

---

# DELIVERY STATE

Delivery should have its own authoritative lifecycle.

Possible states:

* PENDING
* OPEN
* ASSIGNED
* RIDER_EN_ROUTE_TO_PICKUP
* ARRIVED_AT_PICKUP
* PICKUP_VERIFIED
* PICKED_UP
* IN_TRANSIT
* ARRIVED_AT_CUSTOMER
* DELIVERY_VERIFIED
* DELIVERED
* CANCELLED

Do not allow frontend-only state to imply a delivery has progressed.

---

# PHASE 3 — CREATE A CENTRAL TRANSITION MECHANISM

This is extremely important.

Find whether the existing system already has a central order transition/service mechanism.

If one exists, improve it.

If not, create the smallest appropriate authoritative transition layer.

The system should not allow random controllers/services to directly mutate order statuses without validation.

Conceptually:

transitionOrder(orderId, targetState, actor, metadata)

The transition service should:

1. Load current state
2. Validate transition
3. Validate actor permissions
4. Validate prerequisites
5. Execute database transaction
6. Persist new state
7. Record transition/event
8. Trigger side effects
9. Broadcast real-time update
10. Trigger notifications
11. Return authoritative state

---

# IMPORTANT: DATABASE FIRST

The database must be the source of truth.

Frontend state should reflect server state.

Never allow:

Frontend:
"order is ready"

without the backend actually persisting:

order = READY_FOR_PICKUP

The correct flow is:

Vendor clicks "Food Ready"
↓
API request
↓
Backend validates
↓
Database transaction
↓
Order status changes
↓
Delivery becomes OPEN
↓
Event emitted
↓
Rider broadcast
↓
Customer update
↓
Vendor update
↓
Notifications

---

# PHASE 4 — REMOVE UNNECESSARY ADMIN DEPENDENCY

Admin should NOT need to manually push an order through normal operational states.

Once manual payment is approved:

Admin approves payment
↓
backend automatically transitions order
↓
vendor receives order
↓
vendor accepts
↓
preparation
↓
ready
↓
delivery opens
↓
rider accepts
↓
pickup
↓
delivery
↓
completion

Admin does not manually move these stages.

Admin may retain an override interface.

However:

ADMIN OVERRIDE ≠ NORMAL WORKFLOW.

Any admin override should:

* validate authorization
* record actor
* record reason
* create audit event
* preserve history
* broadcast the resulting state
* never silently mutate state

---

# PHASE 5 — MANUAL PAYMENT FLOW

This must remain supported.

The early-stage manual payment flow is intentionally Admin-dependent.

The desired flow:

CUSTOMER
↓
places order
↓
payment required
↓
customer makes manual payment
↓
customer uploads proof
↓
backend records proof submission
↓
payment = UNDER_REVIEW
↓
admin reviews
↓
admin approves
↓
payment = CONFIRMED
↓
order automatically advances
↓
vendor automatically notified

Admin approval should NOT require Admin to manually update the order separately.

One authoritative payment confirmation event should trigger the downstream workflow.

For example:

PaymentConfirmed

should automatically cause:

* payment state update
* order state update
* vendor notification
* delivery preparation
* real-time broadcasts
* code generation where appropriate

Avoid duplicated logic where different controllers each manually perform these operations.

---

# PHASE 6 — PAYMENT GATEWAYS

Perform a complete audit and proper implementation of:

1. Paystack
2. Flutterwave
3. Stripe

Do not assume any existing integration is correct.

Inspect the current implementation first.

The final system should support a clean payment-provider abstraction.

Conceptually:

PaymentProvider

with implementations such as:

PaystackProvider
FlutterwaveProvider
StripeProvider
ManualPaymentProvider

Do NOT necessarily create these exact classes if the project already has a suitable architecture.

The goal is provider independence.

---

# PAYMENT SECURITY REQUIREMENTS

NEVER trust:

* frontend payment success
* frontend amount
* frontend transaction status
* frontend callback parameters
* frontend currency
* frontend order totals

The backend must independently verify payments.

---

# PAYSTACK

Audit the existing Paystack integration.

Ensure:

* transaction initialization occurs server-side
* correct amount is calculated server-side
* correct currency is used
* customer identity is linked
* order/payment reference is unique
* callback is handled safely
* webhook is supported where appropriate
* webhook signatures are verified
* transaction is independently verified
* duplicate callbacks are idempotent
* amount mismatch is rejected
* currency mismatch is rejected
* already-confirmed payment cannot be credited twice
* payment records are persisted
* order state changes only after authoritative confirmation

Do not expose secret keys to frontend.

Use environment variables.

Inspect Paystack's current API/webhook requirements and implement according to current official documentation rather than relying on memory.

---

# FLUTTERWAVE

Perform the same level of implementation for Flutterwave.

Ensure:

* server-side initialization
* server-side amount calculation
* unique payment reference
* callback handling
* webhook handling
* signature/security verification
* transaction verification
* amount validation
* currency validation
* duplicate protection
* idempotency
* payment persistence
* order transition after confirmation

Do not trust frontend redirect success as authoritative.

Use the provider's server-side verification mechanisms.

---

# STRIPE

Implement Stripe correctly for the architecture.

Determine whether the current project should use:

* Payment Intents
* Checkout Sessions
* another appropriate Stripe flow

Choose based on the existing application architecture.

Do not blindly introduce multiple competing Stripe flows.

Ensure:

* payment intent/session is created server-side
* amount is calculated server-side
* currency is validated
* metadata includes internal order/payment identifiers
* Stripe webhook is authoritative
* webhook signature is verified
* duplicate events are idempotent
* payment state is persisted
* order state transitions occur only after valid payment confirmation

Stripe webhook processing should be resilient to:

* retries
* duplicate events
* out-of-order events
* temporary failures

---

# PAYMENT IDEMPOTENCY

This is mandatory.

A payment confirmation event must be safe to process multiple times.

Example:

Webhook arrives
↓
payment confirmed

Same webhook arrives again
↓
NO duplicate balance credit
NO duplicate order transition
NO duplicate notification
NO duplicate delivery
NO duplicate financial record

Use unique provider transaction IDs/references and database constraints where appropriate.

---

# PHASE 7 — PAYMENT CONFIRMATION → VENDOR

Once payment is confirmed:

DO NOT require Admin.

Automatically:

1. persist payment confirmation
2. transition order
3. notify vendor
4. update vendor order dashboard
5. update customer order tracking
6. create/activate necessary delivery record
7. generate required codes at the correct lifecycle stage
8. broadcast real-time event

---

# PHASE 8 — VENDOR ACCEPTANCE

When the cook/vendor accepts the order:

The backend must automatically:

* persist acceptance
* transition order
* notify customer
* update vendor UI
* update delivery state
* generate required verification code(s) if the business rules say they should be generated at acceptance
* broadcast the state transition

The vendor should NOT need Admin.

---

# PHASE 9 — FOOD PREPARATION

When vendor starts preparing:

persist:

PREPARING

When vendor marks food ready:

persist:

READY_FOR_PICKUP

Then automatically trigger the delivery opening workflow.

---

# PHASE 10 — READY FOR PICKUP → RIDER DISPATCH

This is one of the most important requirements.

When vendor clicks:

"Food Ready"

or equivalent:

DO NOT wait for Admin.

Backend should:

1. validate vendor authorization
2. validate order state
3. ensure payment is confirmed
4. ensure vendor accepted order
5. ensure delivery exists
6. ensure delivery isn't already assigned
7. transition order
8. transition delivery to OPEN
9. persist timestamps
10. emit DeliveryOpened event
11. publish real-time event
12. notify eligible riders
13. update rider open-delivery feed
14. notify customer that food is ready / rider search has started

---

# REAL-TIME DELIVERY BROADCAST

Use the existing real-time infrastructure if available.

Preferred architecture:

Database transaction
↓
Domain event
↓
Redis / existing event bus
↓
WebSocket/SSE layer
↓
Rider clients

If Redis is already used:

Use it intelligently.

Possible structure:

delivery:open
delivery:assigned
delivery:pickup
delivery:picked_up
delivery:in_transit
delivery:arrived
delivery:completed

Do not broadcast enormous payloads unnecessarily.

Prefer:

event type
delivery ID
order ID
relevant identifiers
minimal state
timestamp
version

Clients can fetch authoritative details when necessary.

---

# IMPORTANT REAL-TIME RULE

WebSocket/Redis is NOT the source of truth.

Database = source of truth.

Real-time event = notification that state changed.

If a rider misses an event because they were offline:

When the rider reconnects:

1. authenticate
2. fetch current open deliveries
3. synchronize current state

Do NOT depend on the client receiving every event.

---

# PHASE 11 — RIDER OPEN DELIVERY MARKETPLACE

When delivery becomes OPEN:

eligible riders should automatically see it.

Determine rider eligibility based on the application's existing rules.

Possible criteria:

* active rider
* approved rider
* online/available
* service region
* location
* delivery zone
* capacity
* vehicle requirements
* other existing rules

Do not invent new eligibility rules unless necessary.

---

# RIDER ACCEPTANCE

When a rider clicks Accept:

Backend must perform an atomic operation.

Conceptually:

IF delivery.status = OPEN
AND rider is eligible

THEN:

assign rider
change status to ASSIGNED

ELSE:

reject request

This must be concurrency-safe.

Two riders may attempt to accept the same delivery simultaneously.

Only ONE should win.

The loser should receive a clean "delivery no longer available" response.

Do NOT rely on frontend disabling the button.

Use database-level transaction/locking/conditional update appropriate to the current database.

---

# AFTER RIDER ACCEPTANCE

Automatically:

* assign rider
* persist assignment
* timestamp assignment
* remove delivery from other riders' open feeds
* notify vendor
* notify customer
* notify assigned rider
* update order
* update delivery
* broadcast changes

No Admin intervention.

---

# PHASE 12 — RIDER PICKUP VERIFICATION

Create/repair the existing verification-code system.

There must be a separate proof gate between:

VENDOR
and
RIDER

The purpose is to establish that the food was actually handed over.

The desired flow:

Rider accepts delivery
↓
Rider travels to vendor
↓
Rider arrives
↓
Vendor has pickup verification code
↓
Vendor gives code to rider
↓
Rider enters code
↓
Backend validates
↓
Pickup confirmed
↓
Delivery transitions to PICKED_UP
↓
Order transitions appropriately
↓
Timestamp recorded
↓
Audit event recorded
↓
Vendor notified
↓
Customer notified
↓
Rider can proceed

The rider must NOT be able to mark:

PICKED_UP

simply by pressing a button.

The code should be the verification gate.

---

# PICKUP CODE SECURITY

Do not expose the raw code unnecessarily through APIs.

Store securely.

If the current architecture allows secure hashing, use it.

Code must be:

* unpredictable
* unique per delivery/order lifecycle
* short enough for practical use
* rate limited
* protected against brute force
* invalidated after successful use
* invalidated when delivery is cancelled/reassigned if appropriate

Record:

* generatedAt
* verifiedAt
* verifiedBy
* attempt count
* last attempt timestamp
* delivery/order ID

Do not allow unlimited guesses.

---

# PHASE 13 — RIDER STARTS TRIP

After pickup verification succeeds:

Rider can start trip.

When rider clicks:

START TRIP

backend validates:

* rider owns assignment
* pickup verified
* delivery is in correct state
* delivery is not cancelled
* rider is authorized

Then:

delivery = IN_TRANSIT

persist timestamp.

Broadcast:

* customer
* vendor
* rider

Customer should see:

"Your order is on the way"

without Admin intervention.

---

# PHASE 14 — DELIVERY VERIFICATION

The existing customer delivery-code mechanism should be found and repaired rather than duplicated.

The desired lifecycle:

Rider arrives
↓
Customer provides delivery verification code
↓
Rider enters code
↓
Backend validates
↓
Delivery confirmed
↓
Order completed

The code must be tied to that specific delivery/order.

The rider should NOT be able to manually mark an order delivered without successful verification unless an explicitly authorized exception flow exists.

---

# DELIVERY CODE

When the code is generated, determine the correct existing business trigger.

The user's required trigger is:

Payment confirmed
+
Vendor accepts order

At that point, if the existing architecture intends the delivery code to be generated, connect the existing generator into that event.

DO NOT create another code-generation service if one already exists.

Find the existing implementation and connect it to the correct lifecycle event.

Ensure:

* code is generated exactly once
* code is persistent
* code is associated with order/delivery
* customer can see it at the appropriate time
* rider can verify it
* code cannot be reused after successful delivery
* code attempts are rate limited

---

# PHASE 15 — ORDER COMPLETION

After valid delivery verification:

Backend transaction should:

1. verify rider assignment
2. verify delivery state
3. verify code
4. mark delivery delivered
5. mark order delivered/completed according to existing architecture
6. record timestamps
7. record delivery verification
8. finalize financial settlement where appropriate
9. calculate commissions if applicable
10. trigger vendor settlement where appropriate
11. notify customer
12. notify vendor
13. notify rider
14. update dashboards
15. broadcast final state
16. prevent duplicate completion

---

# PHASE 16 — EVENT-DRIVEN ARCHITECTURE

Where practical, introduce or consolidate domain events.

Examples:

OrderCreated
PaymentProofSubmitted
PaymentConfirmed
OrderAccepted
OrderPreparing
OrderReady
DeliveryOpened
DeliveryAssigned
RiderArrivedAtPickup
PickupVerified
TripStarted
RiderArrivedAtCustomer
DeliveryVerified
OrderCompleted
OrderCancelled

These events should not necessarily be separate database tables unless the architecture requires it.

The important requirement is that state transitions produce reliable events.

---

# EVENT PROCESSING REQUIREMENTS

Every event should be:

* identifiable
* traceable
* idempotent
* timestamped
* associated with order/delivery/payment
* associated with actor where applicable

Avoid performing important business logic solely inside frontend callbacks.

---

# PHASE 17 — TRANSACTIONAL CONSISTENCY

Whenever multiple related records change together, use database transactions.

Examples:

Payment confirmed:

* payment status
* order status
* delivery creation/update
* code generation
* relevant event/outbox record

Rider acceptance:

* delivery assignment
* delivery state
* order state if required

Pickup verification:

* verification record
* delivery state
* order state

Delivery completion:

* verification
* delivery status
* order status
* settlement state

Do not allow partially completed state transitions.

---

# PHASE 18 — OUTBOX / RELIABLE EVENT DELIVERY

Inspect whether the existing architecture already has an event/outbox system.

If it does, use it.

If it does not, determine whether an outbox pattern is justified.

For critical events:

Database transaction
+
event record

should allow reliable asynchronous processing.

This prevents situations such as:

Database says:

READY_FOR_PICKUP

but Redis broadcast fails and riders never know.

The event should be recoverable/retriable.

Do not introduce unnecessary complexity if the current scale does not justify a full queue/outbox system, but the architecture must not silently lose critical events.

---

# PHASE 19 — REDIS

If Redis is already available, inspect how it is currently being used.

Determine whether Redis should handle:

* Pub/Sub
* temporary cache
* event fanout
* rider availability
* open-delivery broadcasting
* rate limiting
* locks
* queues

Do not use Redis as the permanent source of truth for orders.

Do not store critical order state only in Redis.

Database remains authoritative.

---

# PHASE 20 — CACHE SAFELY

Where caching exists, ensure order/delivery state is not allowed to become stale in ways that could cause operational errors.

For example:

A delivery becomes ASSIGNED.

Other riders must not continue seeing it as OPEN due to stale cache.

Use appropriate invalidation/event-driven cache updates.

For critical operations, always validate against authoritative backend/database state.

---

# PHASE 21 — FRONTEND SYNCHRONIZATION

Audit:

Customer app
Vendor app
Rider app
Admin dashboard

Each should consume authoritative backend state.

The UI should update through:

1. initial server fetch
2. real-time events
3. refetch/reconciliation when necessary
4. reconnect synchronization

Do not depend exclusively on local optimistic state.

Optimistic UI is allowed for presentation, but authoritative state comes from backend.

---

# PHASE 22 — OFFLINE / RECONNECT BEHAVIOR

Test what happens when:

* rider loses internet
* vendor loses internet
* customer closes app
* WebSocket disconnects
* Redis event is missed
* mobile app goes background
* app reconnects

Upon reconnection:

* authenticate
* resubscribe
* fetch authoritative current state
* reconcile local state
* fetch open deliveries again
* remove stale delivery entries

---

# PHASE 23 — NOTIFICATIONS

Audit the existing notification system.

Every important transition should generate appropriate notifications.

Examples:

PAYMENT CONFIRMED
→ vendor

VENDOR ACCEPTED
→ customer

FOOD READY
→ customer + eligible riders

RIDER ACCEPTED
→ customer + vendor

PICKUP VERIFIED
→ customer + vendor

TRIP STARTED
→ customer

RIDER ARRIVED
→ customer

DELIVERY COMPLETED
→ customer + vendor + rider

Use the existing notification architecture.

Do not create duplicate notification systems.

---

# PHASE 24 — ADMIN DASHBOARD

Admin must still have visibility.

Admin should be able to see:

* orders
* payment state
* vendor state
* rider assignment
* delivery state
* verification status
* payment gateway
* transaction reference
* event history
* failures
* exceptions

Admin should also have controlled override tools.

But normal successful orders should flow without Admin.

---

# ADMIN OVERRIDES

Any manual intervention should require:

* explicit authorization
* reason
* actor ID
* timestamp
* previous state
* new state
* audit record

Never silently overwrite state.

---

# PHASE 25 — AUDIT TRAIL

Ensure the system records important state transitions.

For example:

ORDER_CREATED
PAYMENT_SUBMITTED
PAYMENT_APPROVED
VENDOR_ACCEPTED
FOOD_READY
DELIVERY_OPENED
RIDER_ASSIGNED
PICKUP_VERIFIED
TRIP_STARTED
DELIVERY_VERIFIED
ORDER_COMPLETED

The audit history should allow an operator to answer:

"What exactly happened to this order?"

---

# PHASE 26 — CONCURRENCY & RACE CONDITIONS

Test aggressively for races.

Examples:

Two riders accept simultaneously.

Vendor clicks "Food Ready" twice.

Customer submits payment proof twice.

Admin approves payment twice.

Payment webhook arrives twice.

Stripe webhook arrives before redirect.

Paystack callback and webhook both arrive.

Rider enters pickup code twice.

Rider enters delivery code twice.

Rider attempts to start trip before pickup.

Rider attempts delivery before trip starts.

Cancelled delivery receives a late event.

Vendor tries to modify another vendor's order.

Customer tries to manipulate order status.

Every transition must be protected server-side.

---

# PHASE 27 — AUTHORIZATION

Every state transition must verify actor permissions.

Examples:

Customer can:

* create own order
* submit own payment
* view own order
* view own delivery code when appropriate

Vendor can:

* view assigned vendor orders
* accept own orders
* update preparation state
* mark food ready
* participate in pickup verification

Rider can:

* view eligible deliveries
* accept available delivery
* verify pickup
* start trip
* verify customer delivery

Admin can:

* review manual payments
* monitor
* intervene through controlled overrides

Never trust IDs supplied by clients.

---

# PHASE 28 — PAYMENT/ORDER SECURITY

Ensure users cannot manipulate:

* price
* delivery fee
* commission
* payment amount
* vendor ID
* rider ID
* order ownership
* status
* verification status

All financial values must be calculated/validated server-side.

---

# PHASE 29 — CODE GENERATION CONSOLIDATION

Search the entire repository for every code-generation implementation.

You may discover multiple systems.

Determine:

* which one is actually used
* which one is dead
* which one is duplicated
* which one is authoritative

Consolidate carefully.

DO NOT delete code merely because it looks unused.

Verify references first.

The final architecture should have a single authoritative generation path for:

1. pickup verification
2. delivery verification

unless the existing business rules explicitly require another code type.

---

# PHASE 30 — AUTOMATED STATE TESTS

Create tests for the entire lifecycle.

At minimum test:

## Successful manual payment flow

Customer
→ order
→ proof submitted
→ admin approval
→ vendor notification
→ vendor acceptance
→ code generation
→ preparation
→ ready
→ delivery opened
→ rider sees delivery
→ rider accepts
→ pickup code
→ pickup verified
→ trip started
→ customer delivery code
→ delivery verified
→ order completed

## Automated payment

Customer
→ payment gateway
→ webhook
→ verification
→ order continues

## Failed payment

Payment fails
→ order remains unpaid
→ vendor does not receive valid order

## Duplicate webhook

Same webhook twice
→ only one confirmation

## Two riders

Two riders attempt acceptance
→ one succeeds
→ one fails safely

## Wrong pickup code

→ pickup remains unverified

## Wrong delivery code

→ delivery remains unverified

## Unauthorized rider

→ cannot manipulate delivery

## Reconnect

Rider disconnects
→ delivery changes
→ rider reconnects
→ receives correct current state

---

# PHASE 31 — OBSERVABILITY

Add or improve structured logs around critical transitions.

Every important operation should make it possible to identify:

* order ID
* payment ID
* delivery ID
* rider ID
* vendor ID
* event
* previous state
* new state
* actor
* timestamp
* provider reference where relevant
* error

Do not log:

* payment secrets
* API secrets
* full card information
* sensitive credentials
* raw security codes unnecessarily

---

# PHASE 32 — PAYMENT WEBHOOK RELIABILITY

Webhook handlers must be:

* authenticated/verified
* fast
* idempotent
* retry-safe
* transactionally safe

Do not perform unnecessary long-running operations before acknowledging the provider.

If the architecture supports queues/background jobs, use them appropriately.

---

# PHASE 33 — ENVIRONMENT CONFIGURATION

Audit environment variables for:

PAYSTACK
FLUTTERWAVE
STRIPE
REDIS
DATABASE
WEBHOOKS
WEBHOOK SECRETS
FRONTEND URLs
BACKEND URLs

Ensure:

* production secrets are not committed
* development/test credentials are separated
* frontend only receives public keys
* secret keys remain server-side

Provide a clear list of required environment variables after implementation.

Do not expose their values.

---

# PHASE 34 — WEBHOOK ENDPOINTS

Inspect existing routes.

Do not create duplicate endpoints if one already exists.

Each provider should have one authoritative webhook handling path unless there is a legitimate reason otherwise.

Ensure webhook events can be mapped reliably to internal payment/order records.

Prefer internal payment references/metadata over trusting arbitrary client-provided order IDs.

---

# PHASE 35 — FRONTEND UX

After backend functionality is stable, audit the interfaces.

Customer should clearly see:

* payment state
* vendor acceptance
* food preparation
* food ready
* rider assignment
* rider en route
* pickup
* trip
* arrival
* completion

Vendor should clearly see:

* new paid order
* accept
* preparing
* ready
* rider assigned
* rider arrival
* pickup verification

Rider should clearly see:

* open deliveries
* delivery details
* pickup location
* vendor details
* pickup verification
* customer destination
* trip status
* delivery verification
* completion

Admin should clearly see the full lifecycle without being required to operate it.

---

# PHASE 36 — DO NOT TRUST UI BUTTONS

Every button must correspond to a server-side authorized transition.

Examples:

"Accept Order"

must not simply update frontend state.

"Food Ready"

must not simply change a local variable.

"Accept Delivery"

must execute a concurrency-safe backend operation.

"Picked Up"

must require pickup verification.

"Delivered"

must require delivery verification.

---

# PHASE 37 — FAILURE RECOVERY

Design for failures.

Examples:

Vendor marks food ready but Redis is temporarily unavailable.

Payment succeeds but webhook processing fails.

Rider accepts delivery but notification fails.

Pickup is verified but WebSocket disconnects.

Delivery completes but notification fails.

The system must distinguish:

BUSINESS STATE
from
NOTIFICATION DELIVERY

A notification failure must not roll back a successful business transition unnecessarily.

Likewise, a notification should not be considered proof that the state was successfully persisted.

---

# PHASE 38 — DATABASE INTEGRITY

Inspect schema for appropriate:

* foreign keys
* unique constraints
* indexes
* transaction boundaries
* status constraints
* provider transaction uniqueness
* delivery assignment uniqueness
* verification uniqueness

Add only necessary indexes/constraints.

Do not casually modify existing migrations.

Create proper migrations if schema changes are required.

---

# PHASE 39 — PERFORMANCE

Do not create excessive database calls.

For real-time rider dispatch:

Do not query every rider repeatedly every few seconds if event-driven architecture can eliminate that.

Avoid:

N riders × repeated polling × repeated delivery queries.

Prefer:

delivery becomes OPEN
↓
one event
↓
eligible rider channels
↓
clients update

Use polling only as reconciliation/fallback where appropriate.

---

# PHASE 40 — FINAL END-TO-END TRACE

After implementation, manually trace a real order through:

1. Customer creates order
2. Customer pays manually
3. Customer submits proof
4. Admin approves proof
5. Vendor receives order
6. Vendor accepts
7. Verification code generated
8. Vendor prepares
9. Vendor marks ready
10. Delivery becomes open
11. Riders receive event
12. Rider accepts
13. Other riders lose availability
14. Rider sees pickup information
15. Rider arrives
16. Vendor provides pickup code
17. Rider enters code
18. Pickup becomes verified
19. Rider starts trip
20. Customer receives update
21. Rider arrives
22. Customer provides delivery code
23. Rider enters code
24. Delivery becomes verified
25. Order becomes completed
26. Financial settlement occurs
27. All parties receive final state

At every stage ask:

"Does this require Admin?"

If yes, determine whether that dependency is genuinely required.

The ONLY intentional normal dependency at this stage is:

MANUAL PAYMENT PROOF → ADMIN APPROVAL

Everything after successful payment approval should proceed automatically.

---

# PHASE 41 — IMPLEMENTATION DISCIPLINE

Execute this project sequentially.

DO NOT attempt all changes simultaneously.

Use these stages:

### STAGE A

Audit only.

### STAGE B

Architecture/state-transition map.

### STAGE C

Backend state machine and transition integrity.

### STAGE D

Manual payment → automatic downstream orchestration.

### STAGE E

Payment gateway audit and implementation:
Paystack
Flutterwave
Stripe

### STAGE F

Delivery opening + real-time rider broadcast.

### STAGE G

Rider assignment/concurrency.

### STAGE H

Pickup verification.

### STAGE I

Trip lifecycle.

### STAGE J

Customer delivery verification.

### STAGE K

Completion + settlement.

### STAGE L

Frontend synchronization.

### STAGE M

Notifications.

### STAGE N

Testing, security, race conditions and failure recovery.

### STAGE O

Performance and final cleanup.

DO NOT move to the next stage until the current stage has been reviewed and validated.

---

# IMPORTANT: BEFORE EACH STAGE

Tell me:

1. What you discovered
2. What already exists
3. What is broken
4. What is duplicated
5. What you intend to change
6. Which files will change
7. Why each file needs changing
8. What you explicitly will NOT change
9. What risks exist
10. How you will test it

Then implement only that stage.

---

# DEFINITION OF DONE

The project is NOT complete merely because buttons work.

It is complete when:

CUSTOMER
→ PAYMENT
→ VENDOR
→ PREPARATION
→ READY
→ RIDER DISPATCH
→ RIDER ACCEPTANCE
→ PICKUP VERIFICATION
→ TRIP
→ DELIVERY VERIFICATION
→ COMPLETION

works as one connected backend-authoritative workflow.

The Admin should not have to manually push the order through normal stages.

Manual payment approval remains Admin-controlled.

Automated gateway payments must be automatically confirmed through secure server-side verification/webhooks.

Vendor readiness must automatically open delivery.

Delivery opening must automatically reach eligible riders.

Rider acceptance must be atomic.

Pickup must require vendor→rider verification.

Delivery must require rider→customer verification.

Every important state must be persisted.

Every important state change must be broadcast.

Every critical operation must be idempotent.

Every financial operation must be server-authoritative.

Every sensitive operation must be authorized.

Every important transition must be auditable.

Every missed real-time event must be recoverable through synchronization.

---

# MOST IMPORTANT INSTRUCTION

DO NOT BUILD A SECOND MARKETPLACE ON TOP OF THE FIRST ONE.

The repository already contains substantial pieces.

Your job is to discover the pieces, determine which are authoritative, repair the broken connections, remove only genuinely redundant/unsafe paths, and connect the existing systems into one coherent state machine.

Prefer:

REUSE → CONNECT → REFACTOR SURGICALLY → TEST

over:

REWRITE → DUPLICATE → REPLACE.

If you discover conflicting implementations, STOP and explain the conflict before deleting or replacing anything.

The goal is not simply to make the application "look connected."

The goal is to make the underlying system genuinely connected, transactional, event-driven, secure, recoverable, and capable of completing an order from payment confirmation through final delivery without Admin orchestration.
