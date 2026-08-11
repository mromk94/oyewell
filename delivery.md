# OYEWELL — DUAL DELIVERY NETWORK

# NEIGHBORHOOD DELIVERY + PROFESSIONAL DELIVERY

## MASTER MULTI-PHASE IMPLEMENTATION PROMPT

You are working inside the existing OyeWell production application.

OyeWell already has:

* working frontend
* working backend
* working database
* existing authentication
* existing customer system
* existing food discovery
* existing restaurant/food ordering
* existing payment infrastructure
* existing rider/delivery functionality
* existing `/rider` functionality
* existing admin functionality
* existing "Food Around Me" functionality
* existing OyeWell Hero/feed
* existing cook/host marketplace functionality from the previous implementation

Your task is to **surgically evolve the existing delivery architecture into a dual-tier local delivery network**.

DO NOT rebuild OyeWell.

DO NOT create a second authentication system.

DO NOT create a second wallet.

DO NOT create a second order engine.

DO NOT create a second payment engine.

DO NOT create a separate unrelated rider database.

DO NOT duplicate existing functionality.

Instead, extend the current architecture.

---

# CORE PRODUCT VISION

OyeWell should now have TWO delivery types operating inside the SAME delivery platform:

## 1. NEIGHBORHOOD DELIVERY

A lower-cost, highly local delivery service performed by approved ordinary OyeWell users who have registered as Neighborhood Delivery Partners.

This is intended to be:

* cheaper
* highly local
* flexible
* community-driven
* potentially faster for nearby deliveries
* accessible to ordinary people
* suitable for people using spare time to make additional income

These people may be:

* neighbors
* security staff
* service workers
* students
* small business workers
* people running errands
* people with motorcycles
* people with bicycles
* walkers where appropriate
* ordinary residents with approved delivery capability

They do not initially need to be professional delivery companies.

---

# 2. PROFESSIONAL DELIVERY

A higher-tier delivery service performed only by delivery partners who have completed OyeWell's professional qualification/upgrade process.

Professional delivery should provide a more premium experience.

It may include:

* professionally presented delivery partners
* higher operational requirements
* approved vehicle
* vehicle inspection
* additional verification
* professional delivery equipment
* branded equipment where appropriate
* stricter service requirements
* potentially higher service levels
* potentially higher reliability expectations
* premium customer presentation

Professional delivery costs more.

---

# THE CUSTOMER CHOICE

The customer should be able to choose:

### NEIGHBORHOOD DELIVERY

"Affordable local delivery"

or

### PROFESSIONAL DELIVERY

"Premium delivery with a professional delivery partner"

The exact wording should be simple and friendly.

The customer should see the difference clearly before paying.

Example:

---

### 🚶 Neighborhood Delivery

**₦1,000**

Local delivery by an approved OyeWell neighborhood partner.

Estimated:
**35–55 min**

---

### 🛵 Professional Delivery

**₦1,800**

Delivery by an approved professional OyeWell partner.

Estimated:
**25–45 min**

---

Do not hardcode these exact prices or times.

The admin must be able to configure pricing and operational rules.

---

# CRITICAL BUSINESS RULE

The delivery type selected by the CUSTOMER must be stored as part of the delivery/order.

It must never be inferred later from which rider accepts the job.

For example:

CUSTOMER SELECTS:

PROFESSIONAL

↓

Only PROFESSIONAL-ELIGIBLE riders can accept.

Customer selects:

NEIGHBORHOOD

↓

NEIGHBORHOOD-ELIGIBLE riders can accept.

Professional riders MAY optionally accept Neighborhood Delivery jobs.

However:

If a professional rider accepts a Neighborhood Delivery job, the order remains:

DELIVERY_TYPE = NEIGHBORHOOD

and the rider receives the Neighborhood Delivery payout.

The rider's professional status does not automatically upgrade the order.

This creates maximum delivery liquidity while preserving the customer's chosen service tier.

---

# HIGH-LEVEL ARCHITECTURE

The system should conceptually become:

```
                     OYEWELL
                        |
                 SINGLE USER ACCOUNT
                        |
          +-------------+-------------+
          |             |             |
       CUSTOMER       COOK         DELIVERY
                                      |
                              DELIVERY PARTNER
                                      |
                          +-----------+-----------+
                          |                       |
                   NEIGHBORHOOD              PROFESSIONAL
                          |                       |
                   BASIC APPROVAL          PROFESSIONAL
                   + KYC                    APPROVAL
                                              + KYC
                                              + VEHICLE
                                              + INSPECTION
                                              + ADMIN REVIEW
```

````

Both delivery tiers use:

- same authentication
- same user
- same delivery engine
- same order system
- same wallet/ledger
- same notifications
- same admin
- same location infrastructure
- same rider application
- same tracking infrastructure

The difference is **eligibility, pricing, service requirements, and operational presentation**.

---

# ABSOLUTE DEVELOPMENT RULES

## RULE 1 — AUDIT BEFORE CODING

Before changing anything, inspect the entire current implementation.

Do not assume anything.

Inspect:

### Frontend

- routes
- `/rider`
- delivery dashboard
- checkout
- order pages
- delivery selection
- location services
- maps
- tracking
- wallet
- profile
- auth
- modals
- notification system
- design system

### Backend

Inspect:

- delivery service
- rider service
- order service
- payment service
- wallet service
- user service
- authentication
- KYC if already present
- location
- notification
- admin
- realtime/websocket system

### Database

Inspect:

- users
- roles
- rider models
- delivery models
- order models
- payment models
- wallet models
- transaction/ledger models
- location models
- vehicle models
- KYC models
- admin models
- audit logs

---

# RULE 2 — DO NOT DUPLICATE SYSTEMS

If an existing:

- Rider
- Delivery
- Wallet
- Payment
- KYC
- User
- Order
- Location

system already exists, extend it.

Do not create:

`NeighborhoodRider`

and

`ProfessionalRider`

as two completely separate systems unless there is an overwhelming architectural reason.

Prefer:

`DeliveryPartner`

with capabilities/statuses.

---

# RULE 3 — ONE USER, MULTIPLE CAPABILITIES

A normal OyeWell account should be able to apply for additional capabilities.

For example:

```text
User
 |
 +-- Customer
 |
 +-- Cook
 |
 +-- Neighborhood Delivery Partner
 |
 +-- Professional Delivery Partner
````

A person can eventually be:

CUSTOMER + COOK + NEIGHBORHOOD_DELIVERY

or:

CUSTOMER + PROFESSIONAL_DELIVERY

or:

CUSTOMER + COOK + PROFESSIONAL_DELIVERY

Do not force people to create separate accounts.

---

# RULE 4 — SERVER-SIDE AUTHORIZATION

Never trust frontend role/status values.

The backend must verify:

* user identity
* role
* KYC status
* delivery approval
* partner tier
* operational status
* ban status
* pause status
* suspension
* vehicle eligibility
* professional eligibility

before allowing delivery acceptance.

---

# PHASE 1 — ARCHITECTURE AUDIT

DO NOT implement the new system yet.

Produce a written report identifying:

1. Existing delivery architecture
2. Existing rider architecture
3. Existing user/role architecture
4. Existing wallet architecture
5. Existing payment architecture
6. Existing KYC architecture
7. Existing location architecture
8. Existing admin architecture
9. Existing delivery pricing
10. Existing delivery assignment logic
11. Existing rider approval system
12. Existing vehicle information
13. Existing delivery tracking
14. Existing `/rider` UI
15. Existing customer checkout flow

Identify:

* what can be reused
* what can be extended
* what must change
* what must not change
* potential migration risks
* potential breaking points

DO NOT make broad refactors during this phase.

---

# PHASE 2 — DELIVERY DOMAIN MODEL

Extend the existing delivery domain.

Do not create separate delivery engines.

Introduce a delivery type/capability concept.

Conceptually:

```text
DeliveryType
    NEIGHBORHOOD
    PROFESSIONAL
```

Use whatever naming convention matches the existing codebase.

---

# DELIVERY PARTNER CAPABILITY

A delivery partner should have one underlying identity.

Then maintain eligibility/capabilities such as:

```text
NEIGHBORHOOD
PROFESSIONAL
```

A partner may eventually have:

```text
NEIGHBORHOOD
```

or:

```text
NEIGHBORHOOD + PROFESSIONAL
```

Do not assume professional automatically means neighborhood capability unless your architecture explicitly permits it.

The system should support both.

---

# DELIVERY PARTNER STATUS

Separate these concepts.

## ACCOUNT STATUS

ACTIVE
SUSPENDED
BANNED

## KYC STATUS

NOT_STARTED
IN_PROGRESS
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
NEEDS_INFORMATION

## NEIGHBORHOOD APPROVAL

PENDING
APPROVED
REJECTED
SUSPENDED

## PROFESSIONAL APPROVAL

NOT_APPLIED
PENDING
APPROVED
REJECTED
SUSPENDED

## OPERATIONAL STATUS

ONLINE
OFFLINE
BUSY

This separation is extremely important.

---

# PHASE 3 — NEIGHBORHOOD DELIVERY APPLICATION

Create a simple application flow available to any authenticated OyeWell user.

Possible entry point:

Profile:

### Make Money With OyeWell

> Deliver food around your area and earn extra money.

Button:

### Become a Delivery Partner

---

# APPLICATION WIZARD

Use a modal/stepper system.

Do NOT navigate through a complicated series of pages.

The UI should feel elegant, modern and extremely easy to understand.

---

## STEP 1 — ABOUT YOU

Show simple fields:

* name
* phone
* area/location

Avoid technical wording.

---

## STEP 2 — HOW WILL YOU DELIVER?

Options:

🚶 Walking

🚲 Bicycle

🏍️ Motorcycle

🚗 Car

Only show options appropriate to the existing operational rules.

---

## STEP 3 — WHERE DO YOU WANT TO DELIVER?

Use:

* current location
* selected neighborhood
* delivery radius

Explain simply:

> "We'll show you jobs that are close to you."

---

## STEP 4 — VERIFY YOUR IDENTITY

Reuse the existing KYC service.

Do not create a separate KYC system.

Explain simply:

> "We check your details so customers can trust the person delivering their food."

Collect only information actually required by the applicable operational/compliance requirements.

---

## STEP 5 — REVIEW

Show:

Your name

Your area

Your delivery method

Your delivery range

Then:

### Submit Application

---

# APPLICATION STATUS

After submission:

### Application Under Review

> We're checking your details.

Possible statuses:

Approved

Needs more information

Rejected

Suspended

---

# PHASE 4 — PROFESSIONAL DELIVERY UPGRADE

A Neighborhood Delivery Partner should be able to upgrade.

Inside their dashboard:

### Become a Professional Delivery Partner

Explain:

> "Professional delivery can give you access to higher-paying premium deliveries."

Then show the requirements.

---

# PROFESSIONAL UPGRADE FLOW

Use a modal wizard.

### STEP 1

Your current delivery status.

### STEP 2

Professional requirements.

### STEP 3

Vehicle details.

### STEP 4

Required documents.

### STEP 5

Physical inspection.

### STEP 6

Final review.

### STEP 7

Approval.

---

# PROFESSIONAL REQUIREMENTS

Do not hardcode assumptions.

Create admin-configurable requirements.

Potential requirements may include:

* approved vehicle
* valid vehicle documentation
* appropriate rider/driver documentation
* identity verification
* vehicle inspection
* safety equipment
* delivery equipment
* professional presentation
* OyeWell-branded equipment where applicable
* other legally/operationally required documents

The admin should be able to configure these requirements.

---

# PHYSICAL INSPECTION

Professional status should NOT be granted solely from uploaded documents.

Create an inspection workflow.

Admin should be able to record:

* inspection date
* inspector
* vehicle
* inspection result
* notes
* photos where appropriate
* next inspection date
* approval status

Possible states:

PENDING_INSPECTION

INSPECTION_SCHEDULED

INSPECTION_PASSED

INSPECTION_FAILED

APPROVED

---

# IMPORTANT

Do not expose unnecessary sensitive vehicle or identity information publicly.

Only authorized admins should access detailed KYC/inspection information.

---

# PHASE 5 — DELIVERY TIERS IN CUSTOMER CHECKOUT

Upgrade the existing checkout.

When delivery is required, show:

# Choose your delivery

---

### 🚶 Neighborhood

**₦X**

Affordable local delivery.

Usually delivered by an approved OyeWell neighborhood partner.

Estimated arrival:

**X–Y minutes**

---

### 🛵 Professional

**₦Y**

Premium delivery by an approved professional partner.

Estimated arrival:

**X–Y minutes**

---

The UI must make the difference understandable without lengthy explanations.

Allow the user to switch between them.

Update:

* delivery fee
* total price
* estimated time
* eligible delivery pool

in real time.

---

# DO NOT MAKE PROFESSIONAL DELIVERY LOOK LIKE A COMPLICATED CONTRACT

The customer should simply think:

> "Do I want cheaper local delivery or premium professional delivery?"

---

# PHASE 6 — DELIVERY PRICING ENGINE

Do not hardcode delivery prices into frontend components.

Create a configurable delivery pricing engine.

It should support different rules for:

NEIGHBORHOOD

PROFESSIONAL

Potential factors:

* base fee
* distance
* distance bands
* time
* demand
* location
* pickup type
* delivery type
* special promotions

Example concept:

```text
NEIGHBORHOOD
Base + local distance

PROFESSIONAL
Higher base + distance + premium service fee
```

The exact pricing must be configurable.

---

# ADMIN PRICING CONTROLS

Admin should be able to configure:

* neighborhood base fee
* professional base fee
* distance pricing
* minimum fee
* maximum fee
* radius
* surge rules if later needed
* rider payout
* OyeWell margin
* promotional discounts

Do not hardcode these values.

---

# PHASE 7 — DELIVERY ASSIGNMENT ENGINE

This is the heart of the system.

Create ONE delivery assignment engine.

It receives:

```text
deliveryType
pickupLocation
dropoffLocation
order
```

Then determines eligible delivery partners.

---

# NEIGHBORHOOD DELIVERY ELIGIBILITY

A Neighborhood Delivery job may be accepted by:

### Eligible Neighborhood Partner

AND optionally:

### Eligible Professional Partner

if professional partners are allowed to take neighborhood jobs.

---

# PROFESSIONAL DELIVERY ELIGIBILITY

A Professional Delivery job may ONLY be accepted by:

### Professional-eligible partners

A normal neighborhood-only partner must never be able to accept it.

This must be enforced server-side.

---

# PROFESSIONAL PARTNER TAKING NEIGHBORHOOD JOBS

Allow professional partners to opt into Neighborhood jobs.

For example:

### Accept neighborhood jobs too

Toggle:

ON / OFF

If ON:

They can receive:

NEIGHBORHOOD

and

PROFESSIONAL

jobs.

If OFF:

They only receive:

PROFESSIONAL

jobs.

This should be configurable.

---

# PAYOUT RULE

If:

Customer selected Neighborhood Delivery

and:

Professional Partner accepts it

then:

The job remains a Neighborhood Delivery job.

The payout follows the Neighborhood Delivery payout rules.

Do NOT automatically increase the payout because the partner is professional.

The professional partner chooses whether the lower-paying job is worthwhile.

---

# PHASE 8 — LOCAL DISPATCH

The delivery assignment system must be geographic.

For every delivery:

1. Determine pickup location.
2. Find eligible partners nearby.
3. Filter by delivery type.
4. Filter by status.
5. Filter by administrative restrictions.
6. Filter by vehicle/mode.
7. Filter by current workload.
8. Rank by proximity.
9. Dispatch progressively.

---

# PROGRESSIVE DISPATCH

Do not broadcast every job to everyone.

Example:

### Ring 1

Closest eligible partners.

### Ring 2

Expand radius.

### Ring 3

Expand further.

### Ring 4

Wider area.

The actual values must be admin configurable.

---

# NEIGHBORHOOD DELIVERY SHOULD BE HIGHLY LOCAL

Neighborhood jobs should prioritize:

* shortest pickup distance
* nearby riders
* local riders
* low travel distance
* fast acceptance

The goal is:

LOCAL FOOD

*

LOCAL RIDER

=

LOCAL DELIVERY

---

# PROFESSIONAL DELIVERY

Professional delivery may use a broader radius because the service costs more and the partner network is more controlled.

However, still prioritize reasonable proximity.

Do not assume professional means unlimited distance.

---

# PHASE 9 — CONCURRENT ACCEPTANCE

This is mandatory.

Suppose:

Rider A sees a job.

Rider B sees the same job.

Both press:

ACCEPT

at nearly the same time.

The backend must atomically determine one winner.

Exactly ONE rider gets the job.

The other gets:

> "This delivery has already been accepted."

Use database transactions/locking/atomic update mechanisms.

Do not rely on frontend state.

Create automated tests specifically for this.

---

# PHASE 10 — RIDER DASHBOARD

Upgrade the existing `/rider` section rather than creating a new rider app.

The dashboard should show:

# OyeWell Delivery

### Status

🟢 ONLINE

or

⚪ OFFLINE

---

## Available Near You

Cards should clearly show:

### DELIVERY

Neighborhood

or

Professional

Pickup

Destination

Distance

Estimated earnings

Estimated time

---

# DELIVERY TYPE VISUAL DIFFERENCE

Use a simple visual badge.

### LOCAL

for Neighborhood

### PROFESSIONAL

for Professional

Do not make the interface confusing.

---

# AVAILABLE JOB CARD

Example:

### 🍱 LOCAL DELIVERY

Pickup:

Mama Grace's Kitchen

Area:

Ikeja GRA

Deliver to:

Allen Avenue

Distance:

3.2 km

You earn:

₦1,200

### ACCEPT

---

Professional example:

### 🛵 PROFESSIONAL DELIVERY

Pickup:

OyeWell Restaurant

Deliver to:

Lekki Phase 1

You earn:

₦2,500

### ACCEPT

---

# PHASE 11 — RIDER DELIVERY WORKFLOW

Once accepted, simplify the entire experience into steps.

---

## STEP 1

### GO TO PICKUP

Show:

Pickup location

Order number

Pickup contact/person

Directions button

### I'M AT PICKUP

---

## STEP 2

### PICK UP ORDER

Show:

Order number

Food/order summary

Pickup name

Pickup verification

### CONFIRM PICKUP

---

## STEP 3

### DELIVER TO CUSTOMER

Show:

Destination

Directions

Customer delivery instructions where appropriate

### I'M AT DELIVERY

---

## STEP 4

### DELIVERY CODE

Customer provides the delivery code.

Rider enters code.

### CONFIRM DELIVERY

---

## STEP 5

### DELIVERY COMPLETE 🎉

Show:

You earned:

₦X

Button:

### DONE

Return to nearby jobs.

---

# PHASE 12 — DELIVERY CODE SECURITY

Generate a unique delivery confirmation code for the order/delivery.

The code must not be exposed to the rider before delivery in a way that defeats the verification purpose.

Customer receives the code through the appropriate customer interface/notification.

Rider enters the code.

Backend validates it.

Only then:

DELIVERY → COMPLETED

---

# PHASE 13 — PICKUP VERIFICATION

Use a secure pickup verification mechanism.

Depending on existing infrastructure:

* pickup PIN
* QR
* order code
* cook confirmation
* restaurant confirmation

Do not allow a rider to simply claim pickup without verification where verification is required.

---

# PHASE 14 — CUSTOMER TRACKING

Customer should see:

### Your delivery

Food being prepared

↓

Food ready

↓

Finding delivery partner

↓

Delivery partner assigned

↓

At pickup

↓

Food picked up

↓

On the way

↓

Arriving

↓

Delivered

---

# DELIVERY TYPE SHOULD BE VISIBLE

Show:

### Neighborhood Delivery

or:

### Professional Delivery

The customer should know which service they selected.

---

# PHASE 15 — PROFESSIONAL PRESENTATION

Professional Delivery should not merely be a database flag.

It should represent a real service standard.

Create an admin-managed professional standard.

Potential elements:

* vehicle condition
* approved vehicle type
* safety equipment
* delivery bag
* packaging handling
* appearance/presentation requirements
* documentation
* inspection
* service conduct

Do not hardcode subjective requirements.

Make them configurable.

---

# IMPORTANT

Do not create discriminatory or arbitrary appearance requirements.

Professional status should be based on legitimate service, safety, identification, equipment and operational requirements.

---

# PHASE 16 — PACKAGING REQUIREMENTS

Move food packaging responsibility to the Cook/food provider.

Before a Cook can sell food through OyeWell, they must meet OyeWell's applicable packaging requirements.

Create an admin-managed packaging policy.

---

# PACKAGING CHECKLIST

Depending on food category, requirements may include:

* food-safe container
* leak-resistant container
* secure lid
* sealed packaging
* suitable bag
* liquid separation
* labeling
* utensils where appropriate
* temperature/handling considerations where applicable

Do not claim a package is compliant merely because the Cook checked a box if stronger verification is required.

---

# ADMIN PACKAGING CONFIGURATION

Admin can create requirements by:

* food category
* food type
* delivery type
* location
* order size

Admin can:

ADD

EDIT

DISABLE

REQUIRE

REVIEW

---

# PHASE 17 — COOK "READY FOR PICKUP"

When Cook presses:

### FOOD IS READY

Backend checks:

* order is valid
* payment is valid
* Cook is approved
* listing is approved
* order is accepted
* kitchen is active
* packaging requirements satisfied
* delivery required

Then:

### FINDING A DELIVERY PARTNER

---

# PHASE 18 — WALLET AND EARNINGS

Reuse the existing OyeWell financial architecture.

Do not create a completely separate wallet database.

Create delivery earnings as ledger entries.

Example:

```text
Delivery completed
        ↓
Pending earning
        ↓
Order confirmed
        ↓
Released earning
        ↓
Available balance
        ↓
Withdrawal
```

---

# DELIVERY PARTNER WALLET

Show:

### Available

₦X

### Pending

₦Y

### Today

₦Z

### This week

₦A

---

# DELIVERY HISTORY

Show:

Delivery

Type

Date

Distance

Earnings

Status

---

# WITHDRAWAL

Reuse the existing payout infrastructure.

Do not invent a new banking system.

Ensure:

* idempotency
* transaction records
* withdrawal status
* failure handling
* reversal handling
* audit trail

---

# PHASE 19 — ADMIN DELIVERY CONTROL CENTER

Extend the existing admin.

Create:

# DELIVERY NETWORK

Sections:

### Live Deliveries

### Delivery Partners

### Applications

### KYC

### Professional Upgrades

### Vehicle Inspections

### Delivery Rules

### Pricing

### Payouts

### Disputes

### Suspensions

---

# LIVE DELIVERY MAP

If existing mapping infrastructure supports it, provide a live operational view showing:

* active deliveries
* rider location where permitted
* pickup
* dropoff
* delivery type
* status

Do not expose private locations unnecessarily.

---

# PHASE 20 — DELIVERY PARTNER ADMIN PROFILE

Admin should see:

Name

Account status

KYC status

Neighborhood approval

Professional approval

Delivery mode

Vehicle

Operating area

Rating

Completed deliveries

Cancellations

Complaints

Earnings summary

Suspensions

Audit history

---

# PHASE 21 — ADMIN ACTIONS

Admin should be able to:

Approve

Reject

Pause

Suspend

Ban

Restore

Request more information

Approve Professional Upgrade

Reject Professional Upgrade

Schedule Inspection

Record Inspection

Change delivery eligibility

---

# PHASE 22 — CUSTOMER PRIVACY

Do not expose the Cook's private residential address publicly.

Do not expose a customer's exact address to random riders before assignment.

Do not expose private phone numbers unnecessarily.

Use masked communication where appropriate.

Before delivery assignment:

Show approximate area.

After assignment:

Reveal only operational information required to complete the job.

---

# PHASE 23 — DELIVERY SAFETY

Create safety controls for:

* identity verification
* KYC
* rider approval
* professional inspection
* suspicious behavior
* repeated disputes
* fake deliveries
* delivery-code abuse
* impossible GPS movement
* account sharing
* duplicate accounts
* repeated cancellations
* suspicious rider/customer collusion

Use risk signals.

Do not automatically ban someone based on one weak signal.

Flag suspicious activity for admin review where appropriate.

---

# PHASE 24 — DELIVERY CANCELLATION

Create explicit rules for:

Customer cancellation

Cook cancellation

Restaurant cancellation

Rider cancellation

Rider rejection

Timeout

No rider available

Failed pickup

Failed delivery

Incorrect delivery code

Customer unavailable

Cook unavailable

---

# IMPORTANT

Do not leave money in an ambiguous state.

Every cancellation path must define:

* order status
* delivery status
* payment status
* refund status
* rider earnings
* cook earnings
* OyeWell fees

---

# PHASE 25 — NO RIDER AVAILABLE

If no eligible partner accepts:

The system should progressively expand the search radius.

If still unavailable:

Show the customer:

> "We're having trouble finding a delivery partner."

Offer appropriate options based on business rules:

* continue waiting
* change delivery type
* cancel
* retry

If the customer switches:

NEIGHBORHOOD → PROFESSIONAL

recalculate price and dispatch eligibility.

If:

PROFESSIONAL → NEIGHBORHOOD

only allow this where the business/payment rules permit it.

---

# PHASE 26 — DELIVERY TYPE CHANGE

The customer may be allowed to change delivery type before assignment.

For example:

Neighborhood:

₦1,000

No rider available.

Customer selects:

Professional:

₦1,800

System:

1. updates delivery type
2. recalculates price
3. handles payment difference/refund correctly
4. invalidates previous dispatch opportunity
5. starts professional dispatch

This must be transactional.

Never create duplicate deliveries.

---

# PHASE 27 — REAL-TIME DELIVERY EVENTS

Reuse existing websocket/realtime infrastructure.

Events may include:

DELIVERY_CREATED

DELIVERY_TYPE_SELECTED

DELIVERY_SEARCH_STARTED

RIDER_OFFERED

RIDER_ACCEPTED

RIDER_ARRIVED_PICKUP

ORDER_PICKED_UP

RIDER_STARTED_DELIVERY

RIDER_ARRIVED

DELIVERY_CODE_VERIFIED

DELIVERY_COMPLETED

DELIVERY_CANCELLED

NO_RIDER_FOUND

DELIVERY_TYPE_CHANGED

---

# PHASE 28 — PERFORMANCE

The delivery marketplace must remain fast.

Optimize:

* nearby rider queries
* nearby food queries
* delivery assignment
* geospatial indexes
* feed
* media
* websocket events
* notifications
* checkout
* pricing calculations

Do not load every rider into application memory.

Use proper geospatial/database querying.

Use indexes.

Use pagination.

Use caching where appropriate.

---

# PHASE 29 — IDEMPOTENCY

Absolutely enforce idempotency for:

* order creation
* delivery creation
* rider acceptance
* delivery completion
* delivery-code confirmation
* wallet credits
* payouts
* withdrawals
* refunds
* delivery-type changes

Network retries must never create:

* two deliveries
* two riders
* two payouts
* two wallet credits
* two refunds

---

# PHASE 30 — DATABASE MIGRATION

Before applying migrations:

1. inspect existing schema
2. create migration
3. test locally
4. test existing records
5. test staging if available
6. verify indexes
7. verify constraints
8. verify rollback strategy

Never destroy existing rider/order records.

Existing riders should be migrated into the appropriate capability state.

For example:

Existing approved riders may initially become:

PROFESSIONAL

if their existing approval level already meets the new professional requirements.

Do not arbitrarily downgrade existing operational riders.

Instead, inspect their existing verification and let the migration preserve their legitimate capabilities.

---

# PHASE 31 — BACKWARD COMPATIBILITY

Existing delivery orders must continue functioning.

Existing riders must continue functioning.

Existing customer orders must continue functioning.

Existing restaurant orders must continue functioning.

Existing payment records must remain valid.

Existing admin tools must continue working.

Do not require old orders to be migrated into impossible new states.

Create compatibility mapping where necessary.

---

# PHASE 32 — TESTING

Create comprehensive automated tests.

## CUSTOMER

* choose Neighborhood
* choose Professional
* switch delivery type
* price recalculation
* delivery ETA
* tracking
* cancellation
* delivery code

## NEIGHBORHOOD PARTNER

* application
* KYC
* approval
* online
* offline
* nearby jobs
* accept
* pickup
* delivery
* wallet
* withdrawal

## PROFESSIONAL PARTNER

* upgrade
* KYC
* vehicle
* inspection
* approval
* professional job
* neighborhood job if opted in

## ADMIN

* approve
* reject
* pause
* suspend
* ban
* restore
* pricing
* delivery rules
* inspection
* packaging rules

---

# PHASE 33 — CONCURRENCY TESTING

Explicitly test:

Rider A accepts job.

Rider B accepts same job.

Expected:

ONE SUCCESS

ONE FAILURE

Never:

TWO ACTIVE RIDERS

---

# PHASE 34 — AUTHORIZATION TESTING

Verify:

Neighborhood-only rider attempts Professional job.

Expected:

DENIED.

Unapproved rider attempts Neighborhood job.

Expected:

DENIED.

Banned rider attempts acceptance.

Expected:

DENIED.

Paused rider attempts acceptance.

Expected:

DENIED.

Professional rider accepts Neighborhood job.

Expected:

ALLOWED if professional rider has opted into neighborhood jobs.

Professional rider receives:

NEIGHBORHOOD PAYOUT.

---

# PHASE 35 — FINANCIAL TESTING

Test:

₦1,000 neighborhood delivery

₦1,800 professional delivery

Professional partner taking ₦1,000 neighborhood job

Cancellation before acceptance

Cancellation after acceptance

Cancellation after pickup

Successful completion

Failed delivery

Refund

Withdrawal

Duplicate webhook

Duplicate completion request

All balances must remain correct.

---

# PHASE 36 — UX DESIGN

The interface must be beautiful.

Use the existing OyeWell design language.

Do not create a separate visual identity.

However, `/delivery` should feel like a polished mini-product.

Use:

* clean cards
* large buttons
* clear status
* simple icons
* step indicators
* obvious navigation
* excellent spacing
* subtle animation
* strong empty states
* clear error messages
* friendly language

---

# LANGUAGE RULE

This is extremely important.

Many delivery partners and cooks may not be highly technical users.

Do NOT use complicated technical terminology.

Instead of:

"Delivery Opportunity"

prefer:

### Available Delivery

Instead of:

"Operational Status"

prefer:

### You're Online

Instead of:

"Fulfillment Confirmation"

prefer:

### Confirm Pickup

Instead of:

"Proof of Delivery"

prefer:

### Enter Delivery Code

Instead of:

"Application Submitted Successfully"

prefer:

### Your Application Has Been Sent

The backend can be sophisticated.

The interface must feel simple.

---

# PHASE 37 — DELIVERY PARTNER ONBOARDING UX

The onboarding should feel like a guided conversation.

Example:

### Welcome to OyeWell Delivery 👋🏾

> You can make extra money by delivering food around you.

### Let's get started.

**1. About you**

**2. How you deliver**

**3. Where you deliver**

**4. Verify yourself**

**5. Finish**

Show:

`● ● ○ ○ ○`

Allow:

BACK

NEXT

CANCEL

SAVE AND CONTINUE LATER

---

# PHASE 38 — PROFESSIONAL UPGRADE UX

Make upgrading feel like a progression.

Example:

# Become Professional

> Want to take premium delivery jobs?

### You already have:

✓ OyeWell account

✓ Delivery approval

### You need:

○ Vehicle check

○ Required documents

○ Physical inspection

○ Final approval

Then:

### START UPGRADE

---

# PHASE 39 — COOK PACKAGING UX

When a cook creates a food listing:

Show:

# Pack This Food Safely

Simple checklist:

☐ Container closes properly

☐ Food cannot leak

☐ Order is labeled

☐ Bag is secure

Then:

### READY

For requirements that need actual evidence, use appropriate verification rather than relying only on self-attestation.

---

# PHASE 40 — DELIVERY ANALYTICS

Create analytics internally.

Track:

* neighborhood delivery count
* professional delivery count
* acceptance rate
* average assignment time
* average pickup time
* average delivery time
* cancellation rate
* no-rider rate
* earnings
* rider utilization
* distance
* customer preference
* delivery-type conversion

This allows OyeWell to determine whether customers actually value the premium tier.

---

# PHASE 41 — FEATURE FLAGS

Introduce feature flags where practical.

Examples:

`NEIGHBORHOOD_DELIVERY_ENABLED`

`PROFESSIONAL_DELIVERY_ENABLED`

`PROFESSIONAL_UPGRADE_ENABLED`

`DELIVERY_TYPE_SWITCHING_ENABLED`

`GENERIC_ERRANDS_ENABLED`

This allows gradual rollout.

---

# PHASE 42 — ROLLOUT STRATEGY

Do not immediately expose everything to everyone.

Recommended rollout:

### Stage 1

Internal testing.

### Stage 2

Admin/test accounts.

### Stage 3

Small group of neighborhood delivery partners.

### Stage 4

Limited geographic area.

### Stage 5

Neighborhood delivery publicly available.

### Stage 6

Professional upgrade.

### Stage 7

Professional customer option.

### Stage 8

Broader geographic expansion.

---

# PHASE 43 — FUTURE GENERIC ERRANDS ARCHITECTURE

Do not fully launch this unless instructed.

But architect the delivery engine so that a future delivery job can be:

```text
FOOD
PACKAGE
ERRAND
SHOPPING
```

The underlying engine should fundamentally understand:

PICKUP

DROP-OFF

DELIVERY PARTNER

DELIVERY TYPE

PRICE

PAYOUT

STATUS

LOCATION

PROOF OF DELIVERY

This allows OyeWell Delivery to eventually become a local logistics marketplace.

---

# PHASE 44 — FINAL ARCHITECTURE

The final system should conceptually be:

```text
                         OYEWELL
                            |
                     SINGLE USER ACCOUNT
                            |
       +--------------------+--------------------+
       |                    |                    |
    CUSTOMER              COOK              DELIVERY
                                                |
                                    +-----------+-----------+
                                    |                       |
                              NEIGHBORHOOD             PROFESSIONAL
                                    |                       |
                              KYC + APPROVAL         KYC + APPROVAL
                                                            |
                                                      VEHICLE CHECK
                                                            |
                                                       INSPECTION
                                                            |
                                                       ADMIN APPROVAL
```

Orders flow through:

```text
CUSTOMER
   |
   v
FOOD DISCOVERY
   |
   v
FOOD ORDER
   |
   v
CHOOSE DELIVERY
   |
   +-------------------------+
   |                         |
   v                         v
NEIGHBORHOOD             PROFESSIONAL
   |                         |
   v                         v
LOCAL DISPATCH          PRO DISPATCH
   |                         |
   +------------+------------+
                |
                v
         DELIVERY PARTNER
                |
                v
             PICKUP
                |
                v
            DELIVERY
                |
                v
        DELIVERY CODE
                |
                v
            COMPLETE
                |
                v
          EARNINGS LEDGER
                |
                v
             WALLET
                |
                v
           WITHDRAWAL
```

---

# PHASE 45 — FINAL SECURITY AUDIT

Before considering the feature complete, inspect every endpoint and action.

Verify:

* authentication
* authorization
* ownership
* KYC
* delivery eligibility
* tier eligibility
* admin restrictions
* wallet authorization
* payout authorization
* order authorization
* location privacy
* chat privacy
* media security
* upload security
* rate limiting
* fraud detection
* concurrency
* idempotency

---

# PHASE 46 — FINAL PRODUCTION AUDIT

Before deployment, verify:

### Existing OyeWell

* authentication works
* customers work
* restaurants work
* cooks work
* existing orders work
* existing riders work
* existing payments work
* existing admin works

### New Neighborhood Delivery

* application
* KYC
* approval
* dashboard
* jobs
* acceptance
* pickup
* delivery
* wallet
* withdrawal

### New Professional Delivery

* upgrade
* KYC
* vehicle
* inspection
* approval
* premium jobs
* neighborhood jobs where enabled

### Customer

* delivery selection
* pricing
* ETA
* tracking
* switching
* completion
* rating

---

# IMPORTANT IMPLEMENTATION BEHAVIOR

At every phase:

1. Inspect existing code.
2. Reuse existing systems.
3. Make the smallest safe change.
4. Implement backend and frontend together where necessary.
5. Update database schema properly.
6. Create migrations.
7. Add tests.
8. Run existing tests.
9. Run new tests.
10. Verify no regression.
11. Report exactly what changed.

---

# DO NOT DO THIS

Do NOT:

* create a second auth system
* create a second user table
* create separate neighborhood users
* create a separate professional user database
* create separate wallets
* create separate orders
* create separate payment systems
* create separate rider apps
* hardcode delivery prices
* hardcode delivery radii
* expose private addresses publicly
* allow unverified users to accept jobs
* let frontend state determine eligibility
* let two riders claim the same delivery
* release earnings before the correct completion state
* make professional status merely a UI badge
* allow a neighborhood-only rider to accept professional jobs
* automatically charge professional pricing when a professional rider takes a neighborhood job
* make the Cook responsible for finding a rider manually
* make the customer coordinate with the rider manually
* destroy existing delivery functionality

---

# FINAL PRODUCT PRINCIPLE

The final experience should be incredibly simple.

A customer thinks:

> "I want my food."

OyeWell asks:

### How would you like it delivered?

**LOCAL & AFFORDABLE**

or

**PROFESSIONAL**

The customer chooses.

OyeWell finds the appropriate delivery partner.

The rider sees:

> **Pick up here → Take here → Earn ₦X**

The rider follows the steps.

The customer receives the food.

The customer gives the code.

The delivery completes.

The rider gets paid.

The Cook gets paid.

OyeWell earns its fee.

---

# THE LARGER OYEWELL VISION

Do not lose sight of what this architecture is becoming.

OyeWell is no longer merely:

"an app where restaurants sell food."

It is becoming:

# A LOCAL FOOD + LOCAL DELIVERY NETWORK

The food can come from:

* restaurants
* OyeWell cooks
* local food creators

The delivery can come from:

* neighborhood delivery partners
* professional delivery partners

And eventually:

* package delivery
* errands
* local shopping
* peer-to-peer local logistics

The critical architecture is therefore:

```text
LOCAL SUPPLY
     +
LOCAL DISCOVERY
     +
LOCAL FULFILLMENT
     +
LOCAL DELIVERY
     +
TRUST
     +
PAYMENTS
```

All under one OyeWell identity.

---

# FINAL INSTRUCTION TO THE IDE AI

DO NOT attempt to implement all phases in one uncontrolled operation.

Work sequentially.

Start with:

## PHASE 1 — FULL CODEBASE AUDIT

Do not modify production behavior during the audit.

After completing the audit, present:

1. Current architecture
2. Existing systems that can be reused
3. Required database changes
4. Required backend changes
5. Required frontend changes
6. Required admin changes
7. Required migration strategy
8. Risks
9. Recommended implementation order

Then proceed phase by phase.

After every phase provide:

### COMPLETED

What was implemented.

### FILES CHANGED

Exact files.

### DATABASE

Models/migrations/indexes changed.

### API

Endpoints/services changed.

### FRONTEND

Screens/components changed.

### REUSED

Existing systems reused.

### TESTS

Tests executed.

### REGRESSIONS

Any existing functionality affected.

### NEXT PHASE

What will be implemented next.

If an existing architecture conflicts with the requirements, DO NOT perform a destructive rewrite.

Stop, explain the conflict, and propose the smallest safe architectural solution.

The objective is not merely to make the feature work.

The objective is to build a **production-grade, scalable, secure, local dual-tier delivery network inside the existing OyeWell ecosystem without breaking anything that already works.**
