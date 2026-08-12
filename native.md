# OMK FOOD MARKETPLACE

# NATIVE iOS + ANDROID APPLICATION IMPLEMENTATION

## Customer + Cook + Rider + Management/Moderation

NOTE: DEVELOP AS A SINGLE APP(look at the xisting system setup)

### Master Multi-Phase Implementation Prompt

You are working on an existing, fully functioning food marketplace platform.

The web application is already operational.

The PWA is already functional.

The backend, authentication, ordering system, payment system, wallet/balance system, vendor/cook system, rider system, notifications, administration, moderation, delivery orchestration, verification-code workflows and other marketplace capabilities already exist.

Your job is NOT to build a new marketplace.

Your job is to build the **native iOS and Android application layer for the existing marketplace**.

The mobile application must expose everything that already exists on the web/PWA, while improving the experience with capabilities that are especially appropriate for mobile.

---

# 0. CORE PRODUCT PRINCIPLE

The mobile apps must feel like:

**THE SAME PRODUCT — NOW NATIVE.**

They must NOT look like:

* a different company
* a redesigned brand
* a generic food-delivery template
* a stripped-down version of the website
* a WebView wrapper
* a completely separate application

The existing website/PWA's:

* branding
* typography
* colors
* visual language
* cards
* buttons
* spacing
* icons
* imagery
* navigation concepts
* terminology
* status indicators
* information hierarchy

must remain visually recognizable.

However, the mobile application should improve where native mobile UX provides a clear advantage.

Examples:

* bottom navigation
* native gestures
* native sheets
* push notifications
* location services
* camera
* photo upload
* document upload
* biometric authentication where appropriate
* deep links
* background notification handling
* native share
* native permission flows
* mobile-friendly maps
* location tracking
* camera-based verification where appropriate
* offline/reconnect handling
* app lifecycle handling

The mobile app should feel like the **native evolution of the existing website**, not a redesign of the brand.

---

# 1. ABSOLUTE RULE — AUDIT FIRST

DO NOT immediately start writing mobile screens.

First inspect the entire existing project.

You must understand:

* frontend architecture
* backend architecture
* API architecture
* authentication
* authorization
* user roles
* permissions
* database models
* order lifecycle
* payment lifecycle
* wallet/balance architecture
* notifications
* delivery architecture
* rider architecture
* cook/vendor architecture
* management architecture
* moderation architecture
* existing PWA
* responsive website
* existing design system
* existing components
* existing assets
* existing icons
* existing images
* existing API clients
* existing state management
* existing caching
* existing real-time communication
* WebSockets
* Redis/event systems
* push notification infrastructure
* file uploads
* location services
* authentication sessions
* deep linking
* route structure

---

# 2. DO NOT CREATE PARALLEL BUSINESS LOGIC

This is extremely important.

The mobile app should NOT independently implement:

* payment calculations
* order status transitions
* vendor acceptance logic
* rider assignment
* delivery state transitions
* wallet calculations
* commission calculations
* payout calculations
* authentication rules
* verification rules
* payment verification
* delivery-code validation
* pickup-code validation
* permissions
* moderation rules

Those belong to the backend.

The mobile app is a client.

The architecture should be:

MOBILE APP
↓
API / REAL-TIME SERVICES
↓
EXISTING BACKEND
↓
DATABASE / EXISTING INFRASTRUCTURE

Do not move server business logic into the mobile application.

---

# 3. FIRST TASK — CREATE A COMPLETE MOBILE GAP ANALYSIS

Before implementing anything, inspect the web/PWA.

Create a complete inventory of every existing screen and capability.

Organize it by role.

## CUSTOMER

Find everything currently available to customers, including:

* registration
* login
* logout
* password reset
* email verification
* phone verification
* profile
* account settings
* location
* addresses
* food discovery
* home
* explore
* search
* categories
* cooks
* restaurants
* menus
* food details
* cart
* checkout
* delivery options
* payment
* manual payment
* payment proof
* payment history
* order tracking
* order history
* order details
* delivery tracking
* delivery code
* notifications
* wallet/balance
* deposits
* transactions
* refunds
* support
* disputes
* favorites
* reviews
* ratings
* promotions
* referrals
* account/security
* any other existing customer feature

Do not assume this list is complete.

Discover the actual system.

---

# 4. COOK/VENDOR GAP ANALYSIS

Inventory every cook/vendor capability.

Including:

* cook registration
* onboarding
* KYC
* verification
* profile
* business profile
* kitchen information
* operating hours
* availability
* menu management
* food creation
* food editing
* pricing
* inventory if present
* order management
* order acceptance
* preparation
* ready-for-pickup
* rider interaction
* pickup verification
* notifications
* earnings
* wallet
* balances
* transactions
* payouts
* commission
* analytics
* reviews
* customer information where appropriate
* support
* disputes
* account settings
* availability toggle
* pause/suspend functionality
* any existing vendor tools

Everything available on web should be accounted for.

---

# 5. RIDER GAP ANALYSIS

Inventory every rider capability.

Including:

* rider registration
* onboarding
* KYC
* verification
* profile
* vehicle information
* availability
* online/offline
* location permissions
* open deliveries
* delivery acceptance
* delivery details
* vendor pickup location
* navigation
* arrival at pickup
* pickup verification
* pickup code
* trip start
* live trip
* customer location
* arrival
* delivery verification
* delivery code
* completion
* earnings
* wallet
* balances
* transactions
* payouts
* delivery history
* notifications
* support
* disputes
* account settings
* rider status
* pause/ban state
* any other existing rider functionality

---

# 6. MANAGEMENT / ADMIN / MODERATION

There must be a mobile management application experience.

Do not assume that management means only a simplified dashboard.

Inventory:

* admin dashboard
* moderation dashboard
* user management
* customer management
* cook management
* restaurant management
* rider management
* KYC review
* payment review
* manual payment approval
* orders
* delivery monitoring
* disputes
* support tickets
* reports
* moderation
* suspensions
* bans
* fraud/risk signals
* notifications
* platform metrics
* financial monitoring
* transaction monitoring
* wallet monitoring
* operational overrides
* audit logs
* regional moderation
* permissions
* staff roles
* staff-specific capabilities

Management should only see functionality permitted by their role.

---

# 7. ROLE ARCHITECTURE

Do NOT create four completely separate apps unless the existing architecture requires it.

Prefer one application with role-aware experiences if the existing authentication model supports it.

Possible experience:

USER LOGS IN
↓
BACKEND RETURNS AUTHENTICATED USER + ROLES
↓
APP DETERMINES PERMITTED EXPERIENCE
↓
CUSTOMER / COOK / RIDER / MANAGEMENT

If a user has multiple roles, the app should support safe role switching where the existing backend permissions allow it.

Example:

Customer
↕
Cook

or:

Customer
↕
Rider

or:

Management role

Do not assume users have only one role.

---

# 8. TECHNOLOGY DECISION

First inspect the existing mobile codebase.

If a mobile project already exists:

DO NOT replace it.

Audit it.

If the existing mobile architecture is Flutter and is appropriate for both platforms, continue using Flutter.

If native projects already exist:

* preserve them
* determine what is already implemented
* extend them surgically

If no mobile implementation exists, choose the technology that best fits the existing architecture and requirements for:

* iOS
* Android
* push notifications
* camera
* location
* background execution
* maps
* deep linking
* secure storage
* native lifecycle

Do not introduce unnecessary technologies.

The final implementation must produce proper:

* iOS application
* Android application

and must not simply wrap the PWA.

---

# 9. PWA AS FUNCTIONAL REFERENCE

The existing PWA is extremely important.

Use it as the primary reference for:

* feature parity
* flows
* content
* business rules
* navigation concepts
* branding
* component behavior
* existing terminology
* existing status labels
* existing forms
* existing user journeys

However:

DO NOT simply embed the PWA inside a WebView.

The native app should communicate directly with the backend APIs and existing services.

---

# 10. DESIGN PARITY

The app must look recognizably identical to the website.

Before creating mobile UI, extract the existing design system.

Identify:

* primary colors
* secondary colors
* backgrounds
* typography
* font weights
* border radii
* shadows
* cards
* buttons
* input fields
* chips
* badges
* status colors
* icons
* spacing
* image ratios
* navigation
* modal styles
* bottom sheets
* loading states
* empty states
* error states

Create a reusable mobile design system from these values.

DO NOT allow every screen to invent its own styling.

---

# 11. MOBILE ADAPTATION

"Same design" does NOT mean literally copying desktop dimensions.

Adapt the existing visual language to mobile.

For example:

Website:
horizontal navigation

Mobile:
bottom navigation or appropriate mobile navigation

Website:
large desktop modal

Mobile:
native bottom sheet

Website:
hover interaction

Mobile:
tap/gesture interaction

Website:
desktop sidebar

Mobile:
drawer/tab/sheet where appropriate

Website:
large data table

Mobile:
cards + filters + drill-down

The visual identity remains the same.

The interaction model becomes mobile-native.

---

# 12. PHASE 1 — PROJECT & ARCHITECTURE AUDIT

Before coding:

inspect the repository.

Produce:

## A. Mobile project status

* existing iOS code
* existing Android code
* existing Flutter code if any
* package configuration
* dependencies
* build system
* signing configuration
* environments

## B. Backend API inventory

Map every API needed by:

Customer
Cook
Rider
Management

## C. Authentication inventory

Map:

* login
* registration
* verification
* refresh tokens
* logout
* password reset
* sessions
* role detection
* MFA if present
* failed-login handling
* failed-registration handling
* device/session tracking
* account lockout
* security checks

## D. Feature parity inventory

Create a checklist of every web feature and its mobile equivalent.

Do not proceed until this map exists.

---

# 13. PHASE 2 — APP FOUNDATION

Create the shared foundation.

Implement:

* app shell
* environment configuration
* API client
* authentication client
* secure token storage
* refresh-token handling
* HTTP error handling
* network detection
* retry strategy
* global state
* caching
* image loading
* file uploads
* navigation
* deep linking
* universal links/app links
* push notification infrastructure
* analytics hooks if already present
* logging
* crash reporting integration if already present
* permissions framework

All should use existing backend conventions.

---

# 14. AUTHENTICATION — COMPLETE PARITY

Authentication must be treated as a major subsystem.

Implement every existing authentication flow.

At minimum investigate:

* registration
* login
* logout
* password reset
* email verification
* phone verification
* OTP
* session refresh
* expired token
* revoked session
* failed login
* failed registration
* account lock
* suspicious activity
* device/session management
* role detection
* onboarding state
* incomplete profile
* KYC state
* suspended user
* banned user

The app must never trap users in an invalid authentication state.

---

# 15. AUTH STATE MACHINE

Implement a clean authentication state.

Examples:

UNKNOWN
↓
CHECKING_SESSION
↓
AUTHENTICATED
or
UNAUTHENTICATED

Additional states where needed:

EMAIL_VERIFICATION_REQUIRED
PHONE_VERIFICATION_REQUIRED
PROFILE_INCOMPLETE
KYC_REQUIRED
ACCOUNT_SUSPENDED
ACCOUNT_BANNED

Do not create duplicate authentication state systems.

---

# 16. SECURE STORAGE

Sensitive authentication information must use platform-secure storage.

Do not store sensitive tokens in:

* plain preferences
* unencrypted files
* arbitrary local storage

Use:

iOS Keychain
Android Keystore-backed secure storage
or the equivalent secure abstraction of the chosen framework.

---

# 17. CUSTOMER APPLICATION

Build the complete customer experience.

The home screen should closely match the existing PWA.

Include all existing sections.

Do not remove web functionality merely because mobile screen space is smaller.

---

# 18. CUSTOMER DISCOVERY

Implement:

* home
* explore
* food discovery
* cooks
* restaurants
* categories
* search
* filters
* food details
* cook details
* restaurant details
* recommendations where already present
* favorites
* promotions

Maintain existing visual hierarchy.

---

# 19. CUSTOMER CART

Implement full cart parity.

Support:

* adding items
* quantities
* variations
* notes
* vendor restrictions
* delivery options
* pricing
* discounts
* fees
* totals
* validation
* checkout

All final calculations must come from backend-authoritative values.

---

# 20. CUSTOMER CHECKOUT

Implement:

* delivery address
* location
* delivery method
* payment method
* order summary
* fees
* discounts
* wallet/balance
* payment gateway
* manual payment
* proof upload
* payment status

Do not calculate financial totals independently in a way that can contradict backend values.

---

# 21. CUSTOMER WALLET / BALANCE

This is mandatory.

Audit every existing balance type.

Do not assume there is only one balance.

Map the existing:

* wallet
* cash balance
* deposit balance
* promotional balance
* earnings where applicable
* transaction ledger
* pending balance
* available balance
* withdrawable balance
* non-withdrawable balance
* any other financial account

The mobile app must display the exact same authoritative balances as web.

Never calculate balances locally.

Backend remains authoritative.

---

# 22. CUSTOMER TRANSACTIONS

Implement:

* transaction history
* transaction details
* payment records
* deposits
* refunds
* withdrawals if applicable
* pending transactions
* failed transactions
* successful transactions

Use the existing transaction architecture.

---

# 23. PAYMENT METHODS

Support the same payment methods available on web.

Including where configured:

* manual payment
* Paystack
* Flutterwave
* Stripe
* wallet/balance

Do not create a mobile-only payment system.

The mobile app must call the same backend payment architecture.

---

# 24. MANUAL PAYMENT

Implement the complete existing manual payment flow.

Customer:

1. selects manual payment
2. receives payment instructions
3. completes payment externally
4. uploads proof
5. submits
6. sees pending review
7. receives confirmation/rejection
8. order automatically progresses when approved

Do not expose admin controls to customer.

---

# 25. ORDER TRACKING

This must be excellent on mobile.

Customer should see real-time progression:

Payment
↓
Vendor accepted
↓
Preparing
↓
Food ready
↓
Rider assigned
↓
Pickup
↓
In transit
↓
Arriving
↓
Delivered

Use the existing backend event system.

Do not create a second order state machine.

---

# 26. REAL-TIME MOBILE SYNCHRONIZATION

Use the existing real-time infrastructure.

The mobile application should support:

* WebSockets
* Socket.IO
* SSE
* push notifications
* polling fallback
* reconnect synchronization

based on what the backend already uses.

When the app reconnects:

FETCH AUTHORITATIVE STATE.

Do not assume the app received every event.

---

# 27. PUSH NOTIFICATIONS

Implement complete push notifications.

Audit the existing notification infrastructure.

Support:

* iOS APNs
* Android FCM
* token registration
* token refresh
* multiple devices
* logout
* notification preferences
* deep links
* foreground notifications
* background notifications
* terminated-app notifications

Notification tap should take the user directly to the relevant object.

Examples:

Order notification
→ Order details

Payment notification
→ Payment/order

Delivery notification
→ Delivery tracking

New vendor order
→ Vendor order

New rider delivery
→ Delivery details

Management alert
→ Relevant management screen

---

# 28. NOTIFICATION CONSISTENCY

Push notifications must not become the source of truth.

Notification says:

"Rider assigned"

The app must fetch the actual authoritative order state.

Never mutate critical state solely because a notification was received.

---

# 29. COOK APPLICATION

Build the full cook/vendor experience.

Include:

* dashboard
* orders
* new orders
* order details
* accept
* reject if permitted
* preparation
* ready
* pickup
* rider interaction
* verification
* menu
* food management
* pricing
* availability
* business profile
* earnings
* wallet
* transactions
* payouts
* notifications
* analytics
* support
* settings

---

# 30. COOK ORDER FLOW

The mobile cook app must support the exact backend workflow:

PAYMENT CONFIRMED
↓
ORDER RECEIVED
↓
COOK ACCEPTS
↓
PREPARING
↓
READY FOR PICKUP
↓
RIDER ASSIGNED
↓
RIDER ARRIVES
↓
PICKUP CODE VERIFICATION
↓
PACKAGE HANDED OVER

No Admin involvement in the normal path.

---

# 31. RIDER APPLICATION

The rider app should be the most mobile-native experience.

Prioritize:

* location
* maps
* open deliveries
* route information
* pickup
* navigation
* delivery
* verification
* earnings
* availability

---

# 32. RIDER ONLINE/OFFLINE

Implement clear rider status:

OFFLINE
ONLINE / AVAILABLE
BUSY
PAUSED
SUSPENDED

Use the existing backend state.

The rider must not appear available merely because the app UI says so.

---

# 33. OPEN DELIVERIES

When a vendor marks an order ready:

backend opens the delivery.

The rider app should receive the existing real-time event.

Display the delivery in the rider's open-delivery feed.

Do not repeatedly query the server unnecessarily.

Use real-time updates + reconciliation.

---

# 34. RIDER ACCEPTANCE

The mobile button:

ACCEPT DELIVERY

must call the backend.

Backend determines whether the rider actually won the delivery.

If another rider wins first:

display a clean:

"Delivery no longer available"

and remove it.

Never trust local UI state.

---

# 35. RIDER PICKUP

Show:

* vendor
* pickup address
* order details
* package information
* navigation
* contact options where allowed
* pickup status
* verification requirement

When rider arrives:

allow pickup verification.

---

# 36. PICKUP CODE

Implement the existing vendor→rider verification.

Flow:

Rider arrives
↓
Cook provides code
↓
Rider enters code
↓
Backend validates
↓
Pickup confirmed
↓
Trip can begin

The app must not allow a rider to bypass this gate.

---

# 37. RIDER TRIP

After pickup:

Rider sees:

* customer destination
* navigation
* trip status
* order summary
* delivery code requirement
* customer contact options where permitted

Trip state remains backend-authoritative.

---

# 38. CUSTOMER DELIVERY CODE

Implement the existing rider→customer delivery verification.

Customer sees the code when appropriate.

Rider enters the code.

Backend validates.

Successful verification:

→ delivery completed
→ order completed
→ financial workflow continues
→ all parties updated

---

# 39. MANAGEMENT MOBILE APP

Management must have a professional mobile dashboard.

Do not simply shrink the desktop admin panel.

Create mobile-appropriate management workflows.

Include:

* overview
* orders
* payments
* manual payment review
* users
* cooks
* riders
* deliveries
* disputes
* moderation
* KYC
* support
* alerts
* financial monitoring
* reports
* audit history

---

# 40. MANAGEMENT PERMISSIONS

Management roles must be enforced by backend permissions.

Examples:

ADMIN
MODERATOR
REGIONAL MODERATOR
SUPPORT
PAYMENT REVIEWER
OPERATIONS

Use whatever roles already exist.

The app should hide inaccessible functions, but hiding UI is NOT security.

Backend authorization remains authoritative.

---

# 41. MODERATION

Implement all existing moderation capabilities.

Including:

* user review
* reported content
* reported users
* account actions
* suspensions
* bans
* appeals
* disputes
* evidence
* audit trail

Do not invent moderation rules.

Reuse backend rules.

---

# 42. LOCATION

Audit the existing location architecture.

Mobile should support native location where needed.

Especially for riders.

Implement:

* permission requests
* permission denied states
* location unavailable
* approximate vs precise location where appropriate
* background location only where genuinely required
* battery-conscious tracking
* lifecycle handling

Do not request location permission before it is needed.

Explain why permission is needed through appropriate native UX.

---

# 43. MAPS

If maps already exist on web:

preserve the same provider where practical.

Mobile can use native map SDK integration where appropriate.

The visual experience should still match the marketplace branding.

---

# 44. CAMERA / FILE UPLOADS

Audit all existing web upload functionality.

Mobile should provide native capabilities for:

* payment proof
* profile photos
* food photos
* KYC documents
* verification documents
* other existing uploads

Implement:

camera
gallery
document picker

where appropriate.

Preserve backend upload validation.

---

# 45. DEEP LINKS

Implement deep links/app links.

Examples:

/order/123
/delivery/456
/cook/789
/food/123
/payment/123

If the app is installed:

open native screen.

If not:

open the web/PWA equivalent.

This allows website, email and push notifications to connect naturally to the app.

---

# 46. WEB + APP COEXISTENCE

The PWA must continue working.

Do NOT modify the web experience simply to make mobile development easier.

Both clients should consume the same backend.

Architecture:

WEB
PWA
iOS
ANDROID
↓
SHARED BACKEND/API
↓
SHARED DATABASE
↓
SHARED EVENTS/NOTIFICATIONS

---

# 47. CACHING

Use mobile caching intelligently.

Cache relatively stable data:

* categories
* cook profiles
* restaurant information
* food listings
* images
* configuration

Be careful with:

* wallet balances
* payment state
* order status
* delivery status
* rider availability

Critical state must always reconcile with server.

---

# 48. OFFLINE SUPPORT

Mobile should gracefully handle:

* no internet
* slow internet
* temporary disconnect
* app backgrounding
* reconnect

Show:

"You're offline"

where appropriate.

Do not allow users to believe a critical action succeeded until backend confirmation exists.

---

# 49. LOADING STATES

Every screen must have proper:

* skeleton loading
* loading indicators
* empty state
* error state
* retry
* offline state

Do not leave blank screens while data loads.

---

# 50. ERROR HANDLING

Create a consistent mobile error system.

Translate backend errors into understandable UI.

Avoid exposing raw:

* stack traces
* SQL errors
* server errors
* internal IDs

Use human-readable messages.

---

# 51. ACCESSIBILITY

Implement:

* dynamic text sizing
* screen reader labels
* accessible touch targets
* contrast
* semantic controls
* keyboard navigation where relevant
* reduced motion support where practical

Do not sacrifice the existing design language.

---

# 52. APP PERFORMANCE

Optimize:

* startup
* image loading
* scrolling
* list rendering
* API requests
* caching
* WebSocket connections
* memory
* battery
* location updates

Avoid unnecessary rebuilds/rerenders.

Do not fetch the same data repeatedly.

---

# 53. SECURITY

Audit mobile security.

Ensure:

* tokens are securely stored
* TLS is used
* sensitive logs are disabled
* secrets are not bundled
* API keys are appropriate for client use
* backend authorization is enforced
* screenshots are not unnecessarily stored
* sensitive data is minimized
* logout invalidates sessions appropriately
* compromised/stale sessions are handled

Never put server-side secrets in the mobile app.

---

# 54. PAYMENT SECURITY

Mobile payment flows must ultimately rely on backend verification.

Never treat:

"payment screen returned success"

as proof.

The backend must confirm.

The app then reflects the authoritative result.

---

# 55. BALANCE SECURITY

Never trust:

* balance from local storage
* balance calculated in app
* transaction amount supplied by app
* withdrawal amount without server validation

Display backend values.

Refresh after financial operations.

---

# 56. NOTIFICATION SETTINGS

Create a proper notification center.

Support existing categories such as:

* orders
* payments
* deliveries
* promotions
* account
* system
* management alerts

Use existing preference architecture.

---

# 57. ACCOUNT SETTINGS

Ensure parity with web:

* profile
* phone
* email
* password
* security
* notifications
* addresses
* payment methods
* privacy
* account deletion if supported
* logout
* device/session management if supported

---

# 58. APP NAVIGATION

Design role-specific navigation.

Do not force every role into the same navigation.

Example customer:

Home
Explore
Orders
Wallet
Profile

Cook:

Dashboard
Orders
Menu
Earnings
Profile

Rider:

Deliveries
Active Trip
Earnings
History
Profile

Management:

Dashboard
Operations
Users
Moderation
More

These are examples only.

Use the actual web feature set to determine the final structure.

---

# 59. SHARED COMPONENT SYSTEM

Build reusable components.

Examples:

* AppButton
* AppTextField
* AppCard
* StatusBadge
* FoodCard
* CookCard
* RestaurantCard
* OrderCard
* DeliveryCard
* BalanceCard
* TransactionRow
* NotificationRow
* EmptyState
* ErrorState
* LoadingSkeleton
* BottomSheet
* ConfirmationDialog

Use the project's actual naming conventions.

Do not duplicate visual components across roles.

---

# 60. DESIGN TOKENS

Extract the web design into reusable mobile tokens:

* colors
* typography
* spacing
* radii
* shadows
* iconography
* animation
* component dimensions

The app should feel visually related to the website on first inspection.

---

# 61. ANIMATION

Use subtle animation for:

* navigation
* status changes
* loading
* cards
* order progress
* delivery updates
* success states

Do not overanimate.

Animation should reinforce state changes.

---

# 62. APP-SPECIFIC ENHANCEMENTS

After feature parity is achieved, add improvements that make sense specifically on mobile.

Examples:

CUSTOMER:

* push notifications
* saved addresses
* native location
* deep links
* native share
* faster checkout
* biometric unlock where appropriate

COOK:

* instant new-order alerts
* quick accept
* camera-based food upload
* quick menu updates

RIDER:

* native navigation
* live location
* background location where required
* vibration/audio alerts
* quick delivery actions
* optimized trip interface

MANAGEMENT:

* urgent operational alerts
* quick payment approval
* moderation alerts
* order monitoring

Do not add features merely because they are technically possible.

---

# 63. APP LIFECYCLE

Test:

* cold start
* warm start
* background
* foreground
* terminated state
* login while app is closed
* notification tap
* deep link
* network reconnect
* token expiry

The app must recover gracefully.

---

# 64. MULTI-DEVICE SESSIONS

If users can use:

* web
* PWA
* iOS
* Android

simultaneously:

ensure state changes synchronize correctly.

Example:

Customer orders on web.

Customer opens app.

The app must see the order.

Customer pays on app.

Web must eventually reflect payment.

Rider accepts on Android.

Management dashboard must immediately reflect assignment.

---

# 65. REAL-TIME CONSISTENCY

Use the existing event infrastructure.

Important events should update:

Customer
Cook
Rider
Management

without requiring manual refresh.

But always reconcile against backend state.

---

# 66. TESTING MATRIX

Test each role independently.

## CUSTOMER

* registration
* login
* verification
* checkout
* manual payment
* gateway payment
* wallet
* order
* tracking
* notification
* delivery
* review
* logout

## COOK

* login
* onboarding
* KYC
* menu
* order
* accept
* prepare
* ready
* pickup
* earnings
* wallet
* notifications

## RIDER

* onboarding
* KYC
* availability
* open deliveries
* acceptance
* pickup
* code
* trip
* delivery
* earnings
* notifications

## MANAGEMENT

* login
* role permissions
* payment review
* moderation
* users
* cooks
* riders
* orders
* deliveries
* disputes
* audit
* logout

---

# 67. FAILURE TESTING

Test:

* no network
* timeout
* server error
* expired token
* duplicate tap
* duplicate payment
* duplicate submission
* WebSocket disconnect
* notification missed
* app killed
* app resumed
* stale cache
* invalid permission
* denied location
* denied camera
* denied notifications

---

# 68. SECURITY TESTING

Test that:

Customer cannot access another customer's order.

Cook cannot access another cook's orders.

Rider cannot access another rider's delivery.

Moderator cannot access admin-only operations.

Mobile cannot bypass backend permissions.

Client cannot modify:

* balances
* payment status
* order status
* delivery status
* verification state

---

# 69. VISUAL QA

Compare:

WEB
vs
PWA
vs
iOS
vs
Android

for equivalent screens.

The result should feel like one unified product.

Check:

* typography
* colors
* spacing
* cards
* images
* buttons
* status badges
* icons
* navigation
* empty states
* loading states
* error states

---

# 70. RESPONSIVE / DEVICE TESTING

Test multiple sizes.

iOS:

* smaller iPhone
* standard iPhone
* large iPhone
* latest supported iOS

Android:

* small screen
* standard screen
* large screen
* different aspect ratios
* different density

Ensure no:

* clipping
* overflow
* inaccessible buttons
* keyboard overlap
* broken bottom sheets
* text truncation
* unsafe-area problems

---

# 71. IOS-SPECIFIC REQUIREMENTS

Implement properly:

* safe areas
* permission prompts
* APNs
* Keychain
* biometric authentication if supported
* deep links/universal links
* app lifecycle
* background behavior
* camera
* location
* document picker

Do not simply imitate iOS.

Use native platform conventions where appropriate while preserving OMK's visual identity.

---

# 72. ANDROID-SPECIFIC REQUIREMENTS

Implement properly:

* FCM
* Android notification channels
* secure storage
* deep links/app links
* permission handling
* background behavior
* camera
* location
* back navigation
* Android lifecycle

Preserve the same brand and design system.

---

# 73. STORE READINESS

Prepare the applications for:

iOS App Store

Android Google Play

Audit:

* application IDs
* bundle IDs
* icons
* splash screens
* permissions
* privacy requirements
* notification configuration
* production API configuration
* release builds
* signing
* versioning
* environment configuration

Do not publish anything automatically.

Prepare the project correctly.

---

# 74. ENVIRONMENTS

Ensure:

Development
Staging
Production

are clearly separated.

Never allow development API endpoints or test credentials into production builds.

---

# 75. ANALYTICS

If the existing web platform has analytics:

audit and extend it to mobile.

Track useful product events such as:

* app opened
* registration started
* registration completed
* login
* checkout started
* payment started
* payment completed
* order created
* order accepted
* delivery accepted
* order completed

Do not track sensitive information unnecessarily.

---

# 76. CRASH MONITORING

If an existing crash monitoring system exists:

integrate the mobile applications into it.

Track:

* crashes
* fatal errors
* failed API calls
* notification failures
* payment-flow failures
* deep-link failures

Never log secrets.

---

# 77. IMPLEMENTATION ORDER

Execute sequentially.

DO NOT build everything at once.

## PHASE 1

Repository + PWA + backend audit.

## PHASE 2

Feature parity matrix.

## PHASE 3

Mobile architecture.

## PHASE 4

Design system extraction.

## PHASE 5

App shell + navigation.

## PHASE 6

Authentication.

## PHASE 7

Customer experience.

## PHASE 8

Wallet + balances + payments.

## PHASE 9

Orders + real-time tracking.

## PHASE 10

Cook experience.

## PHASE 11

Rider experience.

## PHASE 12

Management/moderation experience.

## PHASE 13

Notifications + deep links.

## PHASE 14

Location/maps/camera/files.

## PHASE 15

Caching/offline/reconnect.

## PHASE 16

Security.

## PHASE 17

Performance.

## PHASE 18

Visual QA.

## PHASE 19

End-to-end testing.

## PHASE 20

iOS/Android release preparation.

---

# 78. PHASE EXECUTION RULE

At the beginning of every phase:

FIRST REPORT:

1. What already exists.
2. What is reusable.
3. What is missing.
4. What is broken.
5. What needs to be connected.
6. Which files will change.
7. Why those files need to change.
8. What APIs are required.
9. What backend functionality is required.
10. What will NOT be changed.
11. Risks.
12. Testing plan.

Then implement only that phase.

---

# 79. SURGICAL CHANGE REQUIREMENT

You have already been instructed that this is an existing functioning system.

Therefore:

DO NOT:

* rebuild backend
* replace working APIs
* create duplicate authentication
* create duplicate wallets
* create duplicate payment systems
* create duplicate notification systems
* create duplicate order states
* create duplicate delivery states
* create duplicate code verification
* create duplicate financial ledgers

If the mobile app discovers a backend problem:

STOP.

Document it.

Determine whether the smallest backend change can solve it.

Then make a surgical change.

---

# 80. SOURCE-OF-TRUTH HIERARCHY

Use this hierarchy:

DATABASE
↓
BACKEND BUSINESS LOGIC
↓
API / REAL-TIME EVENTS
↓
MOBILE STATE
↓
MOBILE UI

Never reverse this.

The UI reflects reality.

The UI does not define reality.

---

# 81. FINAL ACCEPTANCE CRITERIA

The mobile application is complete only when:

## CUSTOMER

A customer can perform everything they can currently perform on web/PWA.

## COOK

A cook can perform everything they can currently perform on web/PWA.

## RIDER

A rider can perform everything they can currently perform on web/PWA.

## MANAGEMENT

Management and moderation staff can perform their permitted operations.

## AUTH

All authentication states work.

## BALANCES

All balances and transaction states match backend/web.

## PAYMENTS

Manual payment works.

Paystack works where enabled.

Flutterwave works where enabled.

Stripe works where enabled.

## ORDERS

Orders progress automatically through the existing backend workflow.

## DELIVERY

Riders receive available deliveries in real time.

## VERIFICATION

Pickup and delivery verification work.

## NOTIFICATIONS

Push notifications work correctly.

## REAL-TIME

App state synchronizes with the backend.

## PWA

The existing PWA continues functioning.

## DESIGN

The mobile app unmistakably belongs to the same product.

## PERFORMANCE

The app feels fast and responsive.

## SECURITY

No client-side bypass can manipulate authoritative state.

---

# FINAL INSTRUCTION

Think of this project as:

"Build the native mobile clients for an existing marketplace."

NOT:

"Build a new food marketplace."

The backend already knows:

* who the user is
* what role they have
* what they can do
* what their balance is
* what orders exist
* what payments exist
* what deliveries exist
* what the current order state is
* what the current delivery state is
* what notifications exist
* what permissions exist

The mobile app should expose that functionality through an excellent native experience.

The website/PWA remains fully functional.

The backend remains the authoritative business system.

The mobile applications become first-class clients of that system.

Build for iOS and Android.

Preserve the existing product identity.

Preserve existing functionality.

Improve the experience where native mobile capabilities provide genuine value.

Do not create parallel systems.

Do not break working systems.

Investigate first.

Map second.

Implement third.

Test continuously.

Proceed phase-by-phase.
