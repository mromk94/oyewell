NAME: OYE Well
git repo : https://github.com/mromk94/oyewell.git
Green Build, Your astarting everything.
environment: use docker
deployment destination: render(backend, but Free instances spin down after periods of inactivity. They do not support SSH access, scaling, one-off jobs, or persistent disks, so use the git auto ping service to keep alive in the background), vercel(frontend), i will personally set up git push main will auto push to render and vercel, but for now we doing local, i'll let you know when we go live.)

GOAL: restaurant E-commerce:
 **not a conventional restaurant e-commerce site**, but a highly visual, conversational, almost app-like ordering experience where the food is the hero and the ordering process happens through a smooth progressive modal.

work **in phases**, because trying to build all of this at once is likely to produce duplicated systems, inconsistent state, and weak payment/order logic.

Below is a master prompt you can execute first, followed by **Phase 1 → Phase 8 prompts**. Each phase tells the IDE to inspect what already exists, avoid duplicate architecture, and make only deliberate changes.

---

# MASTER INSTRUCTION — RESTAURANT PLATFORM

You are working as the lead product engineer, senior full-stack architect, UI/UX engineer, database architect, security engineer, and QA engineer for a modern online restaurant ordering platform.

Your job is NOT to blindly generate code.

You must first understand the existing codebase, architecture, database, routing, authentication, styling system, components, APIs, and deployment configuration before making changes.

The goal is to build a premium, modern, highly visual restaurant ordering experience that feels more like a contemporary interactive application than a traditional restaurant website.

## CORE PRODUCT VISION

The platform has two major experiences:

1. PUBLIC CUSTOMER EXPERIENCE
2. ADMIN RESTAURANT MANAGEMENT DASHBOARD

The customer experience should be extremely visual.

Food should be the hero.

The landing page should showcase available food items using large, immersive food photography as backgrounds, with typography and ordering controls layered elegantly over the images.

Each food item should feel like its own visual experience.

The ordering experience should be progressive and conversational rather than sending the customer through many unrelated pages.

The customer should be able to:

* Discover food
* Open a food item
* View its details
* Click a prominent floating/3D Order button
* Configure quantity/variant
* Enter delivery information
* Validate delivery coverage
* Select payment method
* Complete payment
* Receive an order confirmation
* Receive an order/tracking identifier
* Create/login to an account
* Track current orders
* Review previous orders

The entire experience should prioritize:

* Speed
* Clarity
* Visual appeal
* Mobile-first usability
* Accessibility
* Payment reliability
* Order reliability
* Strong error handling
* Minimal unnecessary navigation
* No duplicate systems
* No contradictory state
* No fake payment success
* No unreliable order creation

---

# IMPORTANT ENGINEERING RULES

Before changing anything:

1. Inspect the entire relevant repository.
2. Identify the existing frontend framework.
3. Identify the backend/API architecture.
4. Identify the database and ORM.
5. Identify authentication.
6. Identify existing payment infrastructure.
7. Identify existing storage/image infrastructure.
8. Identify existing admin functionality.
9. Identify existing reusable UI components.
10. Identify existing location/address functionality.
11. Identify existing order/cart/transaction models.
12. Identify existing environment variables.
13. Identify existing tests.

Do NOT create a second implementation of something that already exists.

If an existing system can be extended safely, extend it.

Do not create duplicate:

* Authentication systems
* Payment systems
* User systems
* Order systems
* Wallet/transaction systems
* Address systems
* Admin systems
* Notification systems
* Database models
* API routes
* UI component libraries

Reuse existing infrastructure whenever possible.

If existing implementation is incomplete or flawed, refactor it surgically rather than creating competing implementations.

---

# PRODUCT ARCHITECTURE

The platform should conceptually contain:

PUBLIC

/
├── Landing/Home
├── Food discovery
├── Food item experience
├── Order flow
├── Delivery/address validation
├── Payment
├── Order confirmation
├── Order tracking
├── Login
├── Registration
└── Customer account

CUSTOMER ACCOUNT

/account
├── Profile
├── Current orders
├── Previous orders
├── Order details
├── Delivery information
└── Authentication/session management

ADMIN

/admin
├── Dashboard
├── Food/Menu management
├── Food availability
├── Pricing
├── Ordering unit configuration
├── Delivery zones
├── Payment methods
├── Orders
├── Customers
├── Order status management
├── Restaurant settings
└── Analytics

---

# FOOD SYSTEM

Food items are controlled by administrators.

An administrator should be able to create, edit, publish, unpublish, archive, and temporarily disable food items.

A food item should support:

* Name
* Description
* Hero image
* Additional images if supported
* Active/inactive status
* Availability status
* Ordering unit
* Variants/options
* Pricing
* Inventory/availability
* Display order
* Featured status
* Optional preparation information
* Optional dietary information
* Created timestamp
* Updated timestamp

The public interface should only display food that is currently active and available.

Administrators should be able to temporarily mark an item as unavailable without deleting it.

---

# DYNAMIC ORDERING UNITS

This is a critical part of the system.

The administrator must be able to configure how each food item is sold.

Supported ordering modes:

1. PLATE
2. PORTION
3. PIECE

Do not hard-code the ordering interface around "plates".

The UI must dynamically adapt based on the item's configured ordering mode.

## PLATE

Example:

Food: Egusi Soup

Available options:

1 Liter — ₦X
2 Liters — ₦X
3 Liters — ₦X
5 Liters — ₦X

The admin defines:

* Option label
* Quantity/value
* Price
* Available stock/quantity where applicable
* Availability

The customer selects the desired option and quantity.

Example:

2 × 2 Liter

The system calculates the total dynamically.

## PORTION

Example:

Small Portion — ₦X
Medium Portion — ₦X
Large Portion — ₦X

Admin defines the available portion options and prices.

## PIECE

Example:

Chicken — ₦X per piece

Admin defines:

* Price per piece
* Number of pieces currently available

The customer selects the desired number of pieces.

The system must never allow the customer to order more than available inventory.

---

# PRICING

All totals must be calculated server-side.

The client may display calculated totals for responsiveness, but the backend must independently recalculate and validate:

* Product price
* Variant price
* Quantity
* Delivery fee
* Discounts if introduced
* Taxes if introduced
* Final total

Never trust totals submitted by the browser.

The final payable amount must come from server-side calculation.

Use decimal-safe monetary handling.

Never use floating-point arithmetic for financial calculations if the existing architecture provides a safer money representation.

---

# LANDING PAGE EXPERIENCE

The landing page should be visually exceptional.

Do not make it look like a generic Shopify-style restaurant website.

The design direction should be:

* Premium
* Cinematic
* Modern
* Minimal
* Food-focused
* High contrast
* Responsive
* Mobile-first
* Smooth
* Interactive

Food photography should dominate the visual hierarchy.

Each food card/section should use the food image as a visual background.

Overlay:

* Food name
* Short description
* Price/range where appropriate
* Availability indicator
* Order CTA

The food name should use strong typography.

The order button should be visually prominent.

Consider a floating 3D-inspired button with:

* Depth
* Shadow
* Subtle hover movement
* Press animation
* Soft floating/bouncing motion
* Strong contrast
* Clear "Order" label

Do not overanimate the page.

Animation should feel premium rather than childish.

Respect reduced-motion accessibility preferences.

---

# FOOD DETAIL EXPERIENCE

When the customer selects a food item, present a dedicated immersive experience.

The page should preserve the food image as the visual hero.

The layout should include:

* Large food image
* Food name
* Description
* Availability
* Ordering information
* Pricing
* Order CTA

The Order CTA opens the order configuration interface.

---

# ORDER MODAL

The order configuration should happen inside a large centered modal/sheet rather than forcing the customer through an unnecessarily complicated page sequence.

The modal should have clear progress.

Example:

STEP 1
Configure Order

STEP 2
Delivery

STEP 3
Payment

STEP 4
Confirmation

The customer should always know where they are.

The modal should be responsive.

Desktop:

* Centered large modal
* Strong visual hierarchy
* Background page slightly dimmed
* Food image/context may remain visible

Mobile:

* Use a bottom-sheet/full-screen modal style where appropriate
* Large touch targets
* Easy scrolling
* Sticky summary/CTA where useful

---

# STEP 1 — CONFIGURE ORDER

The interface dynamically adapts to the food item's ordering mode.

If PLATE:

Show available plate/container options.

Example:

1 Liter
2 Liters
3 Liters
5 Liters

Each should show its price.

Allow quantity selection.

Example:

[-] 2 [+]

Display:

Subtotal: ₦X

If PORTION:

Show available portions.

If PIECE:

Show piece selector.

The total should update immediately.

Use smooth number transitions where appropriate.

The primary CTA should clearly indicate the next step.

Example:

"Continue to Delivery"

---

# STEP 2 — DELIVERY INFORMATION

After the customer configures the order, transition to delivery.

Ask for:

* Delivery address
* Phone number

The customer should be able to enter the address clearly.

The system should then validate whether the address falls inside a delivery zone configured by the restaurant administrator.

Do not simply trust a text address.

The architecture should support progressively stronger location validation depending on available services.

At minimum, the system should normalize the address and determine whether it falls inside a configured delivery zone.

If geocoding/maps are available, use them appropriately.

The UI should communicate:

"Checking delivery availability..."

Then:

✓ "Delivery available in your area"

OR

✕ "Sorry, we don't currently deliver to this location."

Do not allow the customer to proceed to payment if the delivery address is outside the permitted delivery area.

Once validated, allow the customer to explicitly "Lock in address".

---

# DELIVERY ZONES

The admin must have powerful delivery-zone configuration.

Support multiple zone types.

Conceptually:

1. CITY
2. AREA
3. RADIUS
4. MAP/POLYGON

Examples:

City:
Lagos

Area:
Ikeja

Radius:
5 km around restaurant location

Polygon:
Administrator draws a delivery boundary on a map.

Each zone should support:

* Name
* Type
* Boundary
* Active/inactive
* Delivery fee
* Optional minimum order
* Optional estimated delivery time

The system should determine which zone applies to a customer.

If multiple zones overlap, establish a deterministic priority system.

The admin should be able to manage these zones visually.

For map-based zones, provide an interactive map interface where the administrator can:

* Set restaurant location
* Create a radius
* Adjust radius
* Draw polygon
* Edit polygon
* Delete polygon
* See approximate covered area

Do not implement a fake map.

Use an actual mapping/geolocation provider where appropriate and structure the system so the provider can be configured through environment variables.

---

# STEP 3 — PAYMENT

Payment methods are controlled by the administrator.

Potential methods:

* Card
* Bank transfer
* Crypto

The admin should be able to enable/disable each method.

The customer should only see enabled payment methods.

Payment architecture must be reliable.

Critical requirements:

* Idempotency
* Payment verification
* Order/payment state consistency
* Duplicate-payment protection
* Webhook handling
* Failed-payment recovery
* Pending-payment handling
* Timeout handling
* Transaction reconciliation

Never mark an order as paid solely because the frontend says payment succeeded.

Payment status must be verified through the trusted payment provider/server-side mechanism.

---

# PAYMENT STATE MACHINE

Design explicit payment states.

For example:

PENDING
PROCESSING
SUCCESS
FAILED
CANCELLED
EXPIRED
REFUNDED

Do not use ambiguous boolean fields such as:

paid = true/false

as the sole source of truth.

The system must be capable of handling:

* User closes payment page
* Network failure
* Payment provider delay
* Payment succeeds but browser loses connection
* Webhook arrives before frontend callback
* Frontend callback arrives before webhook
* Duplicate webhook
* User retries payment
* User refreshes page
* User attempts to pay twice

Payment operations must be idempotent.

If a payment has already succeeded, a retry must not create a second charge.

---

# ORDER STATE MACHINE

Orders should have explicit statuses.

For example:

PENDING_PAYMENT
PAYMENT_PROCESSING
PAID
CONFIRMED
PREPARING
READY_FOR_DISPATCH
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
REFUNDED

The exact statuses can be adjusted to fit the existing architecture.

Admin users should be able to update order status according to valid transitions.

The customer should see human-friendly versions.

Example:

"Your order is being prepared"

rather than:

"PREPARING"

---

# ORDER CREATION

Order creation must be transactional.

The system must ensure:

* Food still exists
* Food is still available
* Selected variant still exists
* Price has not changed unexpectedly
* Requested quantity is valid
* Inventory is sufficient
* Delivery address is valid
* Delivery zone is valid
* Payment state is correct

Do not create an order as successfully paid before trusted payment confirmation.

Use database transactions where necessary.

---

# ORDER CONFIRMATION

After successful payment:

Show a beautiful confirmation experience.

Example:

✓ ORDER CONFIRMED

"Your order is on its way to the kitchen."

Show:

* Order number
* Food ordered
* Quantity
* Delivery address
* Phone number
* Amount paid
* Payment method
* Current order status

Provide a prominent:

"Track Your Order"

button.

---

# CUSTOMER ACCOUNT

Customers should have accounts.

Support:

* Email + password authentication

If an existing authentication system exists, reuse it.

Do not create a second authentication mechanism.

The customer account should provide:

/account

Sections:

* Current Orders
* Order History
* Order Details
* Profile
* Delivery information

The user should be able to see:

CURRENT ORDERS

and

PREVIOUS ORDERS

Each order should have:

* Order number
* Date
* Items
* Amount
* Delivery status
* Payment status
* Tracking status

---

# TRACK ORDER EXPERIENCE

The tracking page should feel like a modern live status experience.

Example:

ORDER #OMK12345

✓ Order placed
✓ Payment confirmed
✓ Restaurant confirmed
● Preparing
○ Ready for dispatch
○ Out for delivery
○ Delivered

The current state should be visually emphasized.

If real-time infrastructure exists, use it.

Otherwise use efficient polling.

Do not constantly hammer the API.

The customer should be able to refresh/re-enter the tracking page and retrieve the authoritative order state.

---

# ADMIN DASHBOARD

Create a dedicated /admin dashboard.

It should not feel like an afterthought.

It should be a professional restaurant operations dashboard.

Main sections:

Dashboard
Menu
Orders
Customers
Delivery
Payments
Settings

---

# ADMIN DASHBOARD — MENU

Admin should be able to:

* Create food
* Edit food
* Delete/archive food
* Publish/unpublish food
* Mark unavailable
* Upload/change images
* Set description
* Set ordering mode
* Configure variants
* Configure prices
* Configure stock
* Set display order
* Feature food

For each food:

Ordering mode:

[ Plate ]
[ Portion ]
[ Piece ]

Then dynamically render the relevant configuration UI.

---

# ADMIN DASHBOARD — ORDER MANAGEMENT

Admin should see:

* New orders
* Active orders
* Completed orders
* Cancelled orders
* Payment state
* Customer
* Delivery address
* Phone
* Items
* Total
* Order timestamp

Provide filters:

* Status
* Payment status
* Date
* Search order number
* Customer

Admin should be able to open an order and update its operational status.

Every status change should be logged.

---

# ADMIN DASHBOARD — PAYMENT METHODS

Admin should be able to configure available payment methods.

Example:

Card
[ ON/OFF ]

Bank Transfer
[ ON/OFF ]

Crypto
[ ON/OFF ]

Do not expose provider secrets in the frontend.

Payment provider configuration belongs securely on the backend.

---

# ADMIN DASHBOARD — DELIVERY

Admin should manage:

* Restaurant location
* Delivery zones
* Delivery fees
* Active/inactive zones
* Radius zones
* Polygon zones
* City/area zones
* Estimated delivery times

The interface should make it easy for a non-technical restaurant operator to understand.

---

# DESIGN SYSTEM

Create a consistent design system.

Define:

* Typography
* Spacing
* Border radius
* Shadows
* Buttons
* Cards
* Modals
* Form fields
* Status indicators
* Toasts
* Loading states
* Empty states
* Error states

Avoid random one-off styling.

Use the project's existing design system if one exists.

The UI should feel coherent across customer and admin experiences.

---

# MOBILE-FIRST

Assume many customers will use mobile devices.

The customer experience must work exceptionally well on:

* Android Chrome
* iPhone Safari
* Mobile Safari/PWA if applicable
* Desktop browsers

Touch targets must be sufficiently large.

Do not rely exclusively on hover.

Do not create desktop-only interactions.

---

# PERFORMANCE

Optimize:

* Food image loading
* Image dimensions
* Lazy loading
* Responsive images
* Modal performance
* API calls
* Map loading
* Payment initialization
* Order tracking

The landing page should feel fast despite being image-heavy.

Use appropriate image optimization.

Do not load every large food image at full resolution immediately.

---

# SECURITY

Treat all customer input as untrusted.

Protect:

* Admin routes
* Customer accounts
* Payment APIs
* Order APIs
* Delivery validation
* Price calculations
* Inventory
* Webhooks

Never trust:

* Client price
* Client payment status
* Client delivery eligibility
* Client inventory
* Client order status
* Client user ID

Validate everything server-side.

Admin operations must require proper authorization.

---

# OBSERVABILITY

Important operations should be logged.

Especially:

* Order creation
* Payment initialization
* Payment verification
* Payment webhook
* Payment failure
* Payment success
* Order status changes
* Inventory changes
* Delivery-zone changes
* Admin actions

Do not log sensitive payment information or passwords.

---

# ERROR UX

Every important operation needs graceful failure states.

Examples:

Payment failed:

"Your payment wasn't completed. No order has been charged twice. You can try again."

Network failure:

"We're having trouble connecting. Your order status has not been lost."

Delivery unavailable:

"We don't currently deliver to this location."

Food became unavailable:

"Sorry, this item just became unavailable. Please choose another option."

Never show raw stack traces to customers.

---

# TESTING

Before considering a phase complete, test:

* Mobile
* Desktop
* Authentication
* Food browsing
* Ordering
* Variant selection
* Quantity changes
* Price calculation
* Inventory
* Delivery validation
* Payment
* Payment retry
* Duplicate payment protection
* Order creation
* Order tracking
* Admin menu management
* Admin delivery zones
* Admin payment settings

Create or update automated tests where the existing project supports them.

---

# MOST IMPORTANT RULE

DO NOT attempt to build the entire platform in one uncontrolled operation.

Work in clearly separated phases.

At the beginning of every phase:

1. Inspect existing implementation.
2. Identify what already exists.
3. Identify dependencies.
4. Identify conflicts.
5. Create a concise implementation plan.
6. Implement only that phase.
7. Run tests/type checks/lint/build as applicable.
8. Inspect the resulting implementation.
9. Fix issues introduced by the phase.
10. Report exactly what changed.

Do not silently implement future phases.

Do not create placeholder systems that will later conflict with the real implementation.

Build the foundation correctly first.

---

# PHASE 1 — CODEBASE AUDIT + ARCHITECTURE

Paste this first.

## PHASE 1 — DEEP CODEBASE AUDIT AND ARCHITECTURE PLAN

Do NOT start building UI yet.

Your task in this phase is to deeply inspect the existing repository and establish the correct architecture for the restaurant platform described in the master specification.

Inspect:

* Frontend
* Backend
* Database
* ORM
* Authentication
* Existing user model
* Existing admin model
* Existing payment integrations
* Existing order/cart functionality
* Existing file/image upload system
* Existing map/location functionality
* Existing API architecture
* Existing environment variables
* Existing reusable components
* Existing styling/design system
* Existing testing infrastructure
* Existing deployment configuration

Search the repository thoroughly rather than assuming filenames.

Identify existing functionality that can be reused.

Identify functionality that needs extension.

Identify functionality that is missing.

Identify potentially conflicting or duplicate implementations.

Then produce:

### 1. Current architecture map

Explain:

Frontend:
Backend:
Database:
Authentication:
Payments:
Storage:
Maps:
Admin:
Testing:

### 2. Existing reusable systems

List the systems/components/services that should be reused.

### 3. Required database changes

Design the minimum database changes required for:

Food
Food variants/options
Ordering modes
Inventory/availability
Orders
Order items
Delivery zones
Addresses
Payments
Payment attempts
Order status history
Customer accounts

Do NOT modify the database yet unless absolutely necessary for the existing architecture.

### 4. State machines

Define:

Order state machine

Payment state machine

Food availability state

Delivery validation state

### 5. API architecture

Propose the API endpoints/services needed.

### 6. Frontend route architecture

Propose customer and admin routes.

### 7. Risks

Identify:

* Payment risks
* Duplicate order risks
* Duplicate payment risks
* Inventory race conditions
* Authentication risks
* Delivery validation risks
* Existing architecture conflicts

### 8. Implementation sequence

Break the project into safe implementation phases.

Do not write major feature code in this phase.

The objective is architectural understanding before implementation.

---

# PHASE 2 — DATABASE + BACKEND FOUNDATION

## PHASE 2 — RESTAURANT DOMAIN MODEL AND BACKEND FOUNDATION

Now implement only the backend/data foundation identified during Phase 1.

Do not build the full frontend yet.

Before coding, reread the existing implementation and verify that no duplicate models/services already exist.

Implement the restaurant domain model required for:

### FOOD

Food item

Fields should conceptually support:

* id
* name
* description
* hero image
* status
* availability
* featured
* display order
* createdAt
* updatedAt

### ORDERING MODES

Support:

PLATE
PORTION
PIECE

Do not hard-code these into UI logic.

### FOOD OPTIONS

Each food can have multiple configurable selling options.

Examples:

Plate:
1 Liter
2 Liters
3 Liters
5 Liters

Portion:
Small
Medium
Large

Piece:
Single piece
etc.

Each option should support:

* Label
* Value/measurement where applicable
* Price
* Availability
* Inventory where applicable

### ORDERS

Implement proper order entities.

An order must retain a historical snapshot of what the customer actually purchased.

Do not rely on the current food price after the order has been created.

An order item should preserve:

* Food name at purchase
* Selected option
* Unit price
* Quantity
* Total
* Ordering mode

### DELIVERY

Implement:

Customer delivery address
Phone number
Delivery zone

### PAYMENTS

Implement payment records independently from orders.

Support:

* Payment status
* Provider
* Provider reference
* Amount
* Currency
* Payment attempt identifier
* Timestamps

Design for idempotency.

### ORDER STATUS HISTORY

Record order status transitions.

Every operational status change should be auditable.

### IMPORTANT

Use database transactions where appropriate.

Protect against:

* Overselling inventory
* Duplicate order creation
* Duplicate payment records
* Race conditions

Run migrations safely.

Run:

* Type checking
* Lint
* Tests
* Build

Fix all issues caused by this phase before finishing.

Do not build the customer UI yet.

---

# PHASE 3 — PREMIUM CUSTOMER LANDING PAGE

## PHASE 3 — PREMIUM CUSTOMER FOOD EXPERIENCE

Now build the public customer-facing restaurant experience.

Focus ONLY on the visual discovery experience and food presentation.

Do not implement payment yet.

Build:

/

and the food-detail experience.

The visual direction:

PREMIUM
CINEMATIC
MODERN
MINIMAL
MOUTH-WATERING
MOBILE-FIRST

The food must be the visual hero.

## LANDING PAGE

Create a large immersive food showcase.

Food items should use their images as large visual backgrounds.

Overlay:

Food name
Short description
Availability
Ordering information
Prominent Order button

Avoid generic rectangular e-commerce cards.

Consider:

* Full-screen sections
* Large editorial cards
* Horizontal snap scrolling on mobile
* Smooth transitions
* Layered typography
* Subtle image zoom
* Gradient overlays for readability
* Floating CTA

The exact layout should follow the existing project's design language where appropriate.

## ORDER BUTTON

Create a premium floating/3D-inspired Order button.

It should have:

* Depth
* Shadow
* Subtle floating motion
* Press feedback
* Hover feedback on desktop
* Strong accessibility
* Large touch target

It should NOT feel like a children's interface.

Think premium digital restaurant/app experience.

Respect prefers-reduced-motion.

## FOOD DETAIL

Clicking a food item should open its dedicated experience/page.

Display:

* Hero food photography
* Name
* Description
* Availability
* Ordering information
* Order CTA

The customer should immediately understand what they are ordering.

## IMPORTANT

Use real backend data.

Do not hard-code menu items.

If there are no food items, create an elegant empty state rather than fake data.

Do not implement the full checkout yet.

Run the application and inspect it visually.

Fix responsive problems before finishing this phase.

---

# PHASE 4 — DYNAMIC ORDERING MODAL

## PHASE 4 — DYNAMIC FOOD ORDER CONFIGURATION

Now implement the ordering modal/sheet.

Clicking "Order" must open a premium centered modal on desktop and an appropriate full-screen/bottom-sheet experience on mobile.

The modal is the beginning of the customer's ordering journey.

## PROGRESS

Show:

1. Order
2. Delivery
3. Payment
4. Confirmation

The customer must always understand their current step.

## STEP 1 — ORDER CONFIGURATION

The UI must dynamically inspect the food item's ordering mode.

### PLATE

Show the options configured by the admin.

Example:

1 Liter — ₦X
2 Liters — ₦X
3 Liters — ₦X
5 Liters — ₦X

Customer selects:

Option
Quantity

Example:

2 × 2 Liter

### PORTION

Show:

Small — ₦X
Medium — ₦X
Large — ₦X

Customer selects quantity.

### PIECE

Show:

Price per piece

Customer chooses quantity.

Do not allow quantity above available inventory.

## LIVE TOTAL

The UI must update immediately.

Example:

2 × ₦5,000

Subtotal:
₦10,000

But remember:

The frontend total is only a display.

The backend must recalculate the final amount.

## UX

Make quantity controls excellent.

Use:

[-] quantity [+]

Avoid tiny controls.

Use smooth transitions.

Keep the total visually prominent.

The primary button should be:

"Continue to Delivery"

Do not allow progression unless the selection is valid.

## IMPORTANT

Do not create separate duplicated order components for plate, portion, and piece.

Create a reusable dynamic ordering engine/component that receives the product configuration and renders the correct controls.

Run tests for:

* Plate
* Portion
* Piece
* Quantity
* Inventory
* Price calculation
* Unavailable items

Do not implement payment yet.

---

# PHASE 5 — DELIVERY + GEO-FENCING

## PHASE 5 — DELIVERY INFORMATION AND DELIVERY-ZONE VALIDATION

Now implement the delivery stage.

The customer should enter:

1. Delivery address
2. Phone number

After entering the address, provide:

"Check delivery availability"

The system should determine whether the address is inside an active delivery zone configured by the restaurant.

## DELIVERY VALIDATION

The architecture must support:

CITY
AREA
RADIUS
POLYGON/MAP

The backend must be the authoritative validator.

Do not trust a frontend-only check.

## FLOW

Customer enters:

Address
Phone

↓

Check delivery availability

↓

System normalizes/geocodes/validates address as appropriate

↓

Determine matching delivery zone

↓

If unavailable:

"Sorry, we don't currently deliver to this location."

Do not allow payment.

If available:

"✓ Delivery available"

Show:

* Delivery zone
* Delivery fee
* Estimated delivery time where configured

Then provide:

"Lock in address"

## ADMIN DELIVERY ZONES

Implement the backend/admin foundation required to manage zones.

Admin should eventually be able to:

* Set restaurant location
* Create city zone
* Create area zone
* Create radius zone
* Draw polygon
* Edit polygon
* Delete zone
* Enable/disable zone
* Set delivery fee
* Set estimated delivery time

Use an actual map provider if the project already has one.

If no provider exists, architect the map integration cleanly rather than building a fake map.

Keep provider keys server-side where appropriate.

## IMPORTANT

Delivery eligibility must be reproducible on the backend.

The order should store the delivery-zone decision used at checkout so that later changes to zones do not rewrite historical orders.

Test:

* Address inside zone
* Address outside zone
* Overlapping zones
* Disabled zone
* Invalid address
* Missing phone
* Missing address
* Network failure

---

# PHASE 6 — PAYMENT ENGINE

## PHASE 6 — RELIABLE PAYMENT SYSTEM

Now implement the payment layer.

This is a high-risk area.

Do not optimize for speed of coding.

Optimize for correctness.

First inspect existing payment infrastructure and reuse it where possible.

Admin-configurable methods:

CARD
BANK TRANSFER
CRYPTO

Only enabled methods should appear to customers.

## PAYMENT ARCHITECTURE

Implement a proper payment lifecycle.

Example:

PENDING
PROCESSING
SUCCESS
FAILED
CANCELLED
EXPIRED
REFUNDED

Do not rely on:

paid = true

as the only payment state.

## IDEMPOTENCY

Every payment initiation should be idempotent.

If the customer:

* double-clicks
* refreshes
* loses connection
* returns to the page
* retries

the system must not accidentally charge them twice.

## PAYMENT VERIFICATION

Never trust:

"paymentSuccessful: true"

from the browser.

Verify payment through the trusted payment provider/backend mechanism.

Use webhooks where supported.

Webhook processing must also be idempotent.

If the webhook arrives twice, the system must remain correct.

If the frontend callback arrives first, the system must remain correct.

If the webhook arrives first, the system must remain correct.

## FAILURE RECOVERY

Handle:

Payment failed
Payment pending
Payment successful but frontend disconnected
Payment successful but webhook delayed
User closes browser
User retries
Provider timeout

The customer should be able to safely return and see the authoritative payment state.

## ADMIN

Implement payment method configuration.

Admin can enable/disable:

Card
Bank Transfer
Crypto

Never expose secret credentials in frontend code.

Run extensive tests before finishing this phase.

---

# PHASE 7 — ORDER CREATION + TRACKING

## PHASE 7 — ORDER FINALIZATION, CONFIRMATION AND TRACKING

Now connect:

Food configuration
+
Delivery
+
Payment
+
Order creation

into one reliable flow.

## FINAL ORDER VALIDATION

Immediately before creating/finalizing the order, the backend must revalidate:

* Food exists
* Food is active
* Food is available
* Selected option exists
* Price is current
* Quantity is valid
* Inventory is sufficient
* Delivery address is valid
* Delivery zone is valid
* Payment state is valid

Never rely exclusively on previous frontend state.

## ORDER CREATION

Use an appropriate database transaction.

Create:

Order
Order items
Delivery information
Payment association

in a consistent state.

The order must preserve the historical price and product information.

## CONFIRMATION

After successful payment/order creation:

Show a premium confirmation screen.

Example:

✓

ORDER CONFIRMED

"Your order has been received."

Show:

Order number
Items
Amount
Delivery address
Phone
Payment method
Order status

Primary CTA:

"Track Your Order"

## CUSTOMER ACCOUNT

Implement/reuse email/password authentication.

Customers should be able to:

Register
Login
Logout
Reset password where infrastructure exists

Do not create duplicate authentication.

## TRACKING

Create a customer-specific tracking page.

Display:

✓ Order placed
✓ Payment confirmed
✓ Restaurant confirmed
● Preparing
○ Ready for dispatch
○ Out for delivery
○ Delivered

Highlight current status.

Use real order data.

Do not expose another user's order.

Authorization must be enforced server-side.

## ORDER HISTORY

Customer account should show:

Current orders
Previous orders

Each order should show:

Order number
Date
Items
Amount
Status
Payment status

Run authorization tests to ensure users cannot access another user's order.

---

# PHASE 8 — ADMIN DASHBOARD

## PHASE 8 — COMPLETE RESTAURANT ADMIN DASHBOARD

Now build the /admin experience.

The dashboard should be a professional restaurant operations system.

Do not make it look like a generic CRUD panel.

## DASHBOARD

Show useful operational information:

* Active orders
* New orders
* Orders preparing
* Orders out for delivery
* Completed orders
* Revenue where available
* Popular food items
* Availability warnings

Do not invent analytics that the database cannot support.

## MENU

Admin can:

Create
Edit
Archive
Publish
Unpublish
Mark unavailable
Upload images
Set prices
Set ordering mode
Set variants
Set inventory
Set display order
Feature items

## DYNAMIC ORDER CONFIGURATION

The admin should choose:

PLATE
PORTION
PIECE

Then the interface dynamically changes.

For PLATE:

Admin can create:

1 Liter
2 Liter
3 Liter
5 Liter

with prices.

For PORTION:

Small
Medium
Large

with prices.

For PIECE:

Price per piece
Available quantity

Do not make the admin manually edit JSON unless absolutely necessary.

The UI should be friendly to restaurant operators.

## ORDERS

Create an order-management interface.

Show:

Order number
Customer
Items
Total
Payment status
Order status
Delivery location
Phone
Timestamp

Filters:

Status
Payment
Date
Search

Admin can open an order and update valid operational statuses.

Every change must be logged.

## DELIVERY

Build delivery-zone management.

Support:

City
Area
Radius
Polygon

Provide map-based interaction where appropriate.

## PAYMENTS

Allow admin to enable/disable:

Card
Bank transfer
Crypto

Do not expose provider secrets.

## SETTINGS

Restaurant settings should include:

Restaurant name
Logo
Contact information
Restaurant location
Currency
Delivery configuration
Payment configuration

Respect the existing architecture and avoid duplicating configuration systems.

Test admin authorization carefully.

---

# PHASE 9 — HARDENING, SECURITY, PAYMENTS & UX

## PHASE 9 — PRODUCTION HARDENING AND FULL SYSTEM AUDIT

The platform is now feature-complete.

Do NOT add major new features.

Perform a complete production-readiness audit.

## SECURITY

Audit:

Authentication
Authorization
Admin access
Order ownership
Payment endpoints
Payment webhooks
Price manipulation
Inventory manipulation
Delivery manipulation
Input validation
Rate limiting
CSRF where applicable
XSS
SQL injection
Sensitive logging
Secret exposure

Attempt to identify realistic attack paths.

Fix vulnerabilities surgically.

## PAYMENT AUDIT

Test:

Double click payment
Refresh during payment
Close browser
Network failure
Webhook duplication
Frontend callback duplication
Retry after success
Payment pending
Payment failure
Provider timeout

Confirm:

ONE payment cannot create TWO successful charges.

ONE payment cannot create TWO orders.

A successful payment cannot be lost because the browser disconnected.

## ORDER AUDIT

Test:

Inventory race
Food becomes unavailable
Price changes during checkout
Variant becomes unavailable
Delivery zone changes
User refresh
User logs out
User logs into another account

## UX AUDIT

Test:

Mobile Android
Mobile iPhone
Desktop
Slow network
Small screen
Large screen
Reduced motion
Keyboard navigation

Look for:

Tiny buttons
Overflow
Modal problems
Keyboard issues
Unreadable text
Poor contrast
Slow interactions
Unexpected scrolling
Broken animations

## PERFORMANCE

Audit:

Images
API requests
Database queries
N+1 queries
Map loading
Payment loading
Tracking polling
Bundle size

Optimize only where justified.

## FINAL BUILD

Run:

Lint
Type checking
Unit tests
Integration tests
End-to-end tests where available
Production build

Fix all errors.

Then produce a final architecture report explaining:

What was implemented
What existing systems were reused
Database changes
API changes
Authentication
Payment architecture
Delivery architecture
Admin architecture
Testing completed
Remaining risks
Recommended next steps

Do not create unnecessary refactors merely for the sake of changing code.

---

## One important design decision I'd make

I would **not** make the customer experience literally "a page per food" in the traditional sense if you want this to feel modern.

I'd architect the food catalogue so every food **has its own canonical URL**, for example:

`/food/egusi-soup`

but the landing page can behave almost like a cinematic interactive menu.

That gives you both:

**Discovery experience**
→ immersive visual scrolling/swiping

and

**Individual food experience**
→ dedicated URL, SEO, sharing, deep linking, etc.

Then:

**Order**
→ modal/sheet

**Delivery**
→ same progressive checkout experience

**Payment**
→ same flow

**Confirmation**
→ tracking

That will feel much more like a modern food application than a conventional restaurant website.
