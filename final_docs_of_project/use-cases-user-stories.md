# E-commerce Website — Use Cases & User Stories

**Version:** 1.0  
**Status:** Draft for review  
**Basis:** PRD, SRS v1.0, and Workflow Diagrams v1.1  
**Scope:** MVP only; no features beyond the agreed requirements are introduced.

## 1. Actors

| Actor | Description |
|---|---|
| Visitor | Unauthenticated person browsing the public catalog. |
| Customer | Registered user who has verified their email and can manage a cart and orders. |
| Admin | Staff account that manages products, inventory, coupons, and order operations. |
| Super Admin | Admin-level account that can also manage administrator accounts and the store WhatsApp number. |
| System | Backend processes, database transactions, session handling, and scheduled expiration job. |
| Email service | Sends account-verification messages. |
| WhatsApp | External app/site opened with a prefilled message; the customer manually sends it. |

## 2. Use Cases

### UC-01 — Register and verify email

**Primary actor:** Visitor  
**Preconditions:** The visitor is not signed in.  
**Main flow:**
1. Visitor submits name, email, and password.
2. System validates input and checks for an existing account.
3. System creates an unverified customer account and stores a hashed, single-use verification challenge.
4. System sends the verification email.
5. Customer opens the link before the 10-minute expiry.
6. System consumes the challenge and verifies the account atomically.

**Alternative/error flows:** Invalid input is rejected; duplicate email receives a safe response; email-send failure leaves the account unverified; invalid, expired, or used challenge is rejected; resend and attempts are rate-limited, and issuing a replacement invalidates prior unconsumed challenges.

**Postcondition:** Account is verified only after successful challenge validation.

### UC-02 — Sign in and sign out

**Primary actor:** Customer or Admin  
**Main flow:** Submit credentials; system validates credentials, account state, and email verification; Admin/Super Admin must also pass TOTP; system creates a server-enforced session and secure cookie. On logout, the session is revoked and the cookie cleared.

**Alternative/error flows:** Generic credential error; inactive or unverified account rejected; rate limits enforced; invalid TOTP rejected; expired or revoked sessions cannot be used.

**Postcondition:** Only an authenticated, eligible account receives a valid session.

### UC-03 — Browse and search products

**Primary actor:** Visitor or Customer  
**Main flow:** View published products; optionally search, filter by category/brand/price/availability, sort, paginate, and open product details.

**Alternative/error flows:** Invalid filters are rejected or normalized safely; no results shows an empty state; unpublished or no-longer-purchasable products cannot be added to cart. Zero-stock products may remain visible, but the interface must not imply availability.

**Postcondition:** User sees public catalog information without exact stock counts or internal low-stock thresholds.

### UC-04 — Manage persistent cart

**Primary actor:** Customer  
**Preconditions:** Customer is signed in.  
**Main flow:** Add a valid product variant, set a positive integer quantity, update quantities, remove items, or clear the cart. System stores cart data in the database and recalculates displayed subtotal using current prices.

**Alternative/error flows:** Unpublished/inactive variant, invalid quantity, or insufficient stock is rejected with a clear message. Cart does not reserve stock; availability and price are checked again at checkout and confirmation.

**Postcondition:** Cart persists across logout and devices.

### UC-05 — Create an order

**Primary actor:** Customer  
**Preconditions:** Customer is authenticated and verified; cart is non-empty.  
**Main flow:**
1. Customer starts checkout and provides recipient and delivery details.
2. System validates the address and revalidates cart, current prices, quantities, and coupon on the server.
3. System shows product subtotal, discount, and pre-shipping amount, and obtains agreement to the terms.
4. Customer submits the order using an idempotency key.
5. System checks whether that customer-scoped key was already processed.
6. In a transaction, system revalidates required data, creates a Pending order with item/address snapshots, and stores the idempotency result.
7. After commit, system clears the cart and displays the order reference.
8. System offers to open WhatsApp with a contextual prefilled message.

**Alternative/error flows:** Authentication/verification required; empty or invalid cart; invalid address; coupon/price/stock issue; missing agreement; failed transaction preserves the cart; repeated submission with the same key returns the existing result rather than creating a duplicate.

**Postcondition:** Order is saved as Pending; stock is not reserved or deducted.

### UC-06 — Contact store through WhatsApp

**Primary actor:** Customer  
**Main flow:** System opens WhatsApp with a prefilled message based on the saved order. Customer reviews and manually sends it.

**Alternative/error flows:** If WhatsApp cannot open or the customer does not send, the order remains saved and the order reference plus a reopen option are shown. The system never claims the message was automatically sent.

**Postcondition:** Order remains Pending until confirmed or otherwise transitioned through an allowed path.

### UC-07 — Review order and send final total

**Primary actor:** Admin  
**Preconditions:** Order is Pending.  
**Main flow:** Admin reviews order details, resolves item/address issues, sets shipping fee and final total, sends the final total to the customer via WhatsApp, and records that it was sent. System sets `final_total_sent_at` and the 24-hour expiry deadline.

**Alternative/error flows:** If details or prices require resolution, order remains Pending. If the final total has not been recorded as sent, the order does not expire under the 24-hour rule and is highlighted for admin follow-up.

**Postcondition:** A valid recorded sent timestamp starts the expiry window.

### UC-08 — Confirm a Pending order

**Primary actor:** Customer and System  
**Preconditions:** Order is Pending, not expired, and customer agreement to the current final total is recorded.  
**Main flow:** System starts a transaction, locks or atomically validates the order and relevant stock/coupon usage, revalidates price, coupon eligibility, limits, and inventory, decrements stock, records coupon redemption if applicable, changes status to Confirmed, and commits all changes atomically.

**Alternative/error flows:** Expired/non-Pending order rejected; missing agreement requires customer approval; changed price/stock/coupon blocks confirmation until resolved; any failure rolls back all stock, coupon, and status changes. Repeated confirmation must not deduct stock or redeem a coupon twice.

**Postcondition:** Order is Confirmed and stock/coupon effects are committed exactly once.

### UC-09 — Manage order status and cancellation

**Primary actor:** Admin; Customer for Pending cancellation  
**Main flow:** Customer may directly cancel a Pending order. Admin may move Confirmed to Processing, Processing to Delivered, or cancel an eligible order. Cancelling a Confirmed/Processing order requires stock restoration exactly once when stock was deducted; Processing cancellation requires admin review and approval.

**Alternative/error flows:** Invalid status transitions are rejected. Customer cancellation requests after Pending are routed through WhatsApp/Admin. Cancellation and coupon redemption release are applied consistently and transactionally.

**Postcondition:** Order status follows the allowed transition graph; Delivered, Cancelled, and Expired are terminal.

### UC-10 — Expire an unconfirmed order

**Primary actor:** System  
**Preconditions:** Pending order has a recorded final-total-sent timestamp and deadline has passed.  
**Main flow:** Scheduled job finds eligible orders and atomically changes each still-Pending order to Expired.

**Alternative/error flows:** Orders without a sent timestamp remain Pending and are flagged for follow-up; orders already transitioned are skipped; no stock restoration is needed because Pending orders never reserved stock.

**Postcondition:** Expired order remains visible in customer history and cannot be confirmed.

### UC-11 — Adjust inventory

**Primary actor:** Admin  
**Main flow:** Admin selects a variant, enters a quantity change and reason. System validates authorization and inputs, calculates proposed stock, rejects negative/non-integer stock, and atomically updates stock with an inventory-adjustment record containing variant, admin, delta, reason, and timestamp.

**Postcondition:** Inventory is updated with a traceable reason; failed transactions leave stock unchanged.

### UC-12 — Manage catalog, coupons, and store settings

**Primary actor:** Admin; Super Admin for restricted settings  
**Main flow:** Admin manages products, categories, variants, publication state, featured products, banners, inventory, and coupons. Super Admin manages administrator accounts and edits the store WhatsApp number without redeploying.

**Business rules:** Product/variant history must remain valid when an item is unpublished; coupon rules and limits are validated at order creation and confirmation; only Super Admin can manage admin accounts; there is no public admin registration.

## 3. User Stories and Acceptance Criteria

### Epic A — Account and security

**US-001 — Customer registration**  
As a visitor, I want to create an account so I can maintain a cart and place orders.

Acceptance criteria:
- Valid name, email, and password are required.
- Duplicate email and invalid input are handled safely.
- New account remains unverified until a valid verification challenge is consumed.
- Passwords and verification challenges are never stored in plaintext.

**US-002 — Email verification**  
As a customer, I want to verify my email so the account can be used for checkout.

Acceptance criteria:
- Challenge expires after 10 minutes and can be used once.
- Invalid, expired, or consumed challenge is rejected.
- Resend and verification attempts are rate-limited.
- Issuing a replacement invalidates prior unconsumed challenges.

**US-003 — Secure login and sessions**  
As a user, I want secure sign-in and logout so unauthorized people cannot use my account.

Acceptance criteria:
- Backend enforces session expiry and revocation.
- Customer inactivity timeout is 30 days; Admin/Super Admin timeout is 60 minutes.
- Admin/Super Admin must pass TOTP after password validation.
- Logout revokes the session; secure cookie and CSRF protections are applied as appropriate.

### Epic B — Catalog and cart

**US-004 — Discover products**  
As a visitor, I want to search and filter products so I can find suitable items.

Acceptance criteria:
- Only published products appear publicly.
- Search/filter/sort options match the SRS.
- Product details show images, specs, condition, and current variant price.
- Exact stock quantity and internal low-stock threshold are not exposed.

**US-005 — Persistent cart**  
As a customer, I want my cart saved across devices so I can continue shopping later.

Acceptance criteria:
- Add, change quantity, remove, and clear actions work.
- Invalid quantities and unavailable/insufficient stock are rejected clearly.
- Cart persists across logout and devices.
- Cart does not reserve stock.

### Epic C — Checkout and orders

**US-006 — Place a COD order**  
As a customer, I want to submit my cart as a cash-on-delivery order so the store can review it.

Acceptance criteria:
- Checkout requires authenticated, verified account.
- Required delivery fields are validated; floor/apartment/landmark are optional.
- Server recalculates prices, coupon, and totals.
- Order begins Pending and stores order-item and address snapshots.
- Stock is not deducted at order creation.
- Failed order creation preserves the cart.

**US-007 — Safe order retry**  
As a customer, I want retrying a submission not to create duplicate orders.

Acceptance criteria:
- Each submission uses an idempotency key scoped to the customer.
- Key/result is stored atomically with order creation.
- Repeating the same operation returns the existing result.

**US-008 — WhatsApp handoff**  
As a customer, I want a prefilled WhatsApp message so I can contact the store about my saved order.

Acceptance criteria:
- Order is saved before WhatsApp opens.
- Message requires the customer to press Send.
- If WhatsApp fails or is not sent, the order reference and reopen option remain available.

**US-009 — Admin final total**  
As an admin, I want to set shipping and record sending the final total so the customer has a clear amount to approve.

Acceptance criteria:
- Admin records the final total as sent.
- The 24-hour expiry period starts from that recorded timestamp.
- Pending orders without that timestamp remain pending and are highlighted.

**US-010 — Confirm order safely**  
As a customer, I want confirmation to reflect current stock, prices, and coupon rules.

Acceptance criteria:
- Customer agreement to the current final total is required.
- Price, stock, coupon validity, and usage limits are rechecked.
- Stock deduction, coupon redemption, and status change are atomic.
- Confirmation retries cannot duplicate stock deduction or redemption.

**US-011 — Track order status**  
As a customer, I want to see my order statuses, including expired orders.

Acceptance criteria:
- Customer can view own order history and status.
- Expired orders remain visible and cannot be confirmed.
- Only permitted status transitions are accepted.

**US-012 — Cancel eligible order**  
As a customer, I want to cancel a Pending order if I no longer want it.

Acceptance criteria:
- Customer can directly cancel Pending only.
- Later cancellation requests go through WhatsApp/Admin.
- Admin approval is required to cancel Processing orders.
- Any stock restoration and coupon usage release occurs exactly once when applicable.

### Epic D — Admin operations

**US-013 — Manage catalog**  
As an admin, I want to manage products and categories so the public catalog stays accurate.

Acceptance criteria:
- Admin can create/edit products, categories, variants, specs, featured products, and banners.
- Unpublishing hides a product without deleting its order history.
- Variant SKU is unique per sellable variant.

**US-014 — Adjust inventory**  
As an admin, I want to adjust stock with a reason so inventory remains accurate and traceable.

Acceptance criteria:
- Proposed stock must be a non-negative integer.
- Stock update and adjustment record commit atomically.
- Record includes variant, admin, delta, reason, and timestamp.

**US-015 — Manage coupons**  
As an admin, I want to manage discount coupons so promotions follow store rules.

Acceptance criteria:
- Supports percentage and fixed EGP discounts.
- Required end date; optional start date and minimum product subtotal.
- One coupon per order; no stacking.
- Coupon use counts on confirmation only; concurrent confirmations cannot exceed limits.
- Cancelled orders do not count toward usage limits.

**US-016 — Manage restricted settings**  
As a Super Admin, I want to manage admin accounts and the store WhatsApp number.

Acceptance criteria:
- Only Super Admin can manage administrator accounts.
- There is no public admin registration.
- WhatsApp number can be changed through the dashboard without redeployment.

## 4. Cross-cutting acceptance criteria

- API validates authorization and business rules server-side; frontend checks alone are insufficient.
- Database transactions protect order confirmation, inventory changes, coupon usage, and cancellation side effects.
- Secrets remain in environment/platform secret storage; `.env` is excluded from version control.
- Errors are logged without passwords, tokens, OTPs, or other secrets.
- Production image storage must be persistent; ephemeral local filesystem is not acceptable.
- Database backup and restore must be tested before launch.
- No mandatory paid service is introduced without review of its free-tier limits and terms.

## 5. Out of scope for this document

- Detailed API endpoint definitions and request/response schemas.
- UI wireframes and visual design.
- Database migration scripts and ORM entities.
- Automated test code and deployment configuration.
- Customer self-service password recovery; MVP uses secure manual/support reset.
- Payment gateway, carrier integration, live tracking, and automatic WhatsApp sending.

## 6. Traceability notes

These use cases and stories are derived from the current PRD/SRS and workflow diagrams. If implementation requires behavior not covered here, update the requirements documents first rather than treating an assumption as an approved requirement.
