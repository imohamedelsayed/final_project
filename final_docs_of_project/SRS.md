# Software Requirements Specification (SRS)

**Project:** E-commerce Website  
**Version:** 1.0  
**Status:** Final — Approved MVP Requirements Baseline  
**Related document:** PRD v1.0

## 1. Purpose and Scope

This document translates the product requirements defined in the PRD into concise, testable software requirements for the MVP. It covers authentication and authorization, product catalog, inventory, cart and checkout, order management, coupons, administration, static pages, and non-functional requirements.

This document is the approved MVP requirements baseline. Infrastructure provider selection and deployment validation are separate release-management tasks; no provider is considered selected merely by being mentioned here.

## 2. Authentication and Authorization

### 2.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-AUTH-001 | A customer can register using their name, email address, and password. |
| FR-AUTH-002 | Email addresses must be unique. Email verification is required before the account can be used fully. |
| FR-AUTH-003 | Customers can securely sign in and sign out. |
| FR-AUTH-004 | Customer account recovery is handled through a secure support-managed process; self-service recovery is out of scope for the MVP. |
| FR-AUTH-005 | The system supports exactly three roles: `Customer`, `Admin`, and `Super Admin`. |
| FR-AUTH-006 | An Admin can manage the store but cannot create or modify administrator accounts. |
| FR-AUTH-007 | Only the Super Admin can manage administrator accounts and their roles. |
| FR-AUTH-008 | Administrator accounts require TOTP-based two-factor authentication. |
| FR-AUTH-009 | Every protected operation must enforce authorization on the backend, not only in the frontend. |
| FR-AUTH-010 | A customer cannot access another customer's account data or orders. |

### 2.2 Security Requirements

| ID | Requirement |
|---|---|
| NFR-AUTH-001 | Passwords must be hashed using Argon2id or bcrypt and must never be stored in plaintext. |
| NFR-AUTH-002 | Customer sessions expire after 30 days of inactivity; administrator sessions expire after 60 minutes of inactivity. |
| NFR-AUTH-003 | Login and email-verification attempts must be rate-limited. |
| NFR-AUTH-004 | Passwords, OTPs, tokens, and secrets must not be written to logs. |

### 2.3 Notes

- The initial Super Admin account is provisioned manually through a secure process; public administrator registration is not allowed.
- Administrator account recovery and secure storage of TOTP secrets must be specified in the security design.
- Email verification depends on selecting a suitable free provider for production use.

## 3. Products and Catalog

### 3.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-PROD-001 | Admins can create, edit, hide, and republish products. |
| FR-PROD-002 | Each product has a name, description, brand, category, price, unique SKU, and condition (`New` or `Used`). |
| FR-PROD-003 | Products support multiple images, including selecting a primary image, reordering, and deleting images. |
| FR-PROD-004 | Product specifications can vary by category. |
| FR-PROD-005 | Products may have variants; each purchasable variant has its own SKU and inventory quantity. |
| FR-PROD-006 | Admins can create and edit categories and subcategories. |
| FR-PROD-007 | Customers can search product text and filter by category, brand, price, and availability. |
| FR-PROD-008 | Customers can sort products by price ascending, price descending, newest, and name A–Z. |
| FR-PROD-009 | Hidden products must not appear in the storefront, search results, or featured products. |
| FR-PROD-010 | A product with zero stock remains visible unless an Admin hides it, but an unavailable quantity cannot be confirmed in an order. |
| FR-PROD-011 | Admins can manage featured products and homepage banners. |

### 3.2 Business Rules

- SKU values must be unique.
- Hiding a product does not permanently delete its record.
- Customers must not see exact stock quantities or low-stock alerts.
- Category-specific specifications are managed by Admins.
- Used items with materially different conditions are listed separately.

## 4. Inventory Management

### 4.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-INV-001 | Admins can set inventory quantities for each product or variant. |
| FR-INV-002 | The system supports quantity-based stock for identical items and separate records for materially different used items where needed. |
| FR-INV-003 | Admins can adjust inventory; the reason and responsible administrator are recorded where appropriate. |
| FR-INV-004 | Admins can set a low-stock threshold per product or variant. |
| FR-INV-005 | The dashboard displays an alert when stock reaches its low-stock threshold. |
| FR-INV-006 | Creating an order does not reserve or deduct inventory. |
| FR-INV-007 | When an order is confirmed, the system revalidates availability and deducts stock in a way that prevents overselling. |
| FR-INV-008 | If stock was deducted for an order that is later cancelled under the applicable order rules, the stock is restored exactly once. |

### 4.2 Business Rules

- Stock is deducted at confirmation, not at order creation.
- If quantities are insufficient, confirmation is blocked and affected items and quantities are shown.
- Permitted order edits must update inventory and totals correctly.
- Low-stock alerts are visible to administrators only.

## 5. Cart and Checkout

### 5.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-CART-001 | Customers can add products to the cart, change quantities, and remove items. |
| FR-CART-002 | The cart is stored in the database and persists after logout and across devices. |
| FR-CART-003 | Checkout requires an authenticated customer and server-side validation of cart data. |
| FR-CART-004 | The system revalidates prices, quantities, and coupon validity when creating an order. |
| FR-CART-005 | Customers enter shipping details for each order: recipient name, mobile number, governorate, area/city, street, and building number. |
| FR-CART-006 | Floor, apartment, and nearby landmark are optional. |
| FR-CART-007 | Cash on delivery (COD) is the only payment method in the MVP. |
| FR-CART-008 | The system calculates the product subtotal, discount, and subtotal after discount before final shipping charges are added. |
| FR-CART-009 | After successful order creation, the system opens WhatsApp with a prefilled message containing order details. |
| FR-CART-010 | If WhatsApp does not open or the customer does not send the message, the order remains saved and the order reference and a way to reopen WhatsApp are shown. |
| FR-CART-011 | Retrying the same order-creation operation must not create duplicate orders. |

### 5.2 Business Rules

- Prices and quantities are determined by the database, not by client-submitted values.
- The order stores a snapshot of its reference, product details, prices, quantities, and shipping details.
- WhatsApp messages are not sent automatically; the customer must press Send.
- Order creation does not deduct inventory.

## 6. Order Management

### 6.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-ORD-001 | The system generates a unique reference for every order. |
| FR-ORD-002 | A new order starts with status `Pending`. |
| FR-ORD-003 | An Admin reviews the order, sets shipping charges, and sends the final total to the customer via WhatsApp. |
| FR-ORD-004 | The Admin records that the final total was sent and records customer agreement before confirmation. |
| FR-ORD-005 | Before confirmation, the system revalidates prices, coupon eligibility, and inventory. |
| FR-ORD-006 | If prices or available quantities have changed, the order cannot be confirmed until the change is resolved and the customer approves a revised total when required. |
| FR-ORD-007 | An order expires 24 hours after the Admin records that the final total, including shipping, was sent, if it has not been confirmed. |
| FR-ORD-008 | Expiration is processed even when no Admin is online. |
| FR-ORD-009 | Customers can view their orders and statuses, including expired orders. |
| FR-ORD-010 | Customers can cancel pending orders. For confirmed or later orders, cancellation is requested through WhatsApp. |
| FR-ORD-011 | Admins can change order status only through permitted status transitions. |

### 6.2 Order Statuses

The defined statuses are:

- `Pending`
- `Confirmed`
- `Processing`
- `Delivered`
- `Cancelled`
- `Expired`

The allowed status transitions for the MVP are:
- `Pending` → `Confirmed`, `Cancelled`, or `Expired`.
- `Confirmed` → `Processing` or `Cancelled`.
- `Processing` → `Delivered` or `Cancelled`, only when the Admin has reviewed the cancellation request and approved it.
- `Delivered`, `Cancelled`, and `Expired` are terminal statuses; they cannot be reopened or confirmed.

Only authorized Admin actions or the system's expiration process may change status. Customers may directly cancel only `Pending` orders; requests to cancel later statuses are handled through WhatsApp and decided by an Admin.

### 6.3 Business Rules

- The 24-hour expiration period starts when the Admin records that the final total was sent, not when the order was created.
- If the final total has not been marked as sent, the order remains pending under this rule and should be highlighted in the dashboard.
- Expired orders remain visible in customer history and cannot be confirmed.
- Order creation does not reserve inventory.
- After confirmation, permitted order edits must recalculate totals, discounts, and inventory; customer agreement is required for material changes.
- The MVP stores the current/final order data rather than a detailed history of every edit.

## 7. Coupons and Discounts

### 7.1 Functional Requirements

| ID | Requirement |
|---|---|
| FR-COUP-001 | Admins can create, edit, enable, and disable coupons. |
| FR-COUP-002 | The system supports percentage discounts and fixed discounts in EGP. |
| FR-COUP-003 | A coupon can have an optional minimum product subtotal before shipping. |
| FR-COUP-004 | Every coupon has a required end date and an optional start date. |
| FR-COUP-005 | Coupons can have optional global and per-customer usage limits. |
| FR-COUP-006 | Only one coupon may be applied to an order. |
| FR-COUP-007 | The system validates a coupon at order creation and again before confirmation. |
| FR-COUP-008 | Coupon usage is counted only when an order is successfully confirmed. |

### 7.2 Business Rules

- Discounts apply to eligible product subtotal before shipping.
- A fixed discount cannot exceed the eligible subtotal.
- The post-discount total cannot be negative.
- Pending, expired, and cancelled orders do not count toward coupon usage.
- Concurrent confirmations must not exceed coupon usage limits.

## 8. Admin Dashboard

| ID | Requirement |
|---|---|
| FR-ADM-001 | Admins can manage products, categories, inventory, orders, and coupons. |
| FR-ADM-002 | Admins can manage featured products and homepage banners. |
| FR-ADM-003 | Only the Super Admin can manage administrator accounts. |
| FR-ADM-004 | The Super Admin can change the store's WhatsApp number through the dashboard without redeploying the application. |
| FR-ADM-005 | The dashboard highlights low-stock items and orders whose final total has not been marked as sent. |
| FR-ADM-006 | Admins can upload product and banner images from their devices; images are stored on the application server in the MVP. |

## 9. Static Pages and Policies

| ID | Requirement |
|---|---|
| FR-PAGE-001 | The storefront provides About, Contact, Shipping Policy, Return & Refund, Privacy, and Terms pages. |
| FR-PAGE-002 | These pages are maintained in code; changes require an application update and redeployment. |
| FR-PAGE-003 | Returns and exchanges are handled through WhatsApp and reviewed manually by an Admin according to the store policy. |

## 10. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-SEC-001 | Authentication and authorization checks for protected operations are enforced by the backend. |
| NFR-SEC-002 | Customer and order data are accessible only to authorized users. |
| NFR-REL-001 | Order creation, confirmation, and inventory updates preserve data consistency. |
| NFR-REL-002 | Retrying the same order-creation operation does not create duplicate orders. |
| NFR-DATA-001 | The system preserves an order snapshot so later product or price changes do not rewrite the original order details. |
| NFR-OPS-001 | Secrets and environment-specific configuration are managed outside source code. |
| NFR-OPS-002 | A backup and restore plan must be available and restore-tested before launch. |
| NFR-COST-001 | Production must use services suitable for commercial use on free plans, without requiring a paid upgrade. |
| NFR-STORE-001 | The storefront language is English and the currency is EGP. |

## 11. MVP Acceptance Criteria

- [ ] Customers can register, verify their email, sign in, and sign out.
- [ ] Customer, Admin, and Super Admin permissions are implemented and tested.
- [ ] Product, category, image, and inventory management work correctly.
- [ ] The cart persists after logout, and checkout requires authentication.
- [ ] Order creation, status handling, and expiration follow the PRD rules.
- [ ] Order confirmation cannot oversell inventory or exceed coupon limits.
- [ ] WhatsApp opens with a prefilled message, while the order remains saved if the message is not sent.
- [ ] Policy pages and the returns/exchanges contact process are available.
- [ ] Backup and restore are tested, and production services have been verified for free commercial use.

## 12. Production Release Gates

The following are mandatory release gates, not unresolved product requirements. The production launch is blocked until each gate has an evidenced decision and successful validation:

1. A hosting provider whose free plan permits the intended commercial use.
2. Persistent image storage on the selected hosting environment.
3. A suitable free email-verification provider.
4. A free PostgreSQL service and a workable backup/restore strategy.
5. Compliance of published shipping, return, refund, privacy, and terms policies with applicable Egyptian requirements.

## 13. Document Control and Related Documents

- This SRS is the final approved MVP requirements baseline; any change to these requirements must be reviewed and versioned.\n- `PRD.md` — product goals, scope, user needs, and business rules.
- System Design / ERD — planned technical architecture and database model.
- API Specification — planned endpoints, request/response contracts, and error behavior.
- Test Plan — planned test cases mapped to requirement IDs.
