# OYEWELL — MANAGEMENT, ADMINISTRATION, MODERATION, CHAT, SUPPORT, DISPUTES & COMMUNITY COOK ONBOARDING
## COMPREHENSIVE MULTI-PHASE IMPLEMENTATION PROMPT

You are working on the existing OyeWell application.

OyeWell is already an operational food marketplace with an existing frontend, backend, database, authentication, ordering, payment/wallet, food discovery, cook/host functionality, rider/delivery functionality, location infrastructure, and a TikTok-style food discovery experience.

Your task is to **surgically extend the existing architecture** with a mature Management, Trust & Safety, Communication, Support, Dispute Resolution, Approval, and Community Cook Onboarding system.

This is a major platform infrastructure upgrade.

---

# ABSOLUTE RULE #1 — AUDIT BEFORE BUILDING

DO NOT immediately start creating new tables, services, routes, pages or components.

First inspect the entire existing application.

Understand:

- frontend architecture
- backend architecture
- database schema
- authentication
- users
- roles
- permissions
- orders
- payments
- wallets
- cooks
- restaurants
- riders
- delivery
- location
- notifications
- admin functionality
- existing support
- existing chat
- existing reporting
- existing onboarding
- existing terms/legal pages

Search the entire repository.

Identify existing functionality that can be extended.

The goal is:

> REUSE FIRST. EXTEND SECOND. CREATE ONLY WHEN NECESSARY.

Do not create duplicate:

- authentication systems
- user systems
- wallet systems
- order systems
- delivery systems
- notification systems
- location systems
- admin systems
- chat systems
- approval systems

unless the current architecture genuinely lacks them.

---

# ABSOLUTE RULE #2 — SURGICAL IMPLEMENTATION

This must be a surgical architectural upgrade.

Do not rewrite unrelated parts of OyeWell.

Do not change working functionality merely because you prefer another implementation.

Do not introduce duplicate models for concepts that already exist.

Do not create parallel databases.

Do not create a second authentication flow.

Do not break existing routes.

Do not break existing APIs.

Do not break existing UI.

Do not replace working functionality without first proving that replacement is necessary.

---

# ABSOLUTE RULE #3 — PLAIN HUMAN LANGUAGE

This is extremely important.

OyeWell is designed for ordinary people.

Many users will not be technically sophisticated.

The interface must therefore use **simple, natural, human language**.

This applies globally.

Do NOT use unnecessary technical or corporate terminology.

Avoid phrases such as:

- Fulfillment orchestration
- Operational workflow
- Geospatial resolution
- Account provisioning
- Dispute adjudication
- Merchant fulfillment
- Escalation matrix
- Service-level agreement
- Authentication credential
- Compliance workflow

unless they are strictly necessary internally.

Prefer:

- Your order
- Get help
- Report a problem
- Talk to us
- Your food
- Your delivery
- Where do you live?
- When can you cook?
- Tell us about your kitchen
- Upload a photo
- We need one more thing
- Your application is being checked
- We need more information
- Approved
- Not approved yet
- Try again
- Ask for help

The same principle applies to:

- customers
- cooks
- riders
- moderators
- support staff

Even internal dashboards should be easy to understand.

---

# ABSOLUTE RULE #4 — DO NOT MAKE SIMPLE UI MEANING SCANTY UI

Simple does NOT mean:

- removing necessary information
- hiding important requirements
- using childish language
- reducing functionality

The interface should be:

- complete
- mature
- elegant
- professional
- visually clean
- easy to understand
- step-by-step
- forgiving
- accessible

A person with basic digital literacy should be able to understand what to do without needing technical knowledge.

---

# TARGET ARCHITECTURE

Create or extend a central:

# MANAGEMENT SERVICE

This is OyeWell's administrative control plane.

Conceptually:

```text
MANAGEMENT SERVICE
│
├── Admins
├── Employees
├── Roles
├── Permissions
├── Admin Tiers
├── Location Moderators
├── Community Moderators
├── Approvals
├── Moderation
├── Reports
├── Support
├── Tickets
├── Disputes
├── Evidence
├── Escalations
├── Audit Logs
├── Platform Settings
├── Food/Cook Reviews
├── Rider Reviews
├── Packaging Reviews
├── User Management
└── Operational Controls
```

Do not necessarily create a literal backend service/microservice if the existing application architecture does not require one.

"Management Service" is the architectural domain.

Keep it compatible with the existing monolith/modular backend if that is what OyeWell currently uses.

---

# PHASE 1 — COMPLETE SYSTEM AUDIT

Before changing anything, inspect the repository.

Create a detailed internal implementation plan based on what actually exists.

Audit:

## USERS

- User model
- authentication
- account status
- user roles
- user types
- profiles

## ADMIN

- existing admin routes
- existing admin dashboard
- admin roles
- authorization
- permissions

## FOOD

- cooks
- restaurants
- menus
- food posts
- approvals

## DELIVERY

- riders
- neighborhood delivery
- professional delivery
- delivery statuses
- delivery assignment

## PAYMENTS

- wallet
- transactions
- refunds
- payouts

## COMMUNICATION

- chat
- notifications
- email/SMS/push
- existing messaging

## SUPPORT

- reports
- support forms
- tickets

## LEGAL

- Terms
- Privacy
- user agreements
- consent records

## LOCATION

- customer location
- cook location
- rider location
- delivery location
- geographic areas

Produce an architectural report before implementation.

---

# PHASE 2 — MANAGEMENT DOMAIN

Create the Management domain/module.

It should become the home for administrative operations.

The management architecture should support:

```text
Management
│
├── People
│   ├── Admins
│   ├── Employees
│   └── Moderators
│
├── Access
│   ├── Roles
│   ├── Permissions
│   └── Admin Tiers
│
├── Operations
│   ├── Orders
│   ├── Deliveries
│   ├── Cooks
│   └── Riders
│
├── Trust & Safety
│   ├── Reports
│   ├── Moderation
│   ├── Disputes
│   └── Evidence
│
├── Support
│   ├── Tickets
│   └── Conversations
│
├── Approvals
│   ├── Cook Applications
│   ├── Rider Applications
│   ├── Professional Upgrades
│   └── Packaging
│
└── Settings
    ├── Delivery Rules
    ├── Packaging Rules
    ├── Service Areas
    └── Platform Rules
```

---

# PHASE 3 — ADMIN TIERS

Do NOT simply create:

```text
ADMIN
SUPER_ADMIN
```

Create a mature authorization model.

Support roles such as:

## Super Admin

Full system control.

## Operations Admin

Orders, delivery, cooks and riders.

## Moderator

Reports, users, content and conversations.

## Support Agent

Customer support and tickets.

## Dispute Officer

Disputes, evidence and resolutions.

## Cook Reviewer

Cook applications, menus and packaging.

## Rider Reviewer

Rider applications and professional upgrades.

## Finance Officer

Financial operations subject to appropriate authorization limits.

## Analyst

Read-only operational data.

These are examples.

The system must support creating/editing roles and permissions rather than hardcoding everything permanently.

---

# PHASE 4 — PERMISSIONS

Implement granular permissions.

Examples:

```text
USER_VIEW
USER_SUSPEND
USER_RESTRICT

COOK_VIEW
COOK_APPROVE
COOK_REJECT
COOK_SUSPEND

RIDER_VIEW
RIDER_APPROVE
RIDER_REJECT
RIDER_SUSPEND

ORDER_VIEW
ORDER_EDIT
ORDER_CANCEL

DELIVERY_VIEW
DELIVERY_REASSIGN

TICKET_VIEW
TICKET_ASSIGN
TICKET_RESOLVE

DISPUTE_VIEW
DISPUTE_ASSIGN
DISPUTE_RESOLVE
DISPUTE_ESCALATE

CHAT_REVIEW
MESSAGE_REPORT_REVIEW

REFUND_REQUEST
REFUND_APPROVE

SETTINGS_VIEW
SETTINGS_EDIT
```

Use the existing naming conventions if the project already has permission structures.

---

# PHASE 5 — AUTHORIZATION LIMITS

Permissions must support limits where money or sensitive actions are involved.

For example:

A Support Agent may:

> Recommend a refund.

A Dispute Officer may:

> Approve refunds up to a configured amount.

A Senior Admin may:

> Approve larger refunds.

This prevents a low-level employee from having unrestricted financial authority.

Make these limits configurable.

---

# PHASE 6 — LOCATION-SPECIFIC MODERATORS

THIS IS A CORE REQUIREMENT.

OyeWell must support:

# GLOBAL MODERATION

and

# LOCAL MODERATION

The system should allow authorized management staff to assign moderators to geographic areas.

Examples:

```text
GLOBAL
COUNTRY
STATE/REGION
CITY
DISTRICT
SERVICE AREA
COMMUNITY
```

Do not hardcode Nigerian geography.

The architecture must work globally.

---

# PHASE 7 — COMMUNITY MODERATOR MODEL

A moderator can be assigned to one or more geographic areas.

For example:

```text
Moderator A
Nigeria
Lagos
Ikeja

Moderator B
Nigeria
Abuja
Gwarinpa

Moderator C
United Kingdom
London
Specific service area
```

A moderator may have:

- one area
- multiple areas
- one country
- multiple countries
- global scope

depending on authorization.

---

# PHASE 8 — WHY LOCAL MODERATION EXISTS

The system should recognize that local knowledge can matter.

A local moderator may better understand:

- local addresses
- local neighborhoods
- common landmarks
- delivery difficulties
- community expectations
- local language/context
- common local misunderstandings
- local operational problems

For example:

A delivery dispute involving a difficult-to-find address may be better handled by someone who knows that neighborhood.

This should influence routing of cases.

---

# PHASE 9 — MODERATION ROUTING

When a report/dispute/ticket is created:

Determine:

1. What type of problem is this?
2. Where did it happen?
3. Is the location known?
4. Is a local moderator available?
5. Does that moderator have permission for this type of case?
6. Does the case require a higher-level reviewer?

Then route appropriately.

Conceptually:

```text
Case
 ↓
Location?
 ↓
Local Moderator
 ↓
If unavailable → Regional Moderator
 ↓
If unavailable → Country Moderator
 ↓
If unavailable → Global Moderator
```

Do not automatically send every case to local moderators.

Permission and workload must also matter.

---

# PHASE 10 — MODERATOR CONFLICTS

A moderator must not handle a case where they have an inappropriate conflict.

For example:

- they are involved in the order
- they are the reported person
- they are connected to the reported provider
- they personally created the dispute

Implement appropriate conflict detection/recusal mechanisms where practical.

---

# PHASE 11 — ESCALATION

Every case should be able to move upward.

Example:

```text
Community Moderator
        ↓
Regional Moderator
        ↓
Senior Moderator
        ↓
Operations Admin
        ↓
Super Admin
```

The exact hierarchy should be configurable.

---

# PHASE 12 — MANAGEMENT DASHBOARD

Create a polished management dashboard.

It should NOT look like a developer console.

Use simple labels.

Example:

### Today

Orders

Deliveries

New cooks

New riders

Open problems

Pending approvals

Disputes

---

# PHASE 13 — MANAGEMENT HOME

Use cards such as:

### Needs your attention

12 cook applications

7 delivery problems

4 disputes

18 support requests

### Delivery

34 active deliveries

### People

8 new rider applications

### Food

15 new cook applications

---

# PHASE 14 — EMPLOYEE MANAGEMENT

Management should be able to:

- add employees
- assign roles
- assign permissions
- assign geographic areas
- suspend access
- revoke access
- deactivate employees

Do not delete important employee records destructively.

Maintain historical records.

---

# PHASE 15 — ADMIN ACCESS SECURITY

Administrative accounts should have stronger security than ordinary users.

Reuse the existing authentication infrastructure where possible.

Support appropriate:

- MFA
- session management
- login monitoring
- access revocation
- suspicious login detection

Do not create a separate unrelated authentication system.

---

# PHASE 16 — AUDIT LOGGING

Every sensitive management action should generate an audit event.

Record:

```text
actor
action
target
time
reason
old state
new state
case/order reference
```

Examples:

> Moderator suspended cook.

> Dispute Officer approved refund.

> Admin approved rider.

> Manager changed packaging requirement.

---

# PHASE 17 — AUDIT LOG UI

Create:

### Activity

> Mary approved Cook Application #1024.

> John reassigned Delivery #8821.

> David suspended Rider #918.

Allow authorized admins to inspect details.

Do not allow ordinary employees to alter audit logs.

---

# PHASE 18 — APPROVAL ENGINE

Create a reusable approval workflow.

Support:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
MORE_INFORMATION_REQUIRED
APPROVED
REJECTED
SUSPENDED
```

Use this for:

- cooks
- riders
- professional delivery
- packaging
- menus
- special approvals

Do not create a completely different approval system for each.

---

# PHASE 19 — CHAT SYSTEM

Build or extend the existing chat system.

Chat should support:

- customer ↔ cook
- customer ↔ rider where appropriate
- customer ↔ support
- support ↔ user
- dispute conversations

Do not create independent chat systems.

---

# PHASE 20 — CONVERSATIONS

A conversation should have context.

Examples:

```text
Order
Delivery
Support
Dispute
```

The conversation should know what it belongs to.

Example:

> Chat about Order #OW-12345

This makes support and disputes much easier.

---

# PHASE 21 — CHAT FEATURES

Support:

- text
- images where appropriate
- timestamps
- read status
- unread count
- notifications
- message reporting
- user reporting
- blocking/restriction where appropriate

Keep the interface extremely simple.

---

# PHASE 22 — CHAT MODERATION

Users should be able to:

### Report a message

### Report a person

### Block a person

### Get help

Do not expose moderation controls to unauthorized employees.

---

# PHASE 23 — PRIVACY

Do not design the system around indiscriminately reading private conversations.

Authorized review should be triggered by:

- user reports
- disputes
- support cases
- legitimate safety concerns
- authorized moderation workflows

Maintain appropriate access controls and audit access to private communications.

---

# PHASE 24 — SUPPORT TICKETS

Create a dedicated ticketing system.

A ticket should contain:

```text
Ticket ID
Customer
Category
Order
Delivery
Priority
Status
Assigned employee
Messages
Attachments
Internal notes
Resolution
Created time
Updated time
```

---

# PHASE 25 — SIMPLE TICKET CATEGORIES

Use human-friendly labels.

Examples:

### My food hasn't arrived

### My order is wrong

### I was charged incorrectly

### My delivery has a problem

### I want to report someone

### I want to report a food problem

### Something else

Avoid forcing users to understand internal OyeWell departments.

---

# PHASE 26 — INTERNAL TICKET CATEGORIES

The backend may have more detailed categories.

Keep internal complexity away from the customer.

---

# PHASE 27 — DISPUTE SYSTEM

A dispute is more serious than a normal support ticket.

Support:

```text
OPEN
UNDER_REVIEW
WAITING_FOR_CUSTOMER
WAITING_FOR_PROVIDER
ESCALATED
RESOLVED
CLOSED
APPEALED
```

---

# PHASE 28 — DISPUTE TYPES

Examples:

- Food not received
- Wrong food
- Missing item
- Food quality complaint
- Delivery issue
- Payment problem
- Unauthorized action
- Rider complaint
- Cook complaint

Keep the system extensible.

---

# PHASE 29 — DISPUTE EVIDENCE

Automatically gather relevant evidence.

Depending on the dispute:

- order details
- payment status
- order timeline
- cook status
- rider assignment
- pickup confirmation
- delivery confirmation
- delivery code
- relevant chat
- relevant location events
- uploaded photos
- timestamps

Do not expose irrelevant private data.

---

# PHASE 30 — DISPUTE TIMELINE

Create an automatically generated timeline.

Example:

```text
2:04 PM
Order placed

2:06 PM
Cook accepted

2:42 PM
Food ready

2:45 PM
Rider accepted

2:52 PM
Rider reached pickup

2:55 PM
Food collected

3:18 PM
Delivery completed

3:22 PM
Customer reported a problem
```

The moderator should understand the case immediately.

---

# PHASE 31 — DISPUTE LOCATION CONTEXT

Where appropriate, connect disputes to the Location Service.

Show authorized moderators:

- pickup area
- delivery area
- relevant rider location events
- timestamps
- route information

Do not reveal unnecessary historical location data.

---

# PHASE 32 — DISPUTE ASSIGNMENT

Assign disputes based on:

- issue type
- geographic area
- moderator permissions
- moderator availability
- workload
- escalation level

Prioritize local moderators for appropriate local cases.

---

# PHASE 33 — DISPUTE RESOLUTION

A moderator should be able to:

- request information
- request evidence
- contact participants
- recommend resolution
- resolve within authority
- escalate
- record reasoning

Financial actions must respect authorization limits.

---

# PHASE 34 — REFUNDS

Never allow frontend code to directly decide a refund.

All refunds must go through backend authorization.

Every refund must have:

- amount
- reason
- order
- dispute/ticket
- approving employee
- audit record

---

# PHASE 35 — APPEALS

Where appropriate, allow a user/provider to request a review.

Do not automatically send an appeal back to the same person who made the original decision.

---

# PHASE 36 — COOK ONBOARDING REDESIGN

Now completely audit the existing cook/host onboarding.

The goal:

# SIMPLE FOR THE USER.
# COMPLETE FOR OYEWELL.

Do not make the user fill out a giant complicated form.

Use a guided multi-step experience.

---

# PHASE 37 — COOK ONBOARDING STEPS

Recommended structure:

## Step 1 — About You

- name
- preferred name/display name
- phone
- basic profile information

Use existing authenticated user data where available.

Do not ask for information already known.

---

## Step 2 — Your Kitchen

Ask:

> Tell us about where you cook.

Collect appropriate information about:

- general location
- kitchen/preparation setting
- service area
- operating area

Protect private residential information.

---

## Step 3 — What You Cook

Allow food categories.

Examples:

- Soups
- Rice
- Local dishes
- Swallow
- Snacks
- Pastries
- Noodles
- Desserts
- Other

---

# PHASE 38 — SIGNATURE FOOD

Ask:

> What food are you best known for?

Allow them to add their main dishes.

This should later connect naturally to menu creation.

---

# PHASE 39 — COOKING CAPACITY

Ask in plain words:

> How many orders can you make in a day?

Options:

- 1–5
- 6–10
- 11–20
- 20+

Allow future adjustment.

---

# PHASE 40 — PREPARATION TIME

Ask:

> How long do you normally need to prepare an order?

Options such as:

- 30 minutes
- 1 hour
- 2 hours
- 3 hours
- More

Use configurable values.

---

# PHASE 41 — AVAILABILITY

Simple controls:

### When do you cook?

Monday

Tuesday

Wednesday

etc.

Then:

> What time do you normally start?

> What time do you normally stop?

Allow:

### Kitchen Open

### Kitchen Closed

---

# PHASE 42 — PACKAGING

Create a dedicated packaging section.

Explain:

> Your food must be packed safely so it reaches the customer in good condition.

Show simple requirements.

Requirements should be configurable from Management.

---

# PHASE 43 — PACKAGING PHOTO

Where required:

> Show us how you pack your food.

Allow image uploads.

Admin reviewers can approve/reject/request another photo.

---

# PHASE 44 — FOOD SAFETY ACKNOWLEDGEMENTS

Use clear statements.

Examples:

> I prepare food in a clean place.

> I will not sell food that I know is unsafe.

> I will pack food properly before giving it to a delivery partner.

> I understand that customers may report serious food problems.

These are examples only.

Actual legal wording must be reviewed and approved separately.

---

# PHASE 45 — LOCATION

Use the existing OyeWell Location Service.

Allow:

- current location
- manual address
- map selection where appropriate

Do not expose exact private home addresses publicly.

---

# PHASE 46 — VERIFICATION

Collect only information reasonably required for OyeWell's operational/legal requirements.

Clearly explain:

> Why we need this.

Never collect sensitive information merely because it is technically possible.

---

# PHASE 47 — TERMS & AGREEMENTS

Create a proper legal acceptance system.

Support:

- Terms of Service
- Community Food Provider Agreement
- Privacy Policy
- Food/Safety Rules
- Delivery Rules
- Refund/Dispute Policy
- Community Guidelines

Each agreement should be versioned.

Record:

```text
user
document
version
acceptedAt
```

---

# PHASE 48 — LEGAL LANGUAGE

Do NOT invent legally sufficient terms.

Create the technical infrastructure for versioned legal documents and acceptance.

Use placeholders/configurable documents until approved legal text is supplied.

The final legal wording should be reviewed by qualified legal counsel appropriate to the jurisdictions where OyeWell operates.

---

# PHASE 49 — COMMUNITY FOOD DISCLOSURE

The product should clearly explain the difference between Community Food and professional restaurants.

Use simple wording.

Conceptually:

> **Community Food**
>
> Some food on OyeWell is made by people in your community who cook from home or as a side business. They may not be professional chefs or restaurants. Their food may be different from what you get from a restaurant.
>
> If you want food from an established restaurant or professional food business, choose the Restaurant section.

Do not use this exact text unless it passes legal/product review.

---

# PHASE 50 — COOK APPROVAL DASHBOARD

Management should show:

### New applications

### Waiting for information

### Ready to review

### Approved

### Rejected

### Suspended

A reviewer should see:

- profile
- application
- food
- packaging
- location/service area
- agreements
- submitted documents
- history
- previous reports

---

# PHASE 51 — REQUEST MORE INFORMATION

The reviewer should be able to click:

### We need more information

Then select/request:

- packaging photo
- food photo
- missing information
- clarification

The cook should receive a simple message:

> We need one more thing before you can start.

Then:

### Show me what I need to do

---

# PHASE 52 — COOK DASHBOARD

After approval, create/upgrade the cook dashboard.

It should have:

### My Food

### Add Food

### My Orders

### Kitchen Open/Closed

### My Earnings

### Messages

### Help

Use large, clear actions.

---

# PHASE 53 — COOK MENU CREATION

Make posting extremely simple.

Flow:

```text
Add Food
 ↓
Food name
 ↓
Photo/video
 ↓
Price
 ↓
What is included?
 ↓
How many people?
 ↓
Preparation time
 ↓
Available today?
 ↓
Save
```

Allow preview before publishing.

---

# PHASE 54 — COMMUNITY COOK QUALITY CONTROLS

Create operational controls for:

- repeated complaints
- cancellation rate
- missed orders
- serious food complaints
- packaging failures
- inappropriate behavior

Do not automatically punish users based on one weak signal.

Use configurable review thresholds and human review where appropriate.

---

# PHASE 55 — MODERATOR UI

A moderator should not see a terrifying enterprise dashboard.

Give them:

### My Work

12 cases

### Urgent

2

### Nearby

5

### Waiting for reply

4

Then:

**Open case**

---

# PHASE 56 — LOCAL MODERATOR DASHBOARD

If the moderator has geographic scope:

Show:

### My Area

Ikeja

Then:

- nearby disputes
- delivery problems
- cook issues
- rider issues
- community reports

This makes local moderation practical.

---

# PHASE 57 — GLOBAL MODERATOR DASHBOARD

Global moderators can see cases across areas according to their permissions.

They should also be able to filter by:

- country
- region
- city
- service area
- case type

---

# PHASE 58 — LOCAL KNOWLEDGE WITHOUT LOCAL POWER ABUSE

Location-specific access must never mean:

> Local moderator can do anything to local users.

The moderator still has normal permissions.

Geographic scope determines:

> WHERE they can work.

Role/permissions determine:

> WHAT they can do.

This distinction is mandatory.

---

# PHASE 59 — MANAGEMENT CONFIGURATION

Allow authorized administrators to configure:

- roles
- permissions
- geographic areas
- moderator assignments
- approval requirements
- packaging rules
- delivery rules
- dispute categories
- ticket categories
- escalation rules

Avoid hardcoding operational rules.

---

# PHASE 60 — NOTIFICATIONS

Integrate with the existing notification system.

Notify users when:

- cook application submitted
- cook application approved
- more information requested
- rider application updated
- ticket updated
- dispute updated
- moderator responds
- resolution issued

Use simple messages.

Example:

> **We need one more thing**
>
> Please upload a photo of your food container.

Not:

> "Your application has entered an additional-information state."

---

# PHASE 61 — PERFORMANCE

The new system must not slow down the food experience.

Use:

- pagination
- lazy loading
- indexed queries
- realtime only where necessary
- optimized chat loading
- efficient notification handling
- background processing for heavy operations

Do not load entire dispute histories or chat histories at once.

---

# PHASE 62 — SECURITY

Pay particular attention to:

- authorization
- privilege escalation
- IDOR
- unauthorized admin access
- unauthorized dispute access
- unauthorized chat access
- unauthorized refund
- unauthorized location access
- sensitive data exposure
- attachment access
- employee session security

Never trust role information supplied by the frontend.

Authorization must be enforced server-side.

---

# PHASE 63 — FILE/IMAGE SECURITY

For uploaded:

- cook documents
- packaging photos
- food images
- dispute evidence
- chat attachments

Implement appropriate:

- authentication
- authorization
- file validation
- size limits
- type validation
- access control

Do not expose private documents through public URLs unnecessarily.

---

# PHASE 64 — DATA RETENTION

Do not retain sensitive information forever simply because storage is cheap.

Identify retention requirements for:

- audit logs
- disputes
- chat
- evidence
- location events
- legal acceptance
- employee records

Use configurable retention policies where appropriate.

---

# PHASE 65 — TESTING

Write tests for:

## RBAC

- role permissions
- permission denial
- privilege escalation attempts

## Geographic moderation

- local moderator routing
- regional fallback
- country fallback
- global fallback
- permission restrictions
- conflict handling

## Chat

- sending
- reading
- reporting
- blocking
- access control

## Tickets

- creation
- assignment
- escalation
- resolution

## Disputes

- creation
- evidence
- assignment
- resolution
- appeals
- refund authorization

## Cook onboarding

- incomplete application
- save and continue
- return later
- submit
- request more information
- approval
- rejection
- resubmission

---

# PHASE 66 — CONCURRENCY TESTING

Test:

Two moderators attempt to resolve the same dispute.

Two employees assign the same case.

Admin changes permissions while employee is logged in.

Two people attempt to approve the same application.

Refund attempted twice.

Two moderators attempt to suspend the same user.

The system must remain consistent.

---

# PHASE 67 — EXISTING SYSTEM REGRESSION

Verify that nothing breaks:

- registration
- login
- password reset
- user profiles
- Food Around Me
- Hero feed
- food posts
- restaurants
- cooks
- orders
- payments
- wallets
- delivery
- neighborhood delivery
- professional delivery
- rider dashboard
- maps
- notifications

---

# PHASE 68 — UI QUALITY STANDARD

Every new page must feel like it belongs to OyeWell.

Maintain:

- existing visual language
- responsive behavior
- smooth transitions
- proper loading states
- empty states
- error states
- success states
- mobile-first usability

Do not create generic ugly admin CRUD screens.

---

# PHASE 69 — MOBILE FIRST

Test:

- Android
- iPhone
- mobile browser
- PWA
- desktop

Especially test:

- cook onboarding
- chat
- ticket creation
- dispute creation
- moderator dashboard
- rider workflow

---

# PHASE 70 — EMPTY STATES

Every page needs a useful empty state.

Examples:

> No messages yet.

> You don't have any open cases.

> No food applications need your attention.

> You're all caught up.

Do not leave blank screens.

---

# PHASE 71 — ERROR STATES

Errors must be human-readable.

Bad:

> ERR_PERMISSION_CASE_ASSIGNMENT_403

Good:

> You don't have permission to do that.

Or:

> Something went wrong. Please try again.

---

# PHASE 72 — LOADING STATES

Use skeletons/spinners appropriately.

Never leave users wondering whether the page is broken.

---

# PHASE 73 — MANAGEMENT SEARCH

Management should have powerful but simple search.

Search:

- user
- order
- delivery
- cook
- rider
- ticket
- dispute
- case ID

Do not make admins manually navigate ten pages to find an order.

---

# PHASE 74 — UNIVERSAL CASE CONTEXT

When a moderator opens a dispute, show the relevant context in one place.

Conceptually:

```text
CASE

Customer
Cook
Rider
Order
Delivery
Location
Chat
Timeline
Evidence
Messages
Previous reports
Decision
Audit history
```

But only expose information the moderator is authorized to see.

---

# PHASE 75 — EXPORTS

Add controlled export functionality to Management.

Authorized employees should be able to export appropriate:

- dispute lists
- ticket reports
- moderation reports
- cook applications
- rider applications
- operational reports

Exports must:

- respect permissions
- respect geographic scope
- exclude unauthorized sensitive data
- be logged
- have sensible limits

Do not allow unrestricted database exports.

---

# PHASE 76 — REPORTING

Management should eventually support:

### Support

Average response time

Open tickets

Resolved tickets

### Disputes

Open disputes

Average resolution time

Refund totals

Dispute categories

### Moderation

Reports by type

Reports by area

Moderator workload

### Community Food

Applications

Approval rate

Suspensions

Food complaints

---

# PHASE 77 — LOCAL OPERATIONAL INSIGHTS

Because OyeWell operates locally, allow authorized management users to view:

- disputes by area
- delivery issues by area
- food complaints by area
- rider problems by area
- cook applications by area

This helps identify real-world operational patterns.

---

# PHASE 78 — DO NOT ASSUME NIGERIA IS THE ONLY MARKET

The geographic architecture must work globally.

Do not create:

```text
nigeriaModerator
lagosModerator
abujaModerator
```

as hardcoded system concepts.

Use generic:

```text
Country
Region
City
District
ServiceArea
Community
```

Nigeria becomes one configuration of the global system.

---

# PHASE 79 — LOCAL LANGUAGE READINESS

The UI should be structured so future localization is possible.

Do not hardcode user-facing strings throughout business logic.

Keep UI language easy to translate.

The default English should be simple international English.

---

# PHASE 80 — FINAL ARCHITECTURE

The resulting platform should conceptually look like:

```text
                         OYEWELL
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
      DISCOVERY           ORDERS          DELIVERY
          │                 │                 │
       FOOD                PAYMENTS        RIDERS
          │                 │                 │
    ┌─────┴─────┐           │         ┌───────┴───────┐
    │           │           │         │               │
COMMUNITY   RESTAURANTS   WALLET   NEIGHBORHOOD   PROFESSIONAL
    │                       │
    └──────────────┬────────┘
                   │
             TRUST & SAFETY
                   │
       ┌───────────┼───────────┐
       │           │           │
      CHAT       TICKETS     DISPUTES
       │           │           │
       └───────────┼───────────┘
                   │
             MANAGEMENT
                   │
     ┌─────────────┼─────────────┐
     │             │             │
   PEOPLE        ACCESS       APPROVALS
     │             │             │
 Employees       RBAC        Cooks/Riders
 Moderators      Roles       Packaging
 Admins          Tiers       Professional
     │             │
     └──────┬──────┘
            │
       GEO MODERATION
            │
   ┌────────┼─────────┐
   │        │         │
GLOBAL   REGIONAL   LOCAL
                  │
              COMMUNITY
```

---

# PHASE 81 — IMPLEMENTATION ORDER

Implement sequentially.

## PHASE A
Repository/system audit.

## PHASE B
Management domain.

## PHASE C
Admin tiers and RBAC.

## PHASE D
Employee management.

## PHASE E
Geographic/community moderator system.

## PHASE F
Approval engine.

## PHASE G
Audit logging.

## PHASE H
Chat.

## PHASE I
Moderation.

## PHASE J
Ticketing.

## PHASE K
Disputes.

## PHASE L
Evidence/timeline system.

## PHASE M
Legal documents and acceptance.

## PHASE N
Cook onboarding redesign.

## PHASE O
Cook approval and packaging review.

## PHASE P
Management dashboard.

## PHASE Q
Exports/reporting.

## PHASE R
Security audit.

## PHASE S
Performance optimization.

## PHASE T
Complete regression testing.

---

# PHASE 82 — REQUIRED REPORT AFTER EVERY PHASE

After each phase, report:

### WHAT YOU FOUND

Existing architecture relevant to the phase.

### WHAT YOU CHANGED

Exact changes.

### FRONTEND FILES

Exact files created/modified.

### BACKEND FILES

Exact files created/modified.

### DATABASE

Exact schema/migration/index changes.

### API

New or modified endpoints.

### AUTHORIZATION

Permissions introduced/changed.

### REUSED SYSTEMS

What existing systems were reused.

### TESTS

Tests executed and results.

### SECURITY

Security considerations.

### PERFORMANCE

Performance considerations.

### REGRESSION

Existing features tested.

### NEXT PHASE

What remains.

---

# FINAL NON-NEGOTIABLE INSTRUCTIONS

1. AUDIT FIRST.

2. REUSE EXISTING SYSTEMS.

3. DO NOT DUPLICATE EXISTING AUTH, USERS, ORDERS, PAYMENTS, DELIVERY, LOCATION OR NOTIFICATION SYSTEMS.

4. MANAGEMENT MUST BE THE CENTRAL ADMINISTRATIVE CONTROL PLANE.

5. USE RBAC, NOT JUST "ADMIN = TRUE".

6. SEPARATE:
   - ROLE
   - PERMISSION
   - GEOGRAPHIC SCOPE
   - AUTHORIZATION LIMIT

7. SUPPORT GLOBAL, COUNTRY, REGION, CITY, DISTRICT, SERVICE AREA AND COMMUNITY MODERATION.

8. LOCAL MODERATORS MAY HAVE LOCAL KNOWLEDGE, BUT THEY MUST NEVER RECEIVE UNLIMITED POWER JUST BECAUSE THEY ARE LOCAL.

9. SERVER-SIDE AUTHORIZATION IS ALWAYS AUTHORITATIVE.

10. ALL SENSITIVE MANAGEMENT ACTIONS MUST BE AUDITED.

11. FINANCIAL ACTIONS MUST HAVE AUTHORIZATION LIMITS.

12. DISPUTES MUST HAVE EVIDENCE AND TIMELINES.

13. CHAT MUST BE CONTEXT-AWARE.

14. TICKETS AND DISPUTES MUST NOT BE THE SAME THING.

15. COOK ONBOARDING MUST BE SIMPLE FOR USERS BUT COMPLETE FOR OYEWELL.

16. LEGAL DOCUMENTS MUST BE VERSIONED.

17. RECORD WHICH VERSION OF AN AGREEMENT A USER ACCEPTED.

18. DO NOT INVENT LEGALLY SUFFICIENT TERMS. BUILD THE SYSTEM TO SUPPORT APPROVED LEGAL CONTENT.

19. PROTECT PRIVATE COOK LOCATIONS.

20. PROTECT PRIVATE CHAT AND SENSITIVE USER DATA.

21. DO NOT CREATE HARD-CODED NIGERIA-ONLY MODERATION STRUCTURES.

22. DESIGN THE GEOGRAPHIC SYSTEM GLOBALLY, WITH NIGERIA AS AN IMPORTANT INITIAL CONFIGURATION.

23. USE PLAIN, HUMAN LANGUAGE EVERYWHERE.

24. SIMPLE DOES NOT MEAN INCOMPLETE.

25. EVERY USER-FACING ACTION MUST HAVE CLEAR:
   - SUCCESS
   - ERROR
   - LOADING
   - EMPTY
   - RETRY
   states.

26. EVERY IMPORTANT WORKFLOW SHOULD SUPPORT:
   - BACK
   - NEXT
   - SAVE
   - CONTINUE LATER
   - REVIEW
   where appropriate.

27. DO NOT BREAK THE EXISTING OYEWELL FOOD, ORDERING, DELIVERY, WALLET, MAP OR AUTH SYSTEMS.

28. DO NOT PERFORM A MASS REWRITE.

29. DO NOT CREATE DUPLICATE DATABASE TABLES WITHOUT FIRST PROVING THE EXISTING TABLE CANNOT BE EXTENDED.

30. DO NOT CONSIDER THE TASK COMPLETE UNTIL FRONTEND, BACKEND, DATABASE, AUTHORIZATION, UI, TESTING, SECURITY AND REGRESSION WORK ARE COMPLETE.

The ultimate goal is to transform OyeWell from a food-ordering application into a **safe, locally-aware, community-powered marketplace with professional operational controls**, while keeping the experience extremely simple for ordinary people.

The technology should be sophisticated underneath.

The experience should feel simple on top.