# OYEWELL — FOOD DISCOVERY / “TIKTOK FOR FOOD” IMPLEMENTATION
## MASTER MULTI-PHASE ENGINEERING PROMPT

You are working on the existing OyeWell production application.

OyeWell already has a functioning frontend, backend, authentication, food/home experience, location system, delivery architecture, cook/host concepts, admin/management systems, media support, and other existing functionality.

Your task is to **surgically extend the existing system** into a mature local food discovery and social-commerce layer.

This is NOT a request to rebuild OyeWell.

It is an instruction to:

1. Inspect the existing architecture deeply.
2. Understand what already exists.
3. Reuse existing services, components, APIs, database models, authentication, location infrastructure, media infrastructure, management infrastructure, and design system wherever appropriate.
4. Extend existing systems instead of creating duplicate systems.
5. Make only necessary schema/API/frontend changes.
6. Preserve all existing working functionality.
7. Maintain backward compatibility wherever practical.
8. Do not create parallel versions of existing functionality.
9. Do not replace working infrastructure simply because a new implementation seems cleaner.
10. Make surgical, production-quality changes.

The goal is to make OyeWell feel like:

> **TikTok/Instagram-style food discovery + local marketplace + food ordering + local delivery.**

The content should be entertaining and visually rich, but every piece of content can ultimately lead to a real food order.

---

# PHASE 0 — MANDATORY CODEBASE AUDIT

Before changing any code, perform a complete architecture audit.

Do NOT immediately start implementing.

Inspect:

### Frontend

Identify:

- Home page
- Existing hero experience
- Food/feed tabs
- Existing horizontal/vertical swipe interactions
- Existing food cards
- Restaurant UI
- Existing cook/host UI
- Existing dashboards
- Existing media upload components
- Image/video handling
- Authentication screens
- User profile
- Wallet
- Ordering flow
- Delivery flow
- Location selection
- Maps/location services
- Loading states
- Error states
- Modal system
- Toast/notification system
- Design system/components
- Responsive/mobile behavior

### Backend

Identify:

- Authentication service
- User model
- Roles
- Cook/host models
- Restaurant models
- Food/menu models
- Orders
- Payments
- Wallet
- Delivery
- Rider
- Location
- Media
- Notifications
- Chat
- Management/admin
- Moderation
- Reports
- Reviews/ratings
- Existing analytics
- Existing event tracking

### Database

Inspect:

- User
- Role relationships
- Food/menu models
- Vendor/cook models
- Restaurant models
- Orders
- Order items
- Delivery
- Rider
- Location
- Media
- Reviews
- Ratings
- Transactions
- Wallet
- Admin/management
- Moderation
- Any existing engagement models

### Important

Before creating a new table/model, determine whether an existing model can safely support the requirement.

Before creating a new service, determine whether an existing service already handles the responsibility.

Before creating a new endpoint, determine whether an existing endpoint can be extended safely.

Before creating a new component, determine whether an existing component can be extended.

At the end of Phase 0, produce an internal implementation plan identifying:

- Existing components to reuse
- Existing services to extend
- Existing models to extend
- New models genuinely required
- New APIs genuinely required
- Existing APIs requiring extension
- Potential migration risks
- Potential backward compatibility issues

Do not modify production behavior yet.

---

# PHASE 1 — DEFINE THE FOOD CONTENT MODEL

We need to establish an important distinction between:

## FOOD LISTING

A purchasable food item.

Example:

> Afang Soup  
> ₦4,500  
> Serves 2  
> Available Friday

## FOOD POST

A piece of discoverable content created around a food listing.

Example:

> Video showing Afang Soup being prepared.

A cook can therefore have:

```text
Cook
 ├── Food Listing
 │     └── Afang Soup
 │
 └── Food Posts
       ├── Preparation video
       ├── Finished meal photo
       ├── Packaging photo
       └── Availability announcement
```

Do NOT create duplicate food listings simply because the cook creates multiple posts.

A post may reference an existing listing.

A listing may have multiple posts.

---

# PHASE 2 — DATABASE / DOMAIN MODEL

Extend the database surgically.

The exact names should follow the existing naming conventions.

Potential concepts include:

## FoodPost

Fields should conceptually support:

- id
- author/cook ID
- food listing ID where applicable
- caption
- status
- visibility
- createdAt
- updatedAt
- publishedAt
- location/service-area reference
- availability reference
- featured status where applicable
- moderation status

Do not expose a cook's precise private residential address through the public post.

---

## FoodPostMedia

Support:

- image
- video
- ordering/sequence
- thumbnail
- duration where relevant
- processing state
- moderation state
- media URL/reference
- createdAt

A single post must support multiple media items.

Example:

```text
Post
 ├── Video
 ├── Image
 ├── Image
 └── Video
```

---

## FoodPostLike

Must support:

- user
- post
- createdAt

Enforce one active like per user per post.

Use a database uniqueness constraint where appropriate.

---

## FoodPostView / Engagement

Create a meaningful view/engagement mechanism.

Do NOT blindly count every render as a meaningful view.

Avoid inflating views through:

- rapid scrolling
- repeated frontend renders
- duplicate requests
- refreshing
- the cook repeatedly viewing their own post

Design the system so views can later support analytics and feed ranking.

---

## FoodPostInteraction

If an existing analytics/event system exists, reuse it.

Otherwise introduce the smallest appropriate event structure to support:

- view
- like
- unlike
- share if already supported
- order click
- order conversion
- profile/cook click

Do not create unnecessary analytics infrastructure if one already exists.

---

# PHASE 3 — LIKES, VIEWS, ORDERS AND RATINGS MUST BE SEPARATE

This distinction is mandatory.

A:

### Like

means:

> “I like this.”

A like does NOT mean an order.

An:

### Order

means:

> “I purchased this.”

A:

### Rating

means:

> “I experienced/purchased this and am evaluating it.”

Never combine these metrics.

For example:

```text
500 likes
80,000 views
120 orders
4.8 rating
```

These are four different signals.

Do not display them as if they represent the same thing.

---

# PHASE 4 — FOOD DISCOVERY FEED

Build the dedicated food discovery feed.

The product philosophy is:

> **TikTok for food, but local and transactional.**

The feed should feel:

- visual
- fast
- immersive
- smooth
- mobile-first
- highly local
- easy to understand
- commercially useful

Do not make it look like a traditional restaurant directory.

The media should be the primary visual element.

---

# PHASE 5 — LOCAL-FIRST FEED LOGIC

The Food Around You feed must prioritize the user's actual geographic context.

Use the existing location system.

Do not create another unrelated location system.

The system should determine:

- user location
- nearby food
- nearby cooks
- nearby restaurants
- service availability
- delivery feasibility
- current kitchen status

The system must prioritize:

> **What is actually around this user?**

---

# PHASE 6 — LOCAL RELEVANCE RANKING

Do not simply sort everything by distance.

Create a ranking system that can combine:

- proximity
- availability
- engagement
- popularity
- freshness
- successful orders
- customer satisfaction
- repeat orders
- content quality signals
- personalization where sufficient data exists

Conceptually:

```text
Local Relevance =
    proximity
  + availability
  + engagement
  + popularity
  + freshness
  + quality
  + personalization
```

Proximity must remain a major factor.

Do not allow a globally popular item to automatically dominate a local feed.

Example:

Cook A:
- 700m away
- 200 likes
- 4.8 rating
- available now

Cook B:
- 20km away
- 20,000 likes
- 4.9 rating

The local user should generally see Cook A before Cook B in a “Food Around You” experience.

---

# PHASE 7 — LOCAL RADIUS EXPANSION

The system should gracefully expand its search area when insufficient local content exists.

Conceptually:

```text
Immediate local area
        ↓
Nearby area
        ↓
Wider service area
        ↓
City/region
        ↓
External discovery
```

Do not hard-code arbitrary distances throughout the codebase.

Use configurable location/radius settings where possible.

The exact radius should be adjustable by configuration/admin.

If only three legitimate food options exist nearby, show those three.

Do NOT force the feed to fill empty slots with distant content.

---

# PHASE 8 — HOME PAGE LOCAL DISCOVERY

The Home page should also participate in local discovery.

The first few food-related discovery slots should not automatically be dominated by restaurants.

The system should look for:

- featured content
- popular nearby food
- nearby cooks
- nearby restaurants
- available food
- relevant food content

The first 2–3 meaningful discovery items should prioritize local relevance.

If there are only two good local options, show two.

Do not artificially fill the space with irrelevant distant content.

---

# PHASE 9 — FEATURED CONTENT OVERRIDE

Create/administer a controlled Featured mechanism.

Admin should be able to mark suitable restaurant/food content as:

> Featured

Featured content can receive priority placement.

However:

DO NOT hard-code Featured as:

> “Always first forever.”

Instead, treat Featured as a ranking priority signal with:

- start time
- optional end time
- status
- priority
- optional geographic scope
- optional content type

If the existing admin system supports content promotion, reuse it.

---

# PHASE 10 — FOOD POST UI

Build the Food Post experience around visual media.

A post may contain:

- image
- image
- video
- image
- video

The user should be able to swipe through the media in a single post.

The experience should feel similar to modern social platforms without copying proprietary UI exactly.

The main visual should dominate the screen.

Overlay or place beneath it:

- food name
- price
- cook name
- approximate distance
- availability
- preparation estimate
- likes
- rating where meaningful
- Order button

Example:

```text
Fresh Afang Soup

₦4,500

📍 0.7 km away
🕐 Ready in about 2 hours

♡ 234
★ 4.8

[ ORDER NOW ]
```

Use very plain language.

---

# PHASE 11 — FLOATING FOOD POST BUTTON

On the Food discovery section, create a stylish floating action button.

Place it in a safe mobile position, preferably bottom-left if it does not interfere with existing navigation or accessibility controls.

It should be visually polished and subtly animated.

When tapped, it should reveal:

> Post Food

Keep the interaction simple.

Do not make the user learn a complicated menu.

---

# PHASE 12 — NON-COOK POSTING FLOW

The floating button should be visible even to users who are not cooks.

If a non-approved cook selects:

> Post Food

show a friendly modal.

Use simple wording.

Example:

> **Want to share your food?**
>
> To post food on OyeWell, you need to register as a Community Cook first.

Primary button:

> **Become a Cook**

Secondary:

> **Not now**

Do NOT expose technical role terminology.

Do not say:

> “COOK_ROLE_REQUIRED”

Do not say:

> “Authorization failed.”

Everything must use human language.

---

# PHASE 13 — APPROVED COOK POSTING FLOW

If the user is already an approved cook:

```text
Tap +
 ↓
Post Food
 ↓
Create Food Post
```

Do NOT force the cook through unnecessary dashboard navigation.

Posting should be fast.

The cook should be able to:

1. Select food/listing
2. Add photos/videos
3. Add a short caption
4. Confirm availability
5. Preview
6. Publish

If the cook has no listing yet, provide an obvious option:

> **Add Food**

---

# PHASE 14 — MEDIA EXPERIENCE

The posting interface must support both:

### Photos

and

### Videos

A cook can upload multiple pieces of media.

Support:

- preview
- reorder
- delete
- replace
- upload progress
- retry
- validation
- thumbnail generation where applicable
- video processing state
- error handling

Reuse the existing OyeWell media infrastructure.

Do NOT introduce another unrelated upload system.

Optimize for mobile networks.

Handle slow connections gracefully.

---

# PHASE 15 — POST PREVIEW

Before publishing, show a simple preview.

The cook should see approximately what customers will see.

Include:

- media
- food name
- price
- caption
- availability
- approximate location
- delivery/order information where applicable

Buttons:

> **Publish**

and

> **Go back**

Use simple wording.

---

# PHASE 16 — POST STATUS

Posts need explicit states.

At minimum consider:

- Draft
- Under review
- Published
- Paused
- Sold out
- Expired
- Removed

Use the existing moderation/management architecture where possible.

Do not create unnecessary duplicate moderation systems.

---

# PHASE 17 — COOK POST MANAGEMENT

Inside the cook dashboard, provide:

> **My Food Posts**

The cook should easily understand:

- Published
- Drafts
- Paused
- Sold out
- Under review

Allow:

- edit
- delete
- pause
- resume
- duplicate where useful
- change availability
- attach existing listing
- create new listing

The UI must be designed for people who may have very little technical experience.

Do NOT use complicated technical language.

Use:

> “Pause Food”

instead of:

> “Deactivate Listing”

Use:

> “Make Available”

instead of:

> “Activate Inventory”

Use:

> “Change Price”

instead of:

> “Modify Pricing Parameters”

---

# PHASE 18 — FOOD AVAILABILITY

A food post must reflect actual availability.

Possible states:

- Available now
- Available later
- Sold out
- Kitchen closed
- Temporarily unavailable

If a cook closes their kitchen, active food should not remain orderable.

The existing cook/kitchen status system should be reused.

---

# PHASE 19 — FOOD ORDER INTEGRATION

A food post must connect directly to the existing ordering system.

When a customer clicks:

> Order Now

the system should resolve:

- food listing
- current price
- cook
- availability
- preparation time
- service area
- delivery options
- payment
- order creation

Do NOT create a separate order system for Food Posts.

Reuse the existing order service.

The post is the discovery layer.

The existing order system remains the transaction layer.

---

# PHASE 20 — DELIVERY INTEGRATION

The post/order flow must integrate with the existing OyeWell delivery architecture.

Once an order is confirmed:

```text
Food Post
 ↓
Food Listing
 ↓
Order
 ↓
Preparation
 ↓
Delivery Selection
 ↓
Neighborhood / Professional Delivery
 ↓
Rider Assignment
 ↓
Pickup
 ↓
Delivery
 ↓
Confirmation
```

Do not duplicate delivery logic inside the feed.

---

# PHASE 21 — RATINGS

Ratings must be tied to legitimate completed experiences.

A user should not be able to give a food rating simply because they viewed a post.

Rating eligibility should be based on the existing order/completion system.

Where possible:

```text
Completed Order
       ↓
Eligible to Rate
       ↓
Food / Cook Rating
```

Maintain separation between:

- Post likes
- Food ratings
- Cook ratings
- Delivery ratings

If the existing system already has reviews/ratings, extend it rather than creating a parallel one.

---

# PHASE 22 — FEED RANKING SAFETY

Protect the ranking system from obvious manipulation.

Consider:

- duplicate views
- self-likes
- automated requests
- repeated refreshes
- suspicious engagement
- fake accounts
- unusual bursts of engagement

Do not attempt to build an enormous fraud engine in this phase.

Implement sensible foundational protections and leave extension points.

---

# PHASE 23 — COOK PRIVACY

This is extremely important.

Many Community Cooks may operate from private homes.

Never publicly expose:

- exact home address
- apartment number
- private coordinates
- private phone number

unless explicitly required and authorized.

Public users should generally see:

> 0.7 km away

or:

> Ikeja

or another safe approximate area.

The actual pickup location can remain available only to the relevant operational systems:

- order system
- delivery system
- authorized rider
- management/admin where required

---

# PHASE 24 — FEED PERFORMANCE

The Food Feed must be extremely fast.

Optimize:

- image loading
- video loading
- lazy loading
- prefetching
- caching
- pagination
- cursor-based feed retrieval where appropriate
- CDN/media delivery
- database indexes
- geospatial queries
- ranking computation
- API response sizes

Do NOT load hundreds of posts at once.

Load a small amount ahead of the user's position.

For example:

```text
Current post
+
small prefetch window
```

This should make swiping feel immediate.

---

# PHASE 25 — MOBILE NETWORK OPTIMIZATION

OyeWell is being built for real-world users, including users with unreliable or expensive mobile internet.

Optimize media delivery for:

- slow networks
- mobile data
- interrupted uploads
- interrupted downloads
- retry
- compressed images
- adaptive video quality where supported

Do not make the feed unusable on poor connections.

---

# PHASE 26 — ANALYTICS

Track meaningful product events using the existing analytics infrastructure.

At minimum:

- food post viewed
- meaningful view
- food post liked
- food post unliked
- food profile/cook opened
- listing opened
- order button clicked
- order started
- order completed
- post shared if sharing exists
- post reported
- post hidden
- cook published post

Do not create duplicate analytics infrastructure if an existing system is present.

---

# PHASE 27 — ADMIN / MANAGEMENT

Integrate Food Posts into the existing Management service.

Admins should be able to:

- view posts
- search posts
- filter posts
- view cook
- view listing
- view engagement
- view orders generated
- feature/unfeature
- hide
- remove
- restore where appropriate
- inspect reports
- inspect moderation history

Every important administrative action should be auditable if an audit system exists.

Reuse existing management/audit infrastructure.

---

# PHASE 28 — REPORTING

Users should have a simple way to report inappropriate or problematic food content.

Example:

> **Report this post**

Then simple reasons:

- Something is wrong with this food
- Misleading information
- Inappropriate content
- Spam
- Other

Do not overwhelm ordinary users with technical categories.

The report should enter the existing moderation/management system.

---

# PHASE 29 — MODERATION

Use the existing management/admin tier architecture.

Food posts should support moderation actions.

Moderators should be able to:

- review
- hide
- remove
- escalate
- restore
- suspend posting privileges where authorized

Do not give every administrator unrestricted destructive access.

Respect existing management tiers and permissions.

---

# PHASE 30 — LOCATION-AWARE MODERATION

Where the existing management system supports location-specific moderators, allow appropriate local moderators to handle relevant food/delivery reports.

For example:

A local delivery issue in a specific Nigerian community may be better handled by a moderator familiar with that location.

However:

- do not expose unnecessary private location data
- enforce permissions
- maintain audit logs
- prevent moderators from accessing unrelated regions

Reuse the existing Management Service.

---

# PHASE 31 — SIMPLE LANGUAGE REQUIREMENT

This requirement applies to the ENTIRE implementation.

The UI must be understandable to ordinary people.

Avoid:

- technical jargon
- developer terminology
- complicated financial terminology
- unnecessary English complexity
- confusing abbreviations

Prefer:

> “Post Food”

instead of:

> “Create Content”

Prefer:

> “Your Food”

instead of:

> “Inventory Management”

Prefer:

> “Kitchen Closed”

instead of:

> “Vendor Availability Disabled”

Prefer:

> “Try Again”

instead of:

> “Retry Request”

The interface should be understandable by someone with basic education and little or no technical experience.

This is a global requirement, not just a Nigerian requirement.

---

# PHASE 32 — ACCESSIBILITY

Ensure:

- readable text
- sufficient contrast
- large touch targets
- clear buttons
- understandable icons
- keyboard accessibility where relevant
- screen reader labels where appropriate
- no critical action dependent only on color
- motion can be reduced where appropriate

The feed must remain usable even if animations are reduced.

---

# PHASE 33 — RESPONSIVE DESIGN

The primary experience is mobile-first.

Test:

- small Android phones
- larger Android phones
- iPhone-sized screens
- tablets
- desktop

The feed should not become an awkward stretched mobile UI on desktop.

Use responsive layouts.

---

# PHASE 34 — ERROR STATES

Every asynchronous operation must have appropriate handling.

Examples:

Media upload fails:

> **Upload failed. Try again.**

Feed unavailable:

> **We couldn't load food nearby. Try again.**

Location unavailable:

> **We couldn't find your location. Choose your area.**

Food becomes unavailable:

> **This food is no longer available.**

Do not show raw API/database errors to users.

---

# PHASE 35 — EMPTY STATES

Create polished empty states.

Example:

> **No food nearby yet**
>
> We're still finding food around you.

Then potentially:

> **See food a little farther away**

or:

> **Explore more food**

Do not show an empty blank screen.

---

# PHASE 36 — SECURITY

Review every new API.

Ensure:

- authenticated actions require authentication
- only approved cooks can publish
- users can only modify their own posts
- users can only delete their own content where allowed
- likes cannot be created arbitrarily for another user
- ratings require eligibility
- admin actions require appropriate permissions
- moderator permissions are enforced server-side
- location data is protected
- media upload authorization is enforced
- rate limiting exists where appropriate
- validation occurs server-side

Never trust frontend role checks as the only authorization mechanism.

---

# PHASE 37 — DATABASE INDEXING

Review database indexes for:

- cook ID
- food listing ID
- post status
- publication date
- availability
- location/service area
- likes
- engagement
- featured state
- moderation status

If using geospatial queries, ensure the database strategy is appropriate.

Do not create unnecessary indexes that negatively impact write performance.

---

# PHASE 38 — BACKWARD COMPATIBILITY

Existing functionality must continue working.

Especially verify:

- Home
- restaurants
- existing menus
- existing orders
- payments
- wallets
- delivery
- professional riders
- neighborhood riders
- cook dashboards
- authentication
- admin management
- chat
- notifications

Do not break existing APIs.

If a schema migration is required:

1. Make it safe.
2. Preserve existing records.
3. Provide migration logic.
4. Handle null/default values.
5. Test rollback implications where practical.

---

# PHASE 39 — TESTING

Create/update tests for:

### Backend

- post creation
- post editing
- post deletion
- publishing
- cook authorization
- media attachment
- multiple media
- likes
- duplicate likes
- views
- ranking
- location filtering
- availability
- featured content
- ratings
- reporting
- moderation
- order integration

### Frontend

- food feed
- swiping
- media carousel
- video
- floating action button
- non-cook flow
- cook flow
- posting
- preview
- editing
- liking
- ordering
- error states
- loading states

### Integration

Test:

```text
Cook
 ↓
Create Listing
 ↓
Create Post
 ↓
Publish
 ↓
Customer discovers post
 ↓
Customer opens post
 ↓
Customer orders
 ↓
Order created
 ↓
Delivery selected
 ↓
Delivery completed
 ↓
Customer rates
```

---

# PHASE 40 — PERFORMANCE TESTING

Check:

- feed initial load
- feed scroll/swipe
- image loading
- video startup
- API latency
- geospatial query performance
- ranking performance
- database query count
- N+1 queries
- mobile network behavior

Do not solve performance by simply adding aggressive caching that could display stale availability or prices.

Be particularly careful with:

- food availability
- price
- kitchen status
- orderability

These must remain trustworthy.

---

# PHASE 41 — UI QUALITY BAR

The final UI should feel:

- premium
- modern
- warm
- friendly
- elegant
- simple
- fast
- local
- trustworthy

Do NOT make it look like an admin dashboard.

Do NOT make the food feed look like a database table.

Do NOT overload the screen with text.

Food media should remain visually dominant.

---

# PHASE 42 — DO NOT OVERBUILD

Do not build unnecessary functionality simply because it could be useful later.

Build the foundation correctly.

Leave clean extension points for future:

- follows
- comments
- saves
- shares
- creator subscriptions
- live cooking
- personalized recommendations
- sponsored food posts
- creator analytics
- promotions
- loyalty
- referral systems

But do not implement these unless they are already part of the existing system or explicitly required.

---

# PHASE 43 — FINAL INTEGRATION

After implementation, verify that the complete ecosystem works as one system:

```text
                OYEWELL
                   │
        ┌──────────┴──────────┐
        │                     │
      HOME               FOOD DISCOVERY
        │                     │
        │              Local Food Posts
        │                     │
        │               Food Listings
        │                     │
        │                 Cooks
        │                     │
        └──────────┬──────────┘
                   │
                 ORDER
                   │
              PAYMENT
                   │
          DELIVERY SELECTION
             /           \
Neighborhood Delivery   Professional
             \           /
               RIDER
                 │
               PICKUP
                 │
              DELIVERY
                 │
             CONFIRM
                 │
               RATE
                 │
              FEEDBACK
                 │
          FUTURE DISCOVERY
```

The system should feel like one coherent product rather than several unrelated modules.

---

# PHASE 44 — SURGICAL IMPLEMENTATION RULE

Throughout the implementation:

### DO

- inspect before modifying
- reuse existing code
- reuse existing services
- reuse existing components
- reuse existing database structures
- extend existing APIs
- preserve existing behavior
- add migrations safely
- add tests
- document important architectural decisions

### DO NOT

- rebuild authentication
- rebuild orders
- rebuild payments
- rebuild wallets
- rebuild delivery
- rebuild maps
- create duplicate user systems
- create duplicate cook systems
- create duplicate media systems
- create duplicate admin systems
- create duplicate notification systems
- create duplicate rating systems

unless the audit proves the existing implementation cannot support the requirement.

---

# PHASE 45 — IMPLEMENTATION ORDER

Implement in this order:

## STEP 1

Architecture audit.

## STEP 2

Database/domain model extensions.

## STEP 3

Backend Food Post service.

## STEP 4

Media/post APIs.

## STEP 5

Likes/views/engagement.

## STEP 6

Location-aware feed query.

## STEP 7

Ranking engine.

## STEP 8

Featured content support.

## STEP 9

Customer Food Feed UI.

## STEP 10

Floating Post button.

## STEP 11

Cook posting flow.

## STEP 12

Multi-image/video posting.

## STEP 13

Post management inside cook dashboard.

## STEP 14

Order integration.

## STEP 15

Ratings integration.

## STEP 16

Reporting/moderation integration.

## STEP 17

Admin/management integration.

## STEP 18

Performance optimization.

## STEP 19

Security review.

## STEP 20

Automated testing.

## STEP 21

End-to-end testing.

## STEP 22

Final architecture cleanup.

---

# FINAL INSTRUCTION

Do not simply tell me what you would build.

Inspect the actual OyeWell codebase and implement the feature.

Before each major phase, identify what existing code is being reused and what genuinely needs to be added.

If an existing component/service/model already solves part of the problem, extend it instead of creating a competing implementation.

Do not blindly trust assumptions about the codebase.

Verify them.

Do not make broad rewrites.

Do not rename unrelated existing systems.

Do not change working behavior unless required for this feature.

The result should be production-quality and integrated into the existing OyeWell architecture.

Most importantly:

> **OyeWell's Food Discovery feed is not merely a menu page. It is a local food content and commerce layer.**

People should be able to:

**Discover → Watch → Like → Learn → Order → Receive → Rate → Discover again.**

Build the architecture so that this loop is fast, local, reliable, safe, and easy for ordinary people to understand.