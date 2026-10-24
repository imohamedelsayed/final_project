# Pixel Store API Contract Plan

Base path: `/api/v1`. JSON request/response bodies; money is a decimal string (`"11200.00"`), timestamps ISO 8601 UTC, IDs UUIDs. Cookie sessions authenticate browser requests; no bearer token is exposed to frontend JavaScript.

```json
// success
{ "data": {}, "meta": { "requestId": "..." } }
// error
{ "error": { "code": "ORDER_NOT_CONFIRMABLE", "message": "This order cannot be confirmed.", "fields": {} }, "meta": { "requestId": "..." } }
```

Controllers accept allow-listed DTO fields only. Unknown mutable fields are rejected. Pagination uses `page`/`pageSize` with bounded page size; public list responses omit stock quantities, internal notes, token material and staff-only fields.

## Authentication and account

| Method/path | Access | Contract and key errors |
|---|---|---|
| `POST /auth/register` | public | `{name,email,password}`; creates unverified customer and challenge. `VALIDATION_ERROR`, generic `EMAIL_UNAVAILABLE`, `RATE_LIMITED`, `EMAIL_DELIVERY_FAILED`. |
| `POST /auth/verify-email` | public | `{token}` (or approved OTP form); consume hash atomically. `VERIFICATION_INVALID`. |
| `POST /auth/resend-verification` | public | `{email}`; rate limited; replace prior active challenge. Always privacy-safe response. |
| `POST /auth/login` | public | `{email,password,totpCode?}`; Admin/staff require TOTP. Sets session/CSRF cookie. `AUTH_INVALID`, `EMAIL_UNVERIFIED`, `TOTP_REQUIRED`, `RATE_LIMITED`. |
| `POST /auth/logout` | authenticated | revoke current session and clear cookie. |
| `GET /auth/me` | authenticated | profile, role and verification state only. |
| `GET/PATCH /account` | customer | read/update allow-listed personal fields; no role or verification mutation. |

## Public catalog

| Method/path | Access | Rules |
|---|---|---|
| `GET /products` | public | filters: `q,category,brand,minPrice,maxPrice,availability,sort,page,pageSize`; published-only, stable sort and no quantity disclosure. |
| `GET /products/:slug` | public | published product with active purchasable variants, images/specs; unavailable variants are represented without stock count. |
| `GET /categories`, `GET /brands`, `GET /featured-products`, `GET /banners` | public | active/published records only. |

## Cart, coupons, checkout and orders

| Method/path | Access | Request / mandatory behavior |
|---|---|---|
| `GET /cart` | verified customer | current lines, current authoritative subtotal; no reservation. |
| `POST /cart/items` | verified customer | `{variantId,quantity}`; validate active/published and positive bounded integer. |
| `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId`, `DELETE /cart/items` | verified customer | quantity updates/removal/clear only for caller-owned cart. |
| `POST /coupons/quote` | verified customer | `{code}`; returns eligibility and server-calculated discount; quote is non-binding and does not increment usage. |
| `POST /checkout/orders` | verified customer | `Idempotency-Key` header + address, coupon code optional, terms acceptance. Revalidate all data; create Pending order/snapshots atomically; clear cart only after commit; response includes `order`, `whatsappUrl`. `IDEMPOTENCY_CONFLICT`, `CART_STALE`, `COUPON_INVALID`, `VALIDATION_ERROR`. |
| `GET /orders`, `GET /orders/:orderNumber` | verified customer | caller-owned orders only, snapshots and permitted status data. |
| `POST /orders/:orderNumber/cancel` | verified customer | Pending only; transition atomically. `ORDER_STATUS_INVALID`. |

The API never sends WhatsApp. The UI opens the returned click-to-chat URL after a successful order result and preserves the result if opening fails.

## Admin operations

| Method/path | Access | Purpose |
|---|---|---|
| `POST/GET/PATCH /admin/products`, `/admin/products/:id` | admin+ | catalog metadata/publication; no hard delete. |
| `POST/PATCH /admin/products/:id/variants` | admin+ | SKU, price, options, active/default state, inventory parameters. |
| `POST/DELETE /admin/products/:id/images` | admin+ | validated upload/metadata/order/primary image; storage key never comes directly from client. |
| `POST/GET/PATCH /admin/categories`, `/admin/brands`, `/admin/coupons`, `/admin/banners`, `/admin/featured-products` | admin+ | respective management; validate slugs, unique codes, URLs and publication state. |
| `POST /admin/inventory/adjustments` | admin+ | `{variantId,quantityDelta,reason}`; transactionally update non-negative stock and write adjustment. |
| `GET /admin/orders` | admin+ | operational queue, including overdue/missing-final-total signals; never relies only on client filtering. |
| `PATCH /admin/orders/:id/final-total` | admin+ | set shipping and recomputed final total; record only after message has actually been sent by Admin. Sets expiry timestamp. |
| `POST /admin/orders/:id/customer-agreement` | admin+ | record agreement to current version/total. |
| `POST /admin/orders/:id/confirm` | admin+ | one transactional confirmation; `409` for state, price, stock or coupon conflicts. |
| `POST /admin/orders/:id/transition` | admin+ | allowed Processing/Delivered/Cancelled transitions only; cancellation executes one-time reversal where applicable. |
| `GET/PATCH /admin/settings/whatsapp` | super_admin | singleton WhatsApp setting. |
| `GET/POST/PATCH /admin/users` | super_admin | create/deactivate staff and controlled TOTP enrollment; never public. |

## Status and validation conventions

- `400` malformed JSON/invalid query; `401` no/expired session; `403` role/ownership failure; `404` non-disclosure-safe absent resource; `409` stale state, unique conflict, idempotency conflict, transition, stock or coupon race; `422` semantic validation; `429` rate-limited; `500` opaque internal error.
- API services use consistent domain codes, e.g. `STOCK_UNAVAILABLE`, `ORDER_EXPIRED`, `CUSTOMER_AGREEMENT_REQUIRED`, `COUPON_LIMIT_REACHED`.
- Every mutation records a request ID. Retriable database/provider failures return no false success. The checkout response comes only after commit.
