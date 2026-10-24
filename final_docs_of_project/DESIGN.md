# Pixel Store --- Design System & UI/UX Specification

**Document:** `DESIGN.md`\
**Project:** Pixel Store --- E-commerce Website\
**Status:** Design baseline for MVP implementation\
**Language:** English storefront\
**Currency:** EGP\
**Primary visual reference:** TechHub\
**Brand tagline:** Tech for a Better You.

------------------------------------------------------------------------

## 1. Purpose and Scope

This document defines the approved visual direction, reusable design
system, storefront page structure, responsive behavior, and
customer-facing interaction states for the Pixel Store MVP. It is the
design reference for creating screens in Google Stitch and later
implementing them in the application.

This document complements --- and does not replace --- the approved SRS,
Use Cases/User Stories, and Workflow Diagrams. Backend business rules
remain authoritative. UI mockups must not imply that a backend action
succeeded when it has not.

### In-scope screens

Six primary screen groups:

1.  Homepage
2.  Shop / Category Listing
3.  Product Details
4.  Cart
5.  Checkout, including the order-creation result state
6.  Login / Register

Supporting views/states that are part of the customer journey, not a new
primary feature scope:

-   Order Details / Order History, reachable from the order result and
    customer account.
-   Email verification and verification-needed states.
-   Empty, loading, error, unavailable, and success states.
-   Static pages linked from the footer: About, Contact, Shipping
    Policy, Return & Refund, Privacy, and Terms.

The Admin Dashboard is not part of the six-screen Stitch storefront
scope. Its workflow affects customer-facing status and messages, but its
administrative screens should not be designed as part of this storefront
baseline.

### Requirements authority

-   The SRS v1.0 is the approved MVP requirements baseline.
-   Use Cases/User Stories and Workflow Diagrams define user journeys
    and operational details.
-   When a visual mockup conflicts with these sources, follow the
    requirements and workflows.
-   This is a UI/UX document, not a technical architecture, API
    contract, or security implementation specification.

------------------------------------------------------------------------

## 2. Brand Identity

### Brand assets

-   Use the supplied Pixel Store logo artwork.
-   Header: use the complete horizontal white logo on the approved dark
    petrol-green header/background treatment.
-   Footer: use the complete horizontal logo in the appropriate supplied
    version for the footer background.
-   Do not redraw, re-proportion, recolor arbitrarily, or recreate the
    logo as text.
-   Use the brand tagline **"Tech for a Better You."** where
    appropriate, such as the footer or brand presentation.

### Color palette

  -----------------------------------------------------------------------
  Token                   Color                   Intended use
  ----------------------- ----------------------- -----------------------
  Primary / Deep Petrol   `#153F3A`               Primary actions,
  Green                                           prominent brand
                                                  surfaces, key headings
                                                  and accents

  Warm Off-White          `#F6F0EB`               Main page background
                                                  and soft section
                                                  backgrounds

  White                   `#FFFFFF`               Cards, content
                                                  surfaces, contrast
                                                  areas and logo variants

  Warm Red                `#D94B3D`               Restrained
                                                  discount/sale
                                                  indicators and small
                                                  urgent accents
  -----------------------------------------------------------------------

Rules:

-   Petrol green is the primary brand color.
-   Red is a limited accent, especially for genuine discounts; do not
    use it as a general-purpose color for all buttons or decorations.
-   Use off-white and white to preserve a clean, calm layout and
    product-image clarity.
-   Keep text contrast legible. Do not place small text on low-contrast
    color combinations.
-   Do not invent additional brand colors without a concrete
    accessibility or UI-state need. Neutral borders and subdued text may
    use accessible tints derived from the approved palette.

### Typography

-   Typeface: **Inter**.
-   Direction: modern technology retail; confident, clear, and
    practical.
-   Use a clear hierarchy: large bold hero heading, compact section
    headings, readable product names, prominent current prices, and
    quieter supporting text.
-   Storefront copy is English. Components must be built with future
    Arabic/RTL support in mind, but the MVP design is English LTR.

### Shape and spacing

-   Buttons: rounded rectangles with modest rounding, similar to the
    TechHub reference.
-   Cards and inputs: soft, medium-radius corners; subtle borders and
    restrained shadows.
-   Spacing: comfortable and consistent; avoid dense layouts and
    excessive empty space.
-   Motion: subtle, short transitions. Avoid distracting animation or
    motion that delays common shopping tasks.

------------------------------------------------------------------------

## 3. Visual Direction and Reference Use

### Primary reference: TechHub

TechHub is the main visual reference for the storefront's composition
and retail feel. Other supplied references --- Sigma Computer, Hankerz,
and El Badr --- are secondary inspiration only.

### Hero --- preserve the selected reference composition

The Homepage Hero is a specifically approved direction and must remain
faithful to the TechHub reference:

-   Warm off-white background.
-   Large, bold petrol-green headline on the left.
-   One short phrase in a contrasting brand accent, used sparingly.
-   Supporting description and clear calls to action beneath the
    headline.
-   Large computer-component imagery on the right, balanced with a
    petrol-green geometric shape.
-   Similar balance, hierarchy, and spacing to the reference.
-   Adapt the wording to Pixel Store; do not change the approved
    composition into a different hero concept.
-   On mobile, stack the content vertically while preserving the same
    visual identity and clear CTA hierarchy.

Do not redesign this Hero merely to make the page look more novel.

------------------------------------------------------------------------

## 4. Global Storefront Layout

### Header and navigation

Use classic navigation:

-   Left: supplied horizontal white Pixel Store logo.
-   Center: primary navigation links.
-   Right: Search, Wishlist, Cart, and Account icons.
-   Search is expandable: tapping/clicking the search icon reveals a
    search field.
-   Keep the header uncluttered and consistent across primary pages.
-   The mobile header simplifies navigation and makes essential actions
    accessible without overcrowding.

The Wishlist icon is present in the header, but a separate Wishlist page
is not part of the current six-screen scope. Do not expand the scope by
designing a dedicated Wishlist page now.

### Footer

Use a balanced footer with:

-   Logo and a short brand description/tagline.
-   Store/navigation links.
-   Customer-service links.
-   Policy links: About, Contact, Shipping Policy, Return & Refund,
    Privacy, and Terms.

Do not invent phone numbers, email addresses, addresses, shipping
promises, return conditions, legal text, or other operational claims.
Use approved real content when available; otherwise use clearly marked
placeholders in mockups and do not present them as real store
information.

No Newsletter block or separate Store Benefits section is included in
the approved Homepage structure.

------------------------------------------------------------------------

## 5. Homepage Structure

Build the Homepage in this exact order:

1.  Header
2.  Hero
3.  Horizontal Categories Bar
4.  Deals section
5.  Shop by Category
6.  Featured Products
7.  Footer

### 5.1 Horizontal Categories Bar

-   Place immediately below the Hero.
-   Display category names with simple icons in a horizontal bar,
    following the TechHub reference.
-   Keep the bar scannable and consistent with the brand.
-   Allow horizontal scrolling or responsive wrapping when needed on
    narrow screens.

### 5.2 Deals

-   Display a grid of regular product cards.
-   Show a small red discount badge only when a genuine active discount
    exists.
-   Show current price and previous price only when the previous price
    and discount are real and valid.
-   Place a neighboring explanatory card describing the WhatsApp
    ordering process, replacing the "Shop with Confidence" style card in
    the primary reference.
-   Explain the process in four short steps:
    1.  Choose products
    2.  Review order
    3.  Send via WhatsApp
    4.  Wait for store confirmation
-   State clearly that sending a WhatsApp message does **not**
    automatically confirm an order.

### 5.3 Shop by Category

Use simple icons, not product photographs, for these approved
categories:

-   Graphics Cards
-   Processors
-   Motherboards
-   RAM
-   Storage
-   Monitors
-   PC Cases
-   Power Supplies

### 5.4 Featured Products

-   Show products selected by the Admin as featured.
-   Do not label them "Best Sellers" unless the system has real data and
    the label is accurate.
-   Reuse the shared product-card component.

### 5.5 Deferred content

-   Do not include Shop by Brand in the current Homepage.
-   Do not reserve an empty placeholder section for Shop by Brand.
-   Do not add Newsletter or Store Benefits sections.

------------------------------------------------------------------------

## 6. Shared Product Card

Product cards should be clean and minimal.

Required visual content, when data exists:

-   Product image.
-   Product name.
-   Current price in EGP.
-   Add to Cart action.
-   Secondary Wishlist icon.

Conditional content:

-   Previous price and discount badge only for a genuine discount.
-   Product condition (`New` or `Used`) where relevant.
-   Rating only when real rating data exists.
-   Specifications and availability cues only when accurate and useful.
-   Variant selection belongs on Product Details or in an explicit
    variant-selection interaction when a product cannot be purchased
    without selecting a variant.

Rules:

-   Never invent reviews, ratings, stock quantities, discounts, brands,
    or specifications.
-   Products with zero stock may remain visible if published, but must
    not look purchasable. Use a clear unavailable/out-of-stock state and
    disable purchase actions.
-   Do not expose exact stock quantities or internal low-stock
    thresholds to public customers.
-   Do not show hidden/unpublished products.
-   Product price and availability must reflect the selected purchasable
    variant when variants exist.
-   Add-to-cart success feedback is a temporary toast: **"Added to
    cart"**, shown only after the add operation actually succeeds.
-   If the action fails, show a clear error and do not show a success
    toast.

------------------------------------------------------------------------

## 7. Primary Screen Specifications

### 7.1 Homepage

Purpose: introduce the brand, provide a direct path into categories and
deals, and make the ordering method clear.

Must include the approved structure in Section 5. Keep the
TechHub-inspired Hero intact. The page should feel like a real
computer-hardware store rather than a generic marketplace template.

### 7.2 Shop / Category Listing

Include:

-   Page title and selected category context.
-   Search field or search entry point.
-   Filters for category, brand, price range, and availability.
-   Sort options supported by the SRS:
    -   Price: low to high
    -   Price: high to low
    -   Newest
    -   Name: A--Z
-   Product grid using the shared product card.
-   Pagination.
-   Loading state, no-results state, filter-validation feedback, and
    recoverable error state.
-   Clear unavailable presentation for visible products that cannot
    currently be purchased.

Do not invent filter types or sorting options outside the approved
requirements without a later product decision.

### 7.3 Product Details

Include, as applicable to the real product data:

-   Product name and current price in EGP.
-   Multiple product images, with a primary image and a clear way to
    inspect other images.
-   Description and category-specific specifications.
-   Brand, SKU when appropriate, and condition (`New` or `Used`).
-   Variant selector when variants exist.
-   Quantity control with valid minimum and stock-aware limits.
-   Availability state and Add to Cart action.
-   Clear unavailable state when the product or selected variant cannot
    be purchased.

Do not imply a variant has the same price or availability as another
variant. Recalculate and validate before purchase actions.

### 7.4 Cart

Include:

-   Cart items with product/variant details, image, unit price,
    quantity, and line subtotal.
-   Quantity adjustment and item removal.
-   Clear cart action, with a reasonable confirmation interaction if
    needed.
-   Coupon input and applied-discount feedback.
-   Subtotal and discount breakdown.
-   Checkout CTA.
-   Empty-cart state and errors for unavailable items, invalid
    quantities, or stale prices.

Rules:

-   The cart persists across logout and devices according to the SRS.
-   The cart is not a stock reservation.
-   Revalidate price, variant state, and stock at checkout.
-   If a cart item becomes unavailable, explain it and ask the customer
    to update the cart; do not silently fulfill it.
-   Checkout requires authentication and verified email.
-   Never clear the cart because of a failed order-creation attempt. The
    cart is cleared only after the order-creation transaction succeeds.

### 7.5 Checkout

Design a clear, low-friction flow with these parts:

1.  Authentication/verification gate.
2.  Delivery details.
3.  Order review and coupon/discount summary.
4.  Terms agreement and submit action.
5.  Order-creation result state.

Required shipping fields:

-   Recipient name
-   Mobile number
-   Governorate
-   City/area
-   Street
-   Building number

Optional fields:

-   Floor
-   Apartment
-   Landmark

Order review must distinguish known amounts from amounts not yet
finalized:

-   Show current product subtotal and applicable discount.
-   Show that the final shipping fee and final total are confirmed by
    the store after review.
-   Do not invent or present a shipping fee as final before the Admin
    sets it.
-   Payment method: Cash on Delivery only for the MVP.
-   Include a terms agreement before submission.
-   Show field-level validation errors and recoverable submission
    errors.

The server is authoritative for prices, discounts, coupon eligibility,
and totals. The interface must not imply that client-side calculations
are final.

#### Checkout result state

After successful order creation:

-   Show the order number/reference.
-   Show status `Pending`.
-   Explain that the order has been saved but is not yet confirmed.
-   Offer a button to open WhatsApp with a contextual, prefilled
    message.
-   Tell the customer they must press Send in WhatsApp themselves.
-   Explain that the store reviews the order, determines shipping/final
    total, and follows up.
-   Provide an Order Details / Order History link.
-   Provide a retry action to reopen WhatsApp if it could not be opened
    or the message was not sent.
-   Do not claim WhatsApp was sent or received unless the system has
    reliable evidence; the workflow does not automatically verify
    sending.
-   If WhatsApp fails, preserve the saved order and its reference.

On order-creation failure:

-   Show a clear retryable or validation error.
-   Preserve the cart.
-   Do not display a success state or create the impression that a
    duplicate order was created.

#### Order Details / Order History supporting view

This is a supporting customer view linked from the checkout result and
account, not a change to the six primary screen groups.

-   Show only the signed-in customer's own orders.
-   Show order reference, creation date when available, status, and
    saved order summary.
-   Preserve order snapshots: historical order details should not be
    rewritten by later product/price changes.
-   Show meaningful statuses: `Pending`, `Confirmed`, `Processing`,
    `Delivered`, `Cancelled`, `Expired`.
-   Keep expired orders visible in order history.
-   Allow direct customer cancellation only for `Pending` orders.
-   For later statuses, explain that cancellation requests are handled
    through WhatsApp/store support.
-   Do not create a customer-facing countdown or claim that a Pending
    order expires 24 hours after creation. The 24-hour expiry window
    starts only when the Admin records that the final total was sent. If
    that has not been recorded, the order remains Pending under this
    rule.
-   Do not expose administrative-only data or actions.

### 7.6 Login / Register

Treat Login and Register as two related views within the same
authentication screen group, using clear links or tabs. Do not combine
both forms into one crowded form.

Register fields:

-   Name
-   Email
-   Password

Login fields:

-   Email
-   Password

Include:

-   Clear validation messages.
-   Duplicate-email and invalid-credentials states.
-   Email-verification-needed state and a path to continue verification.
-   Verification-sent, expired-link, already-used-link, and
    email-send-failure states where applicable.
-   Clear sign-in/sign-up switching.
-   Support-managed account recovery guidance; do not design a
    self-service password-reset flow for this MVP.
-   No public Admin or Super Admin registration.
-   Admin TOTP is an administrative authentication requirement, not part
    of the public customer registration form.

------------------------------------------------------------------------

## 8. Interaction and State System

Use a consistent design system across all screens. Each component should
have the same visual language and state behavior throughout the
storefront.

### Required UI states

-   Loading
-   Empty
-   Error
-   Success / Feedback
-   Unavailable / Disabled
-   Validation error

Use the correct state for the actual outcome. Never display success
optimistically before the operation succeeds.

### Buttons

-   Primary: petrol green with readable contrast.
-   Secondary: restrained neutral or outlined style.
-   Destructive actions: clearly differentiated without overusing red.
-   Disabled actions must look disabled and must not suggest they are
    available.

### Forms

-   Consistent labels, input height, radius, spacing, and focus
    treatment.
-   Place errors near the relevant field.
-   Preserve entered values when safe and appropriate after validation
    errors.
-   Distinguish required and optional fields.
-   Ensure keyboard focus and error text remain visible.

### Notifications

-   Add-to-cart success uses a temporary "Added to cart" toast.
-   Order creation uses the persistent checkout result state rather than
    relying only on a toast.
-   Error messages must be actionable and specific where possible.

### Motion

-   Short, subtle transitions for expandable search, menus, toasts, and
    state changes.
-   Do not use animation as the only way to communicate status.
-   Respect reduced-motion preferences in implementation.

------------------------------------------------------------------------

## 9. Responsive Design

Use **Responsive Adaptive** behavior: preserve the TechHub-inspired
visual identity while rearranging content to suit the viewport.

### Desktop

-   Full classic header.
-   Two-column Hero: text on the left, large component imagery on the
    right.
-   Product grids with comfortable card widths and spacing.
-   Categories bar horizontally aligned.

### Tablet

-   Keep the same visual hierarchy.
-   Reduce grid columns and spacing proportionally.
-   Prevent header controls and navigation from colliding.

### Mobile

-   Simplify the header while keeping essential search, cart, and
    account actions accessible.
-   Stack Hero text and imagery vertically; preserve headline, CTA, and
    brand color hierarchy.
-   Allow categories to scroll horizontally or wrap appropriately.
-   Use a narrower product grid with legible images, names, and prices.
-   Make filters usable on small screens without permanently consuming
    the product-list area.
-   Stack checkout sections vertically and keep field labels clear.
-   Ensure controls have comfortable touch targets and no horizontal
    overflow.

Responsive changes should rearrange the layout rather than create a
visually unrelated mobile design.

------------------------------------------------------------------------

## 10. Content, Product Data, and Mockup Integrity

-   Prefer real, approved product data and supplied brand assets.
-   If sample data is needed in Stitch, label it clearly as sample/demo
    content.
-   Do not create fake ratings, review counts, inventory numbers,
    discount claims, shipping fees, contact details, or policy
    statements that appear authentic.
-   Use EGP consistently for displayed prices.
-   Do not present estimated shipping as a confirmed final fee.
-   Avoid placeholder text such as "Lorem ipsum" in key customer-facing
    sections when realistic neutral copy can be used; mark any unknown
    operational data explicitly as a placeholder.
-   Keep customer-facing copy clear and direct, especially around
    WhatsApp and order confirmation.

------------------------------------------------------------------------

## 11. Accessibility and Usability

-   Maintain readable contrast for text and controls.
-   Do not use color alone to communicate sale, error, availability, or
    order status; pair color with text or an icon.
-   Provide visible focus states.
-   Give meaningful accessible names to icon-only actions such as
    search, wishlist, cart, and account.
-   Use clear labels and useful error messages.
-   Keep reading and interaction order logical on responsive layouts.
-   Ensure important order-state messages are visible and not only
    conveyed through transient animation.

------------------------------------------------------------------------

## 12. Design Deliverables and Stitch Guidance

Create the six primary screen groups from Section 1, plus the supporting
order-details/history view and essential UI states described in this
document.

For consistency:

-   Establish reusable components before duplicating page elements:
    Header, Footer, Button, Input, Product Card, Category Icon, Badge,
    Toast, Empty State, Error State, and Order Status.
-   Keep the same typography, colors, corner radii, spacing, and
    interaction patterns across screens.
-   Use the supplied Pixel Store logo and approved brand colors.
-   Preserve the approved TechHub-inspired Hero composition.
-   Use the exact Homepage section order in Section 5.
-   Keep the storefront in English and EGP.
-   Do not add unapproved Homepage sections or expand the project into
    an Admin Dashboard.
-   Treat mockup interactions as visual prototypes only; the actual
    implementation must follow backend validation and workflow rules.

------------------------------------------------------------------------

## 13. Acceptance Checklist

### Brand and visual direction

-   [ ] Supplied Pixel Store logo is used without alteration.
-   [ ] Approved palette and Inter typography are applied consistently.
-   [ ] TechHub-inspired Hero composition is preserved.
-   [ ] Red is restrained and used for genuine discounts/small accents.
-   [ ] Responsive layouts retain the same visual identity.

### Homepage

-   [ ] Section order is Header → Hero → Categories Bar → Deals → Shop
    by Category → Featured Products → Footer.
-   [ ] Deals includes the WhatsApp ordering explainer.
-   [ ] Shop by Category uses icons for the eight approved categories.
-   [ ] No Shop by Brand, Newsletter, or Store Benefits section is
    included.

### Commerce and data integrity

-   [ ] Product cards do not invent reviews, discounts, stock, or
    specifications.
-   [ ] Product Details supports images, condition, specs, and variants
    when applicable.
-   [ ] Listing supports required filters, sorting, and pagination.
-   [ ] Cart includes empty, unavailable, validation, and error states.
-   [ ] Checkout requires authenticated, verified customers.
-   [ ] Shipping fields distinguish required from optional.
-   [ ] COD is the only payment method shown for the MVP.
-   [ ] Shipping/final total is not presented as confirmed before Admin
    review.
-   [ ] Order result shows reference and `Pending` status.
-   [ ] WhatsApp is a manual handoff; the customer must press Send.
-   [ ] WhatsApp failure does not erase the saved order.
-   [ ] Cart clears only after successful order creation.
-   [ ] Order Details / Order History is available as a supporting
    customer view.
-   [ ] Expired orders remain visible in customer history.
-   [ ] The UI does not expose exact stock quantities or internal
    low-stock thresholds.

### Scope and consistency

-   [ ] Six primary screen groups remain the core Stitch scope.
-   [ ] Order Details / Order History is a supporting view, not an
    accidental scope expansion.
-   [ ] Login and Register are related views within one screen group,
    not a crowded combined form.
-   [ ] Loading, Empty, Error, and Success/Feedback states are defined.
-   [ ] Shared components use consistent styles and behavior.
-   [ ] Footer links include all required static pages without
    fabricated operational or policy content.
-   [ ] Admin Dashboard is not included in the storefront screen scope.

------------------------------------------------------------------------

## 14. Related Requirements Sources

This design document is based on the project's supplied materials:

-   `SRS.md` v1.0 --- approved MVP requirements baseline.
-   `Use Cases & User Stories` v1.0 --- user journeys and expected
    behavior.
-   `Workflow Diagrams` v1.1 --- registration, catalog, persistent cart,
    checkout, WhatsApp handoff, order confirmation, cancellation,
    expiration, and inventory workflows.
-   Supplied Pixel Store Brand Identity Board and visual references,
    with TechHub as the primary storefront reference.

Where a visual detail is not explicitly defined in those sources, this
document records a design recommendation rather than changing a business
rule.
