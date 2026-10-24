# Database Design Review

## Approved baseline

The supplied PostgreSQL/TypeORM design correctly places sellable SKU, price, and stock on `product_variants`, uses `numeric(12,2)` and UTC `timestamptz`, preserves order/address snapshots, and uses deactivation rather than destructive deletion. Use migration files only; disable production schema synchronization.

## Approved schema refinements (Approved 2026-10-22)

The following refinements have been approved and will be integrated into the schema and migrations during Milestone 2:

| Item | Decision / reason |
|---|---|
| `order_idempotency_keys` | Add `id UUID`, `user_id`, `idempotency_key`, `request_hash`, `order_id`, `created_at`; unique `(user_id,idempotency_key)`. Required by approved workflow to prevent duplicate checkout. |
| Pending coupon reference | Add nullable `coupon_id` to `orders` plus `coupon_code_snapshot`. Revalidation cannot safely rely on a mutable code alone. |
| Agreement versioning | Add `pricing_version` and `agreed_pricing_version` (or equivalent `customer_agreed_final_total`) on orders. Any shipping/item/price mutation invalidates agreement; confirmation requires equality. |
| Coupon reversal | Keep `coupon_redemptions` immutable or add `reversed_at/reversed_by_order_event`; enforce one redemption per order and count only unreversed redemptions. This makes cancelled orders cease counting. |
| Order events | Add append-only `order_events` for status, final-total dispatch, agreement, and cancellation reasons. This is operational history, not a full audit-log promise. |
| ERD repair | Include `email_verification_challenges`, `sessions`, `admin_totp_credentials`, `inventory_adjustments`, and the idempotency table; current prose contains several absent from its diagram. |

## Constraints, keys and indexes

- UUID PKs; normalized lower-case email and coupon-code unique indexes; SKU/slug/order-number unique.
- CHECK: allowed roles/statuses/conditions/coupon types; non-negative price/stock/threshold/totals; positive item quantity; percentage ≤100; `ends_at > starts_at` when start exists.
- Partial unique: one default variant per product, one primary image per product. Service transaction enforces **exactly** one default variant.
- Index `(is_published, category_id)`, `products.brand_id`, `product_variants.product_id`, `cart_items(cart_id,variant_id)` unique, `orders(user_id,created_at DESC)`, `orders(status,expires_at)`, `coupon_redemptions(coupon_id,redeemed_at)` and `(user_id,coupon_id)`, and expiring/session/challenge lookup indexes described in the source schema.
- FKs default to restrict/deactivate catalog and historical owners; cascade only disposable dependent records after reviewed retention policy. Order snapshots survive catalog mutation.

## Transaction recipes

### Create order

Lock/insert idempotency record, load caller cart and active published variants, calculate price/discount from DB, create Pending order/items/address and result mapping, then clear cart in the same transaction. Commit before returning WhatsApp URL. No stock update/redemption.

### Confirm order

1. Begin transaction; lock order `FOR UPDATE`; require Pending, unexpired, sent final total, and matching customer agreement version.
2. Lock coupon row/redemption scope if used; recompute against current policy and limits.
3. For each line, lock variant deterministically or execute guarded decrement (`UPDATE ... SET stock_quantity=stock_quantity-$q WHERE id=$id AND stock_quantity >= $q`) and assert every affected row.
4. Insert redemption, update status/timestamps/stock-deducted marker, create event, commit. Any failure rolls back all effects.

### Cancel / expire

Expiry conditionally changes only eligible Pending rows and has no stock/coupon side effect. Cancellation locks the order, restores only when `stock_deducted_at` exists and `stock_restored_at` does not, reverses an existing redemption once, then marks Cancelled. Terminal state checks make retries harmless.

## Migration and seed plan

1. Extensions/UUID strategy; enums or checked text; core users/category/brand/catalog.
2. variants/images/specifications, carts, coupons/settings/banners/featured.
3. orders/snapshots/events/idempotency/redemptions/inventory adjustments/auth/session tables.
4. Partial indexes and FK deletion behavior in explicit migrations.
5. Seed singleton settings, controlled initial Super Admin through a server-only script, categories/brands, and explicitly labelled demo data only for non-production.

Every migration has an up/down or documented forward-only recovery path; run in a disposable database first. Take and restore-test a logical backup before production migration. Test lock/race behaviour using two independent database connections.
