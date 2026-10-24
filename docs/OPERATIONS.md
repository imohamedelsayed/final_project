# Pixel Store — Operations & Deployment Guide

## 1. Storage & Persistent Disk Deployment Constraint

### Application-Server Filesystem Storage
In accordance with approved PRD/SRS requirements and architectural decisions, the MVP stores product images and banners directly on the application server's local filesystem (`UPLOAD_DIR`, defaulting to `./uploads`).

### Production Deployment Constraint
- **Mandatory Persistent Volume / Disk:** Any production container or VM runtime deploying `@pixel-store/api` **must** mount a persistent disk or durable block volume to the directory specified by `UPLOAD_DIR`.
- **Ephemeral Runtimes Prohibited:** Stateless container platforms without persistent volume support (such as ephemeral container free tiers that wipe disks upon container sleep/restart) are **strictly unacceptable** because uploaded catalog media and banners will be lost on container recycling.
- **Replaceable Storage Adapter:** Media storage is abstracted behind the `StorageAdapter` interface in `apps/api/src/modules/media/storage-adapter.js`. The default implementation is `LocalStorageAdapter`. If an external free-tier compatible storage backend is approved in a future phase, it can be provided to `createApp({ storageAdapter })` without modifying catalog domain logic.

## 2. Image Upload Security Controls

1. **Format & Magic Byte Verification:**
   - File extensions and client MIME headers are untrusted.
   - Files are validated against magic byte signatures (JPEG, PNG, WebP only). Executable files, scripts (PHP, JS, Shell), and spoofed image payloads are rejected with `422 VALIDATION_ERROR`.
2. **Payload Ceilings:**
   - Enforced by `MAX_UPLOAD_SIZE_BYTES` (defaults to 5MB).
   - Oversized uploads are rejected with clear error envelopes before disk write.
3. **Path Traversal & Filename Generation:**
   - User-supplied filenames are never used for disk storage.
   - Files are saved as cryptographic UUIDs with validated extensions: `${crypto.randomUUID()}.${detected.ext}`.
   - Media serving endpoint (`/api/v1/media/:subDir/:filename`) validates input strictly against `^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$` and enforces that resolved paths reside strictly within `UPLOAD_DIR`.
4. **Reference-Safe Physical Deletion:**
   - Deleting a `ProductImage` or `Banner` record queries the database for remaining references across both `product_images` and `banners`.
   - The physical file on disk is unlinked **only** when reference count reaches 0. If another product or banner references the same file, the file is safely preserved.

## 3. Catalog Integrity & Invariants

1. **Default Variant Invariant:**
   - Every product must always have exactly one default purchasable variant (`is_default: true`).
   - Partial unique index `uq_product_variants_one_default` enforces at most one default variant per product in PostgreSQL.
   - Setting another variant to `is_default: true` atomically demotes the previous default variant in a transaction.
   - Deleting the default variant or unsetting `is_default` directly without replacement is blocked.
2. **Safe Deletion Rules:**
   - **Products:** Hard deletion is disabled; products are hidden/unpublished using `is_published: false` to preserve historical integrity.
   - **Categories:** Cannot be deleted if they contain subcategories (`CATEGORY_HAS_CHILDREN`) or associated products (`CATEGORY_IN_USE`).
   - **Brands:** Cannot be deleted if associated with products (`BRAND_IN_USE`).
   - **Variants:** If referenced by historical orders, active carts, or inventory adjustment logs, deletion deactivates the variant (`is_active: false`) rather than hard-deleting it.
3. **Auditable Inventory Adjustments:**
   - Variant stock updates cannot be arbitrarily overwritten.
   - All manual stock adjustments must go through `POST /api/v1/admin/inventory/adjustments`.
   - Transactions lock the variant row (`SELECT ... FOR UPDATE`), check that resulting stock is non-negative (`stock_quantity >= 0`), update stock, and append an auditable record with the admin actor UUID, timestamp, delta, and reason.

## 4. Order Lifecycle, Expiration Scheduler & Operational Safety

### 24-Hour Expiration Policy & Cron Job
- **Policy:** In accordance with approved business specifications, Pending orders are not reserved stock indefinitely. Once an admin provides the final total and shipping fee (`final_total_sent_at`), a 24-hour expiration window begins. If customer agreement is not recorded and the order is not confirmed within 24 hours of dispatch, it is eligible for automatic expiration.
- **Independent CLI Command:** Expiration is decoupled from in-process timers (which fail silently when servers sleep or restart) and is provided as a standalone CLI job:
  ```bash
  # Inside apps/api
  pnpm orders:expire
  # Or from workspace root
  pnpm --filter @pixel/api orders:expire
  # Or directly via node
  node apps/api/src/jobs/expire-orders.js
  ```
- **Scheduler Compatibility:**
  - Can be scheduled via any free-tier compatible scheduler (e.g., standard OS `crontab`, systemd timer, GitHub Actions scheduled workflow, or external cron runner).
  - Recommended interval: Hourly or every 30 minutes (`*/30 * * * *`).
  - **Idempotency & Safety:** The job queries `status = 'pending' AND final_total_sent_at < NOW() - INTERVAL '24 hours'`. It never expires confirmed, shipped, or already cancelled orders. Re-running the job has no side effects on already expired or non-eligible orders.

### Order Confirmation & Concurrency Controls
- **Stock Deduction Invariant:** Inventory is **never** deducted when a customer creates a pending order. Stock is deducted **only** upon admin confirmation inside a single transactional row lock (`SELECT ... FOR UPDATE` on `product_variants`).
- **Atomic Confirmation:** Confirms orders only if the customer has agreed to the final terms (`customer_agreed_at` is set) and stock is sufficient. If concurrent confirmation attempts occur on the last unit of stock, one transaction succeeds and the other fails safely with `409 INSUFFICIENT_STOCK`.
- **Coupon Redemptions:** Coupons are quoted without reservation. When an order is confirmed, the coupon redemption is atomically recorded. If a confirmed order is subsequently cancelled, stock is restored and the coupon redemption is reversed (`is_reversed: true`).
- **Audit Immutability:** Historical order events (`order_events`) are strictly append-only. No admin route allows mutating or deleting event records.

### WhatsApp Handoff & Store Settings
- The customer confirmation screen generates a WhatsApp click-to-chat URL (`https://wa.me/<STORE_PHONE>?text=<ENCODED_MESSAGE>`).
- The store phone number is dynamically resolved from `store_settings` (row 1, `whatsapp_number`) or the environment configuration `WHATSAPP_NUMBER`. It is never hard-coded.
- Opening or clicking the WhatsApp link does not alter the order status. Confirmation remains an explicit admin operational action.

## 5. Free-Tier Production Deployment & Readiness Analysis

### A. Strict Zero-Cost Free-Tier Constraint
Under the project's strict requirement, all production components must run strictly on zero-cost free tiers with no paid infrastructure or hidden subscription costs.

### B. Persistent Media Storage Blocker & Free-Tier Resolution
- **Current Limitation:** The application stores product images and banners via `LocalStorageAdapter` in `UPLOAD_DIR` (`./uploads`).
- **Production Blocker:** Standard free container platforms (e.g., Render Free, Railway Starter) use ephemeral filesystems. When free containers restart or spin down after 15 minutes of inactivity, all uploaded catalog media, variant photos, and banners are permanently deleted.
- **Approved Free-Tier Solutions:**
  1. **Persistent Volume Runtime:** Deploy on a provider supporting persistent block volumes on its free tier (e.g., Fly.io free tier with a 1GB persistent volume mounted to `/uploads`, or Oracle Cloud Always Free VM with 50GB persistent block volume).
  2. **Cloud Storage Adapter:** Implement a cloud-compatible adapter implementing `StorageAdapter` (defined in `apps/api/src/modules/media/storage-adapter.js`) targeting a zero-cost cloud storage provider (e.g., Supabase Storage free tier with 1GB storage / S3 compatibility, or Cloudinary free tier with 25GB managed storage).
- **Deployment Status:** Public production deployment to ephemeral containers is **blocked** until a persistent volume is mounted or a cloud storage adapter is selected and verified.

### C. Free-Tier Database Strategy
- **Recommended Provider:** Supabase PostgreSQL or Neon PostgreSQL free tier (500MB storage, pooled connections, SSL enforcement).
- **Setup Requirements:**
  - Standard PostgreSQL connection string with SSL (`DATABASE_URL=postgresql://...`).
  - Extensions required: `uuid-ossp` or `pgcrypto` (handled in Migration 1).
  - Run migrations sequentially: `pnpm --filter @pixel-store/api db:migrate`.
  - Backups: Automated periodic `pg_dump` backups scheduled via GitHub Actions to free cloud storage.

### D. Free-Tier Scheduled Expiration Job
To run the 24-hour pending order expiry job without paying for cron daemons:
- **Approach 1 (GitHub Actions Scheduled Workflow):**
  Create a `.github/workflows/order-expiry.yml` cron workflow running on schedule (`*/30 * * * *`) that executes:
  ```bash
  pnpm --filter @pixel-store/api orders:expire
  ```
- **Approach 2 (External Free Web Cron):**
  Use cron-job.org (free, reliable) or EasyCron to send an HTTP POST request every 30 minutes to:
  ```
  POST https://<your-api-domain>/api/v1/jobs/expire-orders
  Header: Authorization: Bearer <SCHEDULER_SECRET>
  ```
  This endpoint runs `reconcileExpiredOrders()` securely and returns the count of expired orders.

### E. Free-Tier Email Delivery Strategy
- **Recommended Providers:** Brevo (formerly Sendinblue) provides 300 free emails/day; Resend provides 100 free emails/day.
- Both are natively supported in `apps/api/src/modules/auth/email-service.js` using Node.js global `fetch` without extra npm dependencies.
- Configuration:
  ```env
  EMAIL_PROVIDER=brevo  # or resend
  EMAIL_API_KEY=your-api-key
  EMAIL_FROM=orders@pixelstore.com
  ```

### F. Production Deployment Checklist
Before launching in production:
1. [ ] **Persistent Disk / Volume:** Confirm `UPLOAD_DIR` is mounted on a durable persistent volume or cloud storage adapter is activated.
2. [ ] **Secrets Generation:** Generate cryptographically secure random values:
   - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (>= 32 chars)
   - `TOTP_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (32 bytes)
   - `SCHEDULER_SECRET`: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
3. [ ] **Database Migration:** Run `pnpm --filter @pixel-store/api db:migrate`. Verify all 4 migrations apply with exit code 0.
4. [ ] **Store Settings Seed:** Run `pnpm --filter @pixel-store/api db:seed` to insert row 1 into `store_settings`.
5. [ ] **Bootstrap Initial Super Admin:** Run `pnpm --filter @pixel-store/api db:create-super-admin` with secure non-default credentials.
6. [ ] **CORS & Cookies:** Configure `CORS_ORIGIN` matching the production frontend domain. Verify session cookies use `HttpOnly`, `SameSite: Lax`, and `Secure` (automatic when `NODE_ENV=production`).
7. [ ] **Scheduler Activation:** Configure GitHub Actions cron or cron-job.org pointing to `/api/v1/jobs/expire-orders`.

