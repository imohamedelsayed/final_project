# Product Requirements Document (PRD)
## E-Commerce Website by Express

**Version:** 1.0  
**Status:** Final — Product Requirements Baseline  
**Market:** Egypt  
**Currency:** EGP  
**Store Type:** Single physical retail store selling multi-brand hardware, laptops, computer components, accessories, and electronics.

---

## 1. Document Overview

### 1.1 Purpose
This document defines the product scope, business requirements, user roles, workflows, constraints, and acceptance criteria for an e-commerce website serving an existing retail store in Egypt.

Customers can browse products, manage carts, submit orders, and coordinate order confirmation and delivery with the store through WhatsApp. Authorized staff manage the catalog, inventory, orders, coupons, banners, and store settings through an administration dashboard.

### 1.2 Product Goals
- Establish an online storefront for the existing physical store.
- Make product discovery and ordering easier for customers.
- Centralize catalog, inventory, and order management.
- Support new and used products.
- Support cash-on-delivery orders throughout Egypt.
- Use WhatsApp as the primary customer communication channel.
- Operate in production without mandatory paid services or subscriptions.

### 1.3 Target Audience
- Customers purchasing hardware, laptops, computer components, accessories, and electronics.
- Admins responsible for day-to-day store operations.
- The Super Admin responsible for privileged administration and store configuration.

## 2. Product Overview

### 2.1 Storefront
The customer-facing website provides:
- Homepage with manually managed banners and featured products.
- Product catalog and category navigation.
- Product search, filtering, and sorting.
- Product details, images, specifications, prices, and condition.
- Customer registration, email verification, login, and logout.
- Persistent shopping cart.
- Checkout and shipping-address entry.
- Coupon application.
- Order history and status visibility.
- WhatsApp handoff after order submission.
- Static informational and policy pages.

### 2.2 Administration Dashboard
The dashboard provides:
- Product, category, brand, and specification management.
- Product image management.
- Inventory and low-stock monitoring.
- Order review, editing, confirmation, and status management.
- Coupon management.
- Homepage banner and featured-product management.
- Store settings, including the WhatsApp number.
- Admin account management by the Super Admin only.
- Essential operational and security information.

### 2.3 Brand Identity
The website uses the store's existing visual identity. The store name begins as a placeholder and must be changeable without restructuring the application. The store's WhatsApp number must be editable by the Super Admin through the dashboard without code changes or redeployment.

The customer-facing storefront uses English and displays prices in Egyptian pounds (EGP).

## 3. Users and Roles

### 3.1 Customer
Customers can register and verify their email, log in, browse/search/filter/sort products, manage a persistent cart, apply eligible coupons, submit orders, view their own orders and statuses, cancel pending orders, and contact the store through WhatsApp for order-related and return/exchange matters.

Customers must not access another customer's private information or orders.

### 3.2 Admin
Admins manage normal store operations, including products, categories, brands, specifications, inventory, orders, coupons, featured products, banners, and operational settings exposed to their role.

Admins cannot create, modify, deactivate, or manage Admin accounts or grant themselves additional privileges.

### 3.3 Super Admin
The Super Admin has full store administration privileges and exclusive authority to create, update, and deactivate Admin accounts, manage their permissions, configure privileged settings including the store's WhatsApp number, and perform all normal administrative operations.

There are exactly two administrative account types: Admin and Super Admin. Granular per-module permissions are outside the MVP scope.

### 3.4 Initial Administrative Provisioning
The initial Super Admin account must be provisioned securely through a controlled server-side procedure. Public Super Admin registration is not allowed. Administrative account recovery must use a secure, authorized manual procedure without public backdoors or exposed credentials.

## 4. Product Scope and Features

### 4.1 Product Categories
Initial top-level categories:
- Laptops
- PC Components
- Accessories
- Electronics

Authorized administrators can create, edit, reorganize, and deactivate categories and subcategories through the dashboard. The system supports category-specific technical specifications without requiring a code change for each new specification.

Examples include CPU, RAM, storage, GPU memory, memory generation, and memory speed.

### 4.2 Product Management
A product may contain:
- Name and description.
- Category and brand.
- One or more images.
- Current selling price.
- Unique SKU.
- New or used condition.
- Technical specifications.
- Optional purchasable variants.
- Publication/visibility state.
- Inventory information.
- Low-stock threshold.

Product publication/visibility and inventory status are independent. Administrators can hide or deactivate products without deleting historical information. Deactivated products do not appear in the storefront, search results, or featured sections. They can be reactivated without creating a new product record.

Historical orders must preserve relevant product descriptions, variants, quantities, and prices from the time the order was created.

### 4.3 Product Condition
Products can be classified as New or Used. Used products may include an optional known usage duration and an accurate description of their condition and defects. The system must not fabricate usage estimates.

Used pieces with materially different conditions may be listed separately. Identical pieces may share a listing with quantity-based inventory. A fixed condition grading scale is outside the MVP scope.

### 4.4 Product Images
Administrators upload images directly from their devices. For the MVP, images are stored on the application's server environment, while PostgreSQL stores image paths and metadata, not binary image files. Administrators can add, delete, reorder, and designate a primary image.

This PRD does not define mandatory numeric limits for image size, image count, or image formats. External image-storage services are deferred to a future enhancement. The selected production environment must be verified for persistent file storage; a temporary filesystem must not be treated as durable image storage.

### 4.5 Product Search and Discovery
The storefront supports:
- Basic text search.
- Category, brand, price-range, and availability filtering.
- Sorting by administrator-defined default, price low-to-high, price high-to-low, newest, and name A–Z.
- Manually selected featured products.

Customers must not see exact stock quantities, low-stock warnings, or explicit out-of-stock messages. Advanced technical specification filters and best-selling sorting are deferred.

### 4.6 Inventory Management
Inventory is managed internally through the dashboard. The system supports:
- Quantity-based inventory for identical items.
- Separate records for materially different used pieces.
- Independent stock for purchasable variants.
- Configurable low-stock thresholds per product or variant.
- Dashboard-only low-stock alerts.
- Recording reason, responsible administrator, and timestamp for relevant stock changes.

A product with zero stock may remain visible until an administrator hides it. An unavailable item cannot be confirmed as part of an order.

### 4.7 Variants
Products may have purchasable variants. Each purchasable variant must have its own SKU and inventory; variant prices may differ.

Technical specifications are distinct from purchasable variants: a specification describes a product, while a variant represents a separately purchasable configuration.

### 4.8 Cart
The cart persists across logout and supported devices and is backed by persistent application data. Product prices are revalidated at checkout, and customers are informed of relevant price changes before submitting an order. The server validates quantities, product availability, variants, and totals.

### 4.9 Coupons
The MVP supports percentage and fixed-value EGP discounts, optional minimum eligible product subtotal, one coupon per order with no stacking, a mandatory end date and optional start date, administrator enable/disable controls, and optional global and per-customer usage limits.

Discounts apply to eligible product subtotal before shipping. Fixed discounts cannot exceed the eligible product subtotal, and the final total cannot be negative.

Coupon usage is counted at successful order confirmation, not pending-order creation. Eligibility and usage limits are revalidated at confirmation. Pending, expired, and cancelled orders do not consume a coupon use.

### 4.10 Homepage and Static Pages
Administrators manage homepage banners, including images, optional links, and publication status. Featured products are managed manually.

The following pages are static in the MVP and require a code change and redeployment to update:
- About
- Contact
- Shipping Policy
- Return & Refund Policy
- Privacy Policy
- Terms & Conditions

Published return and refund terms must be reviewed for compliance with applicable Egyptian consumer-protection requirements.

## 5. Customer Journey and Order Workflow

### 5.1 Registration and Authentication
1. The customer registers using a unique email address and password.
2. The system sends an email verification OTP through an eligible email-delivery service.
3. The OTP expires after 10 minutes and can be used only once.
4. Verification attempts and repeated OTP requests are limited.
5. The account is not activated for ordering until email verification succeeds.
6. The customer logs in using their credentials.

OTP values must not be exposed in logs or stored in plaintext.

### 5.2 Checkout
Checkout requires an authenticated customer. For each order, the customer provides:
- Recipient's full name.
- Mobile number for delivery contact.
- Governorate.
- City or area.
- Street and building number.
- Optional apartment/floor and landmark.

Saved address management is outside the MVP scope.

The server recalculates prices, discounts, quantities, and order totals. The client must not be trusted to supply authoritative prices or totals.

When an order is submitted:
1. The system validates the request and creates a unique order reference.
2. The order is saved with status `Pending`.
3. The order stores a snapshot of relevant product, variant, price, quantity, and customer shipping information.
4. Stock is not deducted or reserved at this stage.
5. The system opens WhatsApp using the store's configured number and a prefilled order message.

The prefilled message includes the order reference, customer and shipping details, items, quantities, product prices, discounts, and a clear indication that shipping charges and the final total are pending.

The customer must manually send the WhatsApp message. The system must not claim that the message was automatically sent or delivered.

If WhatsApp does not open or the customer does not send the message, the order remains saved. The website displays the order reference and provides a way to reopen WhatsApp.

### 5.3 Administrative Review and Confirmation
1. The administrator reviews the order.
2. The administrator determines the shipping fee manually.
3. The administrator communicates the final total to the customer through WhatsApp.
4. The administrator records that the final total was sent.
5. The customer agrees to the final total.
6. The administrator records the customer's agreement.
7. Before confirmation, the system revalidates current prices, coupon eligibility, and inventory.
8. If eligible, the administrator confirms the order and the system performs the appropriate inventory and coupon updates.

The store uses Cash on Delivery only. There is no online payment gateway in the MVP.

### 5.4 Price Changes
If product prices change before confirmation, the administrator must obtain the customer's agreement to the revised total before confirming the order. This applies whether prices increase or decrease.

Order totals must be recalculated using authoritative server-side data.

### 5.5 Inventory Shortages
If the requested quantity is unavailable at confirmation:
- The order cannot be confirmed as submitted.
- The dashboard identifies affected items and quantities.
- The administrator contacts the customer.
- Following agreement, the administrator adjusts quantities or removes unavailable items.
- Totals and discounts are recalculated before confirmation.

Stock must not be oversold through concurrent confirmation attempts.

### 5.6 Order Expiration
A pending order expires 24 hours after the administrator records that the final total, including shipping, was sent to the customer.

The countdown does not begin at order creation. If the final total has not been recorded as sent, the order remains pending under this rule and is highlighted in the dashboard.

Expired orders remain visible in the customer's order history with status `Expired`. They cannot be confirmed and must not have deducted stock.

### 5.7 Order Statuses
The intended order statuses are:
- `Pending`
- `Confirmed`
- `Processing`
- `Delivered`
- `Cancelled`
- `Expired`

Permitted transitions, cancellation behavior, and restrictions on editing orders in later stages are specified in the SRS.

### 5.8 Order Editing and Cancellation
Customers may cancel pending orders themselves.

For confirmed or later-stage orders, the customer contacts the store through WhatsApp. The administrator evaluates the request according to the order's current state and records the resulting decision.

Administrators may add or remove items or change quantities after confirmation, subject to applicable business rules and customer agreement. Totals, discounts, and inventory effects must be recalculated consistently.

The MVP retains current/final order data rather than a comprehensive history of every order edit. Essential operational state and timestamps must still be retained.

If stock was deducted, cancellation or other stock-restoring operations must restore it exactly once.

### 5.9 Customer Order History
Customers can view their own orders, current statuses, and expired orders. Reordering an earlier order is outside the MVP scope.

## 6. Returns and Exchanges
Return and exchange requests are handled manually through WhatsApp. The administrator reviews requests according to the store's published policy and decides the appropriate action.

Damaged or misrepresented products follow the same request and review process rather than a separate technical workflow.

The published policy must be reviewed for compliance with applicable Egyptian law before launch.

## 7. Non-Functional Requirements

### 7.1 Security
- Passwords must be securely hashed using a suitable password-hashing algorithm.
- Administrative accounts require two-factor authentication using a free authenticator application.
- Administrative sessions expire after 60 minutes of inactivity.
- Customer sessions expire after 30 days of inactivity.
- Logout must invalidate the relevant session.
- Backend authorization is required for every protected operation.
- Customers must not access another customer's orders or personal data by changing request identifiers.
- Login and OTP endpoints must be rate-limited.
- Applicable CSRF protections, secure cookies, and origin validation must be implemented according to the selected session architecture.
- Database credentials, API keys, and secrets must be held in environment variables or platform secret management.
- Secrets must never be committed to Git or exposed to the frontend.
- Passwords, OTP values, tokens, and secrets must not be logged.
- The MVP does not require a comprehensive audit log of all administrative changes.

### 7.2 Reliability and Data Integrity
- Order creation must resist accidental duplicate submissions.
- Inventory and coupon usage must remain consistent under concurrent requests.
- Critical multi-step database changes must use appropriate transactions.
- Expiration processing must work even when an administrator is not actively using the dashboard.
- Stock restoration and coupon usage must not be applied twice because of retries.
- Backup and restore procedures must be documented and tested using available free capabilities.

### 7.3 Usability and Accessibility
- The storefront and dashboard must be responsive on mobile, tablet, and desktop.
- Forms and workflows must provide clear validation and error states.
- Empty, loading, success, and failure states must be handled.
- Customers must receive clear feedback after order creation, even if WhatsApp cannot be opened.

### 7.4 Maintainability
The application must use a modular architecture that supports future enhancements without unnecessary rewrites.

### 7.5 Cost Constraint
All production services must operate within suitable free usage plans or other genuinely no-cost resources. No mandatory paid upgrade, paid API, paid messaging service, or paid subscription may be assumed.

If a service's free plan becomes unsuitable, the project must consider a free alternative or reduce usage before considering any paid option. Paid upgrades are not part of the approved operating model.

## 8. Technical Constraints

### 8.1 Architecture
The system uses a modular monolith architecture in a monorepo managed by pnpm workspaces.

### 8.2 Frontend
- Next.js
- React
- JavaScript or TypeScript is acceptable for the frontend.
- The production hosting choice must support the intended commercial use under its free-plan terms.

### 8.3 Backend
- Node.js
- Express
- JavaScript only.
- CommonJS modules.
- TypeScript is not permitted for the backend.

### 8.4 Database
- PostgreSQL
- TypeORM
- JavaScript-compatible TypeORM configuration, using EntitySchema where appropriate rather than requiring TypeScript decorators.
- Database usage must avoid unnecessary storage consumption, excessive logging, and wasteful operations.

### 8.5 Images and File Storage
Images are stored on the application server in the MVP, while PostgreSQL stores their paths and metadata. External object storage is deferred. Persistent storage availability and deployment behavior must be verified before the production environment is selected.

### 8.6 Integrations
- WhatsApp click-to-chat with a prefilled message.
- Email OTP delivery through a suitable free service, if its limits and terms meet project requirements.
- No WhatsApp Business API integration.
- No paid SMS.
- No online payment gateway.
- No carrier API or live shipment tracking.

## 9. Operational and Business Rules
1. Customers must be authenticated to submit orders.
2. Prices are validated on the server.
3. An order remains pending until the required review and confirmation steps are completed.
4. Stock is not reserved at order creation.
5. Unavailable items cannot be confirmed.
6. Customer agreement to the final shipping-inclusive total is required before confirmation.
7. Pending-order expiration starts only after the administrator records that the final total was sent.
8. Pending orders without a recorded final-total dispatch do not expire under the 24-hour rule.
9. Coupon usage is counted only at successful confirmation.
10. Product and order snapshots preserve the values required to interpret historical purchases.
11. Customer-visible pages must not expose internal stock quantities or stock-status details.
12. Only the Super Admin may manage Admin accounts.
13. The store's WhatsApp number is configurable through the dashboard.
14. Return and exchange requests are handled manually through WhatsApp.
15. Production services must meet the no-paid-services constraint.

## 10. Success Metrics
The MVP should be evaluated using:
- Successful customer registrations and email verifications.
- Successful order submissions.
- Percentage of submitted orders reaching confirmation.
- Duplicate-order prevention.
- Accuracy of order totals, discounts, and inventory updates.
- Failed or inconsistent order-confirmation operations.
- Successful image persistence across supported deployments.
- Availability of backup and restore procedures.
- Ability to operate within free service limits without mandatory paid upgrades.

Specific numeric targets may be set after initial deployment and baseline measurement.

## 11. External Verification Required Before Production
These are implementation and release gates, not unresolved product-scope questions.

### 11.1 Free Commercial Hosting
Verify that the selected no-cost hosting plan permits the intended commercial use and supports the Next.js and Express deployment architecture. Document limits and a free fallback.

### 11.2 Persistent Image Storage
Verify that the selected no-cost production environment preserves uploaded product images across restarts and redeployments. If it cannot, evaluate another no-cost deployment approach; do not silently rely on temporary storage.

### 11.3 Email OTP Provider
Verify free transactional email limits, sender verification, API integration, account restrictions, and commercial-use terms. Perform an actual OTP delivery test before selecting a provider. No paid provider may be assumed.

### 11.4 Free Database and Recovery
Verify the selected PostgreSQL provider's free-plan capacity, compute/sleep behavior, connection limits, backup/recovery options, and commercial-use terms. Document and test a no-cost backup/restore procedure.

### 11.5 Legal Review
Review shipping, privacy, terms, and return/refund policies against applicable Egyptian legal requirements before launch.

## 12. MVP Acceptance Criteria
The MVP is acceptable when:
- Customers can register, verify their email, log in, and maintain a persistent cart.
- Customers can browse and search the catalog and view product details.
- Authorized administrators can manage products, categories, brands, variants, images, and inventory.
- Product deactivation preserves required historical information and can be reversed.
- Customers can submit orders with validated prices and shipping details.
- Order submission opens WhatsApp with a prefilled message without claiming that the message was sent automatically.
- An order remains available if WhatsApp does not open or the customer does not send the message.
- Administrators can set shipping fees, record that final totals were sent, record customer agreement, and confirm eligible orders.
- The 24-hour expiration rule follows the recorded final-total dispatch time.
- Inventory and coupons remain consistent during confirmation, cancellation, and retries.
- Customers can view their own order history, including expired orders.
- Admin and Super Admin permissions are enforced by the backend.
- Administrative 2FA and the defined session expiration policies are enforced.
- The application can be deployed using a verified no-cost production configuration.
- Product images persist reliably in the selected production environment.
- Backup and restore procedures have been tested.
- The selected email provider successfully delivers verification OTPs under its free-plan limits.
- Required policy pages are available and reviewed before public launch.

## 13. Related Documents
The following documents derive their requirements from this PRD:
- **SRS:** detailed functional and non-functional software requirements.
- **System Design:** architecture, module boundaries, deployment, and technology decisions.
- **ERD:** database entities, relationships, constraints, and indexes.
- **API Specification:** endpoints, request/response contracts, authentication, and authorization.
- **Workflow and Use-Case Documentation:** detailed user and administrative flows.
- **Test Plan and Test Cases:** verification of business rules, security, concurrency, and acceptance criteria.

Changes to product scope or business rules must be reflected in this PRD before dependent technical documents are updated.
