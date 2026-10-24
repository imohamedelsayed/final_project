# E-commerce Website — Workflow Diagrams

**Version:** 1.1  
**Status:** Reviewed against SRS v1.0  
**Basis:** Approved MVP decisions and SRS v1.0  
**Notation:** Mermaid flowcharts. Diamonds represent decisions; error paths are shown explicitly.

> These diagrams document the agreed MVP behavior. They do not introduce new features. Any unresolved behavior is marked as an assumption or review point rather than silently changing the requirements.

## 1. Registration and Email Verification

```mermaid
flowchart TD
    A([Customer opens registration]) --> B[Enter name, email, password]
    B --> C{Input valid?}
    C -- No --> C1[Show validation errors] --> B
    C -- Yes --> D{Email already registered?}
    D -- Yes --> D1[Show safe duplicate-email response] --> B
    D -- No --> E[Hash password and create unverified customer account]
    E --> F[Create verification challenge with hashed token]
    F --> G[Send verification email]
    G --> H{Email sent?}
    H -- No --> H1[Show retry/support message; do not expose token]
    H1 --> I([Account remains unverified])
    H -- Yes --> J[Customer opens verification link]
    J --> K{Token valid, unused, and unexpired?}
    K -- No --> K1[Reject link; offer resend if rate limit allows] --> I
    K -- Yes --> L[Mark challenge consumed and verify email atomically]
    L --> M([Account verified])
```

**Required safeguards**
- Rate-limit registration, verification attempts, and resend requests.
- Verification token is single-use, expires after 10 minutes, and is stored hashed.
- Never log passwords, tokens, or OTPs.
- A failed email delivery must not mark the account verified.

## 2. Login, Session, and Logout

```mermaid
flowchart TD
    A([User opens login]) --> B[Submit email and password]
    B --> C{Credentials valid?}
    C -- No --> C1[Return generic authentication error] --> C2{Rate limit reached?}
    C2 -- No --> B
    C2 -- Yes --> C3[Temporarily reject further attempts] --> Z([End])
    C -- Yes --> D{Account active?}
    D -- No --> D1[Reject sign-in] --> Z
    D -- Yes --> E{Email verified?}
    E -- No --> E1[Require email verification] --> Z
    E -- Yes --> F{Role is Admin or Super Admin?}
    F -- No --> G[Create secure customer session]
    F -- Yes --> H[Require TOTP code]
    H --> I{TOTP valid?}
    I -- No --> I1[Reject; rate-limit attempts] --> Z
    I -- Yes --> J[Create secure admin session]
    G --> K[Set secure session cookie]
    J --> K
    K --> L([Authenticated])
    L --> M{User requests logout?}
    M -- No --> N{Session expired or revoked?}
    N -- No --> L
    N -- Yes --> O[Invalidate session and clear cookie] --> Z
    M -- Yes --> P[Revoke session and clear cookie] --> Z
```

**Session policy**
- Customer inactivity timeout: 30 days.
- Admin/Super Admin inactivity timeout: 60 minutes.
- Enforce expiry and revocation on the backend; use secure cookie settings and appropriate CSRF protection.
- Super Admin provisions administrator accounts; there is no public admin registration.

## 3. Product Browsing and Search

```mermaid
flowchart TD
    A([Visitor opens storefront]) --> B[Load published products]
    B --> C[Optional: enter search term]
    C --> D[Optional: choose category, brand, price range, availability]
    D --> E[Optional: choose sort order]
    E --> F[Validate and normalize query parameters]
    F --> G{Filters valid?}
    G -- No --> G1[Return validation message or safe defaults] --> B
    G -- Yes --> H[Query published products and active variants]
    H --> I{Any results?}
    I -- No --> I1[Show no-results message and allow filter changes] --> C
    I -- Yes --> J[Display results and pagination]
    J --> K{Open product?}
    K -- No --> C
    K -- Yes --> L[Show product details, images, specs, condition, and current price]
    L --> M{Product still published and purchasable?}
    M -- No --> M1[Show unavailable state; do not add to cart] --> B
    M -- Yes --> N([Product details ready])
```

**Catalog rules**
- Unpublished products are not visible to public customers.
- Zero-stock products may remain visible; the UI must not imply they can currently be purchased.
- Do not expose exact inventory counts or internal low-stock thresholds to public users.
- Variant price and stock are authoritative for purchase operations.

## 4. Persistent Cart

```mermaid
flowchart TD
    A([Customer views a product]) --> B[Select variant and quantity]
    B --> C{Signed in?}
    C -- No --> C1[Prompt sign-in to use persistent cart] --> C2[Customer signs in] --> D
    C -- Yes --> D[Load or create DB-backed cart]
    D --> E{Variant active and product published?}
    E -- No --> E1[Reject; show unavailable item] --> Z([Cart unchanged])
    E -- Yes --> F{Quantity is a positive integer?}
    F -- No --> F1[Show quantity error] --> B
    F -- Yes --> G{Requested quantity exceeds current stock?}
    G -- Yes --> G1[Reject or ask customer to reduce quantity] --> B
    G -- No --> H[Add item or update existing cart item]
    H --> I[Recalculate displayed subtotal from current variant price]
    I --> J([Show updated cart])
    J --> K{Customer changes cart?}
    K -- Remove --> L[Remove selected cart item] --> J
    K -- Change quantity --> B
    K -- Clear cart --> M[Remove all cart items] --> Z
    K -- Checkout --> N{Cart non-empty?}
    N -- No --> N1[Show empty-cart message] --> Z
    N -- Yes --> O([Proceed to checkout])
```

**Cart rules**
- Cart persists across logout and devices because it is stored in the database.
- Checkout requires authentication.
- Cart contents are not a stock reservation. Recheck stock and prices at checkout and confirmation.
- A cart item becoming unavailable must be surfaced clearly; do not silently fulfill it.

## 5. Checkout and Order Creation

```mermaid
flowchart TD
    A([Customer chooses checkout]) --> B{Authenticated and verified?}
    B -- No --> B1[Redirect to sign-in or verification] --> Z([Checkout paused])
    B -- Yes --> C[Load cart, product variants, prices, and coupon]
    C --> D{Cart non-empty and items purchasable?}
    D -- No --> D1[Show unavailable items; ask customer to update cart] --> C
    D -- Yes --> E[Enter or select delivery address]
    E --> F[Validate recipient, mobile, governorate, city/area, street, building]
    F --> G{Address valid?}
    G -- No --> G1[Show field-level errors] --> E
    G -- Yes --> H[Recalculate prices, eligible subtotal, and coupon on server]
    H --> I[Show order review and terms agreement]
    I --> J{Customer agrees and submits?}
    J -- No --> Z
    J -- Yes --> K[Receive idempotency key for this submission]
    K --> L{Key already processed for this customer?}
    L -- Yes --> L1[Return the existing result/order; do not create a duplicate] --> P
    L -- No --> M[Begin transaction; revalidate cart, prices, and coupon]
    M --> N{Validation and transaction succeed?}
    N -- No --> N1[Rollback; preserve cart and show retryable or validation error] --> Z
    N -- Yes --> O[Create Pending order and snapshot order items/address; do not deduct or reserve stock]
    O --> O1[Store idempotency result atomically with order]
    O1 --> O2[Commit transaction]
    O2 --> O3[Clear cart after successful commit]
    O3 --> P[Show order number and next steps]
    P --> Q[Offer contextual prefilled WhatsApp message]
    Q --> R([Order remains saved as Pending])
```

**Important**
- The server, not the browser, calculates prices, discounts, and totals.
- Initial order creation does **not** reserve or deduct inventory.
- Check the idempotency key before creating an order; enforce uniqueness and persist the key/result atomically with the order.
- Revalidate server-side data within the order-creation transaction.
- Clear the cart only after the order transaction commits successfully. If it fails, preserve the cart.
- Save the order before opening WhatsApp. WhatsApp launch or send failure must not erase the order.

## 6. WhatsApp Handoff and Admin Final Total

```mermaid
flowchart TD
    A([Pending order created]) --> B[Build contextual WhatsApp message from saved order]
    B --> C{WhatsApp link can be opened?}
    C -- No --> C1[Keep order saved; show order reference and retry option] --> Z([Pending order remains])
    C -- Yes --> D[Open WhatsApp with prefilled message]
    D --> E{Customer manually sends message?}
    E -- No or unknown --> E1[Do not claim message was sent; order remains saved] --> Z
    E -- Yes --> F[Admin reviews order in dashboard]
    F --> G{Items, prices, and address acceptable?}
    G -- No --> G1[Contact customer and resolve manually] --> Z
    G -- Yes --> H[Admin sets shipping fee and final total]
    H --> I[Admin records that final total was sent]
    I --> J[Set final_total_sent_at and expires_at = sent time + 24 hours]
    J --> K[Customer reviews final total and agreement]
    K --> L{Customer confirms before expiry?}
    L -- No --> M[Order may expire after deadline; no stock was deducted yet] --> Z
    L -- Yes --> N([Proceed to confirmation transaction])
```

**Rules**
- WhatsApp is a manual handoff, not an API-based delivery confirmation.
- If WhatsApp is not opened or the customer does not send the message, keep the saved order and provide its reference.
- The 24-hour expiry clock starts only when the admin marks the final total as sent.
- Pending orders without a recorded sent-final-total timestamp do not expire automatically; highlight them to admins.

## 7. Order Confirmation, Stock, and Coupon Atomicity

```mermaid
flowchart TD
    A([Customer agrees to final total]) --> B[Begin DB transaction and lock relevant order, variants, and coupon usage]
    B --> C{Order is Pending and not expired?}
    C -- No --> C1[Reject confirmation; show current order status] --> R([Rollback/end])
    C -- Yes --> D{Customer agreement recorded?}
    D -- No --> D1[Require agreement] --> R
    D -- Yes --> E[Revalidate current price, coupon eligibility, usage limits, and stock]
    E --> F{All validations pass?}
    F -- No --> F1[Rollback; explain what needs review] --> R
    F -- Yes --> G[Atomically decrement stock for each order line]
    G --> H[Create coupon redemption if a coupon is used]
    H --> I[Set order status Confirmed and confirmation timestamps]
    I --> J{All writes succeed?}
    J -- No --> J1[Rollback every stock, coupon, and status change] --> R
    J -- Yes --> K[Commit transaction]
    K --> L([Order confirmed])
```

**Consistency requirements**
- Lock or atomically condition-update stock so concurrent orders cannot oversell.
- Coupon limits must be checked and consumed in the same transaction as confirmation.
- Failed confirmation must not leave partial stock deductions or coupon redemptions.
- Confirmation retries must not deduct stock or redeem a coupon twice.
- Customer must see a clear outcome if the final price, stock, coupon validity, or order state changed.

## 8. Admin Order Status and Cancellation

```mermaid
flowchart TD
    A([Admin opens order]) --> B[Review order and current status]
    B --> C{Requested action?}
    C -- Confirm Pending order --> D[Run confirmation transaction in Diagram 7]
    C -- Cancel Pending --> E[Cancel without stock restoration if stock was never deducted]
    C -- Start processing --> F{Order is Confirmed?}
    F -- No --> F1[Reject invalid transition] --> B
    F -- Yes --> G[Set Processing]
    C -- Mark delivered --> H{Order is Processing?}
    H -- No --> H1[Reject invalid transition] --> B
    H -- Yes --> I[Set Delivered]
    C -- Cancel Confirmed --> J[Validate cancellation and apply stock restoration exactly once if stock had been deducted]
    C -- Cancel Processing --> K[Require Admin review/approval before cancellation]
    K --> L{Cancellation approved?}
    L -- No --> B
    L -- Yes --> J
    J --> M[If coupon redemption is to be released, update usage consistently in the same transaction]
    M --> N[Set Cancelled and record cancellation]
    E --> O([Order updated])
    G --> O
    I --> O
    N --> O
```

**Allowed status transitions**
- `Pending → Confirmed`, `Cancelled`, or `Expired`
- `Confirmed → Processing` or `Cancelled`
- `Processing → Delivered` or `Cancelled` only after admin review/approval
- `Delivered`, `Cancelled`, and `Expired` are terminal states.

**Cancellation safeguards**
- Customer can directly cancel only a Pending order; later cancellation requests go through WhatsApp/Admin.
- Restore deducted stock exactly once, guarded by transaction/state checks.
- Do not allow invalid status jumps.
- **Policy point requiring confirmation:** the SRS says coupon usage is counted on confirmation and pending/expired/cancelled orders do not count. For a previously confirmed order that is later cancelled, the implementation should release/reverse that redemption so it no longer counts, unless the owner explicitly decides otherwise.

## 9. Pending Order Expiration

```mermaid
flowchart TD
    A([Scheduled expiration job runs]) --> B[Find Pending orders with expires_at <= current time]
    B --> C{Final total was marked sent?}
    C -- No --> C1[Keep Pending; flag for admin follow-up] --> Z([End])
    C -- Yes --> D{Order is still Pending and deadline passed?}
    D -- No --> Z
    D -- Yes --> E[Atomically transition Pending to Expired]
    E --> F{Transition succeeded?}
    F -- No --> Z
    F -- Yes --> G[Do not deduct/restore stock because Pending order held no stock]
    G --> H[Do not count coupon redemption because confirmation never succeeded]
    H --> I([Expired order remains in customer history])
```

## 10. Inventory Adjustment by Admin

```mermaid
flowchart TD
    A([Admin opens inventory]) --> B[Select variant and enter quantity change]
    B --> C[Enter reason]
    C --> D{Admin authorized and input valid?}
    D -- No --> D1[Reject and show validation error] --> B
    D -- Yes --> E[Begin transaction and calculate proposed stock]
    E --> F{Proposed stock is a non-negative integer?}
    F -- No --> F1[Rollback; show error and keep stock unchanged] --> B
    F -- Yes --> G[Update stock and record variant, admin, delta, reason, timestamp atomically]
    G --> H{Transaction succeeds?}
    H -- No --> H1[Rollback and show retryable error] --> B
    H -- Yes --> I([Show updated stock and low-stock state])
```

## 11. Review Checklist Before Approval

- [ ] Registration covers invalid input, duplicate email, email-send failure, expired/used token, and rate limits.
- [ ] Login covers invalid credentials, inactive/unverified accounts, admin TOTP, and session expiry.
- [ ] Cart rechecks variant status and stock and does not reserve stock.
- [ ] Checkout persists the order before WhatsApp handoff and handles retry/idempotency.
- [ ] Admin final-total timestamp is the start of the 24-hour expiry window.
- [ ] Confirmation is transactional across order status, inventory, and coupon redemption.
- [ ] Cancellation restores stock exactly once and follows allowed status transitions.
- [ ] Expiration only affects eligible Pending orders.
- [ ] WhatsApp is never represented as automatically sent.
- [ ] Remaining policy questions are explicitly decided before implementation.

## 12. Open Review Points

1. **Cart clearing — resolved:** clear only after successful order-creation commit; preserve the cart on failure.
2. **Confirmed-order cancellation and coupon usage — resolved from SRS:** cancelled orders do not count toward coupon limits. If a confirmed order is cancelled, release its redemption/usage in the same transaction as cancellation, exactly once.
3. **Price changes before confirmation — resolved from SRS:** confirmation is blocked until discrepancies are resolved and the customer approves a revised total when required. Update the current order snapshot; the MVP does not retain a detailed edit history. Record agreement against the current version/total.
4. **Email verification retry — implementation rule:** resend only within rate limits and invalidate prior unconsumed challenges when issuing a replacement; challenges remain hashed, single-use, and time-limited.
5. **Inventory adjustment validation — resolved:** validate proposed stock before applying changes; stock must remain a non-negative integer. Update stock and write the reasoned adjustment record atomically.
6. **Idempotency ordering — corrected:** check the customer-scoped idempotency key before creating the order and persist the key/result atomically with the order.

No unresolved policy blocker remains in these workflow diagrams. Technical implementation details (database lock strategy, scheduled-job mechanism, and email provider) remain design choices and must satisfy the requirements above.
