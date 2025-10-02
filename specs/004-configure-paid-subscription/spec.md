# Feature Specification: Subscription Tiers & Rate Limiting

**Feature Branch**: `004-configure-paid-subscription`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "configure paid subscription version of voygent with a free level that allows one active itinerary and rate limiting to prevent abuse of the free tier."

## Execution Flow (main)
```
1. Parse user description from Input
   → Identified: subscription tiers (free + paid), itinerary limits, rate limiting for abuse prevention
2. Extract key concepts from description
   → Actors: free users, paid subscribers, system administrators
   → Actions: create itineraries, upgrade subscription, enforce limits, prevent abuse
   → Data: subscription plans, usage quotas, rate limits, active itineraries
   → Constraints: free tier limited to 1 active itinerary, rate limiting required
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What paid tiers exist beyond free?]
   → [NEEDS CLARIFICATION: What rate limiting thresholds?]
   → [NEEDS CLARIFICATION: What happens when limits are exceeded?]
4. Fill User Scenarios & Testing section
   → User flow: Sign up free → Create itinerary → Hit limit → Upgrade → More access
5. Generate Functional Requirements
   → Each requirement testable
6. Identify Key Entities
   → Subscription, SubscriptionTier, RateLimit, UsageQuota, Itinerary
7. Run Review Checklist
   → WARN "Spec has uncertainties" (clarifications needed)
8. Return: SUCCESS (spec ready for planning with clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a travel agent, I want to try Voygent AI with a free tier that allows me to create one active trip itinerary to evaluate the platform, and if I find value, upgrade to a paid subscription for unlimited itineraries and higher usage limits, while the system prevents abuse of the free tier through rate limiting.

### Acceptance Scenarios

**Free Tier User Journey:**
1. **Given** a new user signs up for the free tier, **When** they access Voygent AI, **Then** they can create 1 active itinerary
2. **Given** a free user has 1 active itinerary, **When** they attempt to create a second active itinerary, **Then** the system blocks creation and prompts them to upgrade or archive the existing itinerary
3. **Given** a free user archives their itinerary, **When** they create a new itinerary, **Then** the system allows it (maintaining the 1 active limit)
4. **Given** a free user exceeds rate limits, **When** they make additional requests, **Then** the system temporarily blocks requests and displays a message [NEEDS CLARIFICATION: What rate limit thresholds? Requests per hour/day?]
5. **Given** a free user is rate limited, **When** the cooldown period expires, **Then** the system allows normal usage again

**Paid Tier User Journey:**
6. **Given** a free user wants more itineraries, **When** they upgrade to a paid tier, **Then** their itinerary limit increases immediately [NEEDS CLARIFICATION: What are the paid tier limits? Unlimited or specific number?]
7. **Given** a paid user creates multiple itineraries, **When** they work on different client trips, **Then** all itineraries remain active without archiving
8. **Given** a paid user makes frequent requests, **When** usage is monitored, **Then** they experience [NEEDS CLARIFICATION: Higher rate limits, or no rate limits at all?]

**Subscription Management:**
9. **Given** a paid user's subscription expires, **When** the billing period ends without renewal, **Then** [NEEDS CLARIFICATION: Do they revert to free tier? Grace period? Itineraries archived?]
10. **Given** a paid user cancels their subscription, **When** they continue using Voygent, **Then** [NEEDS CLARIFICATION: Immediate downgrade or finish current billing period?]

**Abuse Prevention:**
11. **Given** a free user attempts to abuse the system through rapid account creation, **When** suspicious patterns are detected, **Then** [NEEDS CLARIFICATION: IP-based blocking? Email verification requirements? Cooldown periods?]
12. **Given** a user attempts to circumvent rate limits, **When** the system detects the attempt, **Then** [NEEDS CLARIFICATION: Temporary ban? Permanent ban? Admin notification?]

### Edge Cases
- What happens if a free user upgrades while rate-limited?
- How does the system handle users who had multiple active itineraries before the subscription system was implemented (legacy users)?
- What if a paid user downgrades mid-billing cycle with 5 active itineraries?
- Should archived itineraries count toward storage limits?
- How are "active" vs "archived" itineraries defined?
- What if a user shares their account to circumvent limits?
- Should trial periods be offered for paid tiers?
- How to handle partial month billing if user upgrades mid-cycle?
- What happens to active itineraries if payment fails?

## Requirements

### Functional Requirements

**Subscription Tiers**
- **FR-001**: System MUST provide a free tier with 1 active itinerary limit
- **FR-002**: System MUST provide [NEEDS CLARIFICATION: How many paid tiers? (Basic, Pro, Enterprise?) What are their names and itinerary limits?]
- **FR-003**: System MUST [NEEDS CLARIFICATION: What features differ between tiers besides itinerary limits? (AI model access, MCP tool access, publishing, support level?)]
- **FR-004**: System MUST display current subscription tier to users
- **FR-005**: System MUST show remaining itinerary quota to users
- **FR-006**: System MUST allow users to view subscription tier benefits and pricing

**Itinerary Limits**
- **FR-007**: System MUST enforce 1 active itinerary limit for free tier users
- **FR-008**: System MUST allow free users to archive itineraries to free up their active slot
- **FR-009**: System MUST allow free users to restore archived itineraries (replacing their active one)
- **FR-010**: System MUST prevent free users from creating a second active itinerary
- **FR-011**: System MUST [NEEDS CLARIFICATION: What is the itinerary limit for paid tiers? Unlimited or specific numbers?]
- **FR-012**: System MUST [NEEDS CLARIFICATION: Do archived itineraries remain accessible? Read-only or editable?]

**Rate Limiting (Free Tier)**
- **FR-013**: System MUST implement rate limiting for free tier users
- **FR-014**: Rate limits MUST prevent abuse while allowing legitimate use
- **FR-015**: System MUST [NEEDS CLARIFICATION: What rate limits? (Requests per hour, API calls per day, token usage per day, conversations per day?)]
- **FR-016**: System MUST display rate limit status to users [NEEDS CLARIFICATION: Always visible or only when approaching limit?]
- **FR-017**: System MUST notify users when they approach rate limits [NEEDS CLARIFICATION: At what percentage? 80%, 90%?]
- **FR-018**: System MUST block requests when rate limit is exceeded
- **FR-019**: System MUST display clear error messages when rate limited [NEEDS CLARIFICATION: Include time until reset? Suggest upgrade?]
- **FR-020**: System MUST reset rate limits after [NEEDS CLARIFICATION: What time period? Hourly, daily, monthly?]

**Rate Limiting (Paid Tiers)**
- **FR-021**: System MUST [NEEDS CLARIFICATION: Do paid tiers have rate limits? If so, what are they?]
- **FR-022**: System MUST [NEEDS CLARIFICATION: How do rate limits scale with paid tiers? Higher limits or no limits?]

**Subscription Management**
- **FR-023**: Users MUST be able to upgrade from free to paid tier
- **FR-024**: Users MUST be able to downgrade from paid to free tier [NEEDS CLARIFICATION: Allowed? Immediate or at end of billing period?]
- **FR-025**: System MUST handle subscription changes during active billing period [NEEDS CLARIFICATION: Pro-rated billing? Immediate change or deferred?]
- **FR-026**: System MUST [NEEDS CLARIFICATION: What payment methods? (Stripe, credit card, PayPal?)]
- **FR-027**: System MUST handle failed payments [NEEDS CLARIFICATION: Retry policy? Grace period? Immediate downgrade?]
- **FR-028**: System MUST send billing notifications [NEEDS CLARIFICATION: Upcoming renewal, payment failed, subscription expired?]

**Abuse Prevention**
- **FR-029**: System MUST detect and prevent rapid account creation from same source
- **FR-030**: System MUST [NEEDS CLARIFICATION: Track by IP address, email domain, payment fingerprint, or combination?]
- **FR-031**: System MUST [NEEDS CLARIFICATION: Should system implement CAPTCHA or email verification for free signups?]
- **FR-032**: System MUST log abuse attempts for review
- **FR-033**: System MUST [NEEDS CLARIFICATION: Automatically block abusive users or flag for admin review?]
- **FR-034**: Administrators MUST be able to manually adjust rate limits or ban users

**Migration & Legacy**
- **FR-035**: System MUST handle existing users without subscriptions [NEEDS CLARIFICATION: Auto-assign to free tier? Grandfather unlimited?]
- **FR-036**: System MUST handle users with multiple active itineraries when subscription system launches [NEEDS CLARIFICATION: Allow to keep? Force archive? Grandfather in?]

### Key Entities

- **Subscription**: Represents a user's subscription to Voygent AI
  - Attributes: user ID, tier, start date, end date, status (active, expired, cancelled), billing cycle, payment method
  - Relationship: Associated with User, references SubscriptionTier, tracks UsageQuota

- **SubscriptionTier**: Represents available subscription plans
  - Attributes: tier name (Free, Pro, Enterprise), itinerary limit, rate limits, features included, price, billing period
  - Relationship: Referenced by Subscription, defines limits enforced by system

- **UsageQuota**: Represents current usage against subscription limits
  - Attributes: user ID, active itinerary count, requests today/hour, tokens used today, last reset timestamp
  - Relationship: Associated with Subscription, enforced by RateLimit policies

- **RateLimit**: Represents rate limiting rules and enforcement
  - Attributes: limit type (requests, tokens, itineraries), threshold, time window, cooldown period, current count
  - Relationship: Applied to Subscription based on SubscriptionTier, tracks violations

- **Itinerary**: Represents a travel itinerary created by user
  - Attributes: ID, user ID, status (active, archived), creation date, last modified, trip details
  - Relationship: Owned by User, counted against SubscriptionTier itinerary limit

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain *(30 clarifications needed)*
- [ ] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (30 clarification points)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed *(blocked on clarifications)*

---

## Next Steps

**Required Clarifications (30)**:

**Subscription Tiers:**
1. How many paid tiers exist? (Basic/Pro/Enterprise? Just one paid tier?)
2. What are the names of each tier?
3. What are the itinerary limits for each paid tier? (Unlimited or specific numbers like 10, 50, 100?)
4. What features differ between tiers besides itinerary limits? (AI models, MCP tools, publishing, support?)
5. What are the prices for each paid tier?
6. What billing periods are supported? (Monthly, annual, both?)

**Itinerary Management:**
7. Do archived itineraries remain accessible?
8. Are archived itineraries read-only or editable?
9. Do archived itineraries count toward storage limits?
10. How is "active" vs "archived" defined?

**Rate Limiting - Free Tier:**
11. What specific rate limits for free tier? (Requests per hour/day? API calls? Token usage? Conversations?)
12. What are the exact numeric thresholds? (e.g., 100 requests/hour, 1000 tokens/day)
13. When should users be notified about approaching limits? (80%, 90%?)
14. What time period for rate limit reset? (Hourly, daily, monthly?)
15. Should rate limit status always be visible or only when approaching limit?
16. Should rate limit error messages suggest upgrade option?

**Rate Limiting - Paid Tiers:**
17. Do paid tiers have rate limits?
18. If so, what are the rate limits for each paid tier?
19. Are paid tier rate limits significantly higher or removed entirely?

**Subscription Changes:**
20. Can paid users downgrade to free? If so, when does it take effect?
21. How are mid-cycle changes handled? (Pro-rated billing, credit, immediate change, deferred to next cycle?)
22. What payment methods are supported? (Stripe, credit card, PayPal, invoice?)
23. What happens when payment fails? (Retry policy, grace period, immediate downgrade?)
24. What billing notifications are sent? (Upcoming renewal, failed payment, cancellation confirmation?)

**Downgrade Handling:**
25. If paid user downgrades with multiple active itineraries, what happens? (Force archive some? Allow to keep temporarily?)
26. Is there a grace period after subscription expires before enforcing free tier limits?

**Abuse Prevention:**
27. How to track abuse? (IP address, email domain, payment fingerprint, device fingerprint, or combination?)
28. Should system implement CAPTCHA or email verification for free signups?
29. Should abusive users be automatically blocked or flagged for admin review?
30. What constitutes "suspicious patterns" in account creation?

**Migration & Legacy:**
31. How to handle existing users when subscription system launches? (Auto-assign to free? Grandfather unlimited?)
32. How to handle users with multiple active itineraries before launch? (Allow to keep? Force archive? Grandfather?)

**Dependencies:**
- User authentication and account management system
- Payment processing integration (e.g., Stripe)
- Usage tracking and analytics system
- Notification system (email, in-app)
- Admin dashboard for subscription management

**Assumptions:**
- Free tier is designed for evaluation/trial, not long-term production use
- Paid tiers provide revenue to sustain service operations
- Rate limiting should be generous enough to not frustrate legitimate free users
- Most free users will upgrade if they find value
- Abuse will be attempted and must be actively prevented
- Subscription changes should be self-service where possible
