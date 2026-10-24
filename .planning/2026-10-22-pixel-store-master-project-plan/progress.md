# Progress Log

## Session: 2026-10-22

### Current Status
- **Phase:** Phase 8 — Milestone 2: Database + Authentication (Complete)
- **Started:** 2026-10-22

### Actions Taken
- Implemented Milestone 2 (Database + Authentication) as a single coherent milestone continuing from API Foundation.
- Designed and registered TypeORM EntitySchemas for all approved tables:
  - Users, admin TOTP credentials, email verification challenges, sessions.
  - Categories, brands, products, product variants, product images, product specifications, banners, featured products, inventory adjustments.
  - Carts, cart items, coupons.
  - Orders, order items, order addresses, order idempotency keys, coupon redemptions, order events.
  - Store settings singleton.
- Created 4 sequential reversible TypeORM migrations covering extensions, tables, check constraints, foreign key cascades/restrictions, normalized unique indexes, and partial unique indexes (e.g. one default variant per product, one primary image per product).
- Implemented safe database initialization (`apps/api/src/db/scripts/ensure-databases.js`), migration runner (`apps/api/src/db/scripts/migrate.js`), singleton store settings seed (`apps/api/src/db/scripts/seed.js`), and initial Super Admin creation script (`apps/api/src/db/scripts/create-super-admin.js`) without hard-coded credentials.
- Implemented core authentication services and routes:
  - Argon2id password hashing and constant-time verification (`password-service.js`).
  - Cryptographic token and 6-digit OTP generation and verification (`token-service.js`).
  - Pluggable email verification adapter supporting in-memory simulation, Brevo, and Resend (`email-service.js`).
  - Database-backed session management with rolling activity updates, revocation on logout, and inactivity timeout enforcement: 30 days for customers, 60 minutes for staff (`session-service.js`).
  - Staff TOTP enrollment, verification, and AES-256-GCM secret encryption at rest (`totp-service.js`).
  - Super Admin TOTP reset capability for staff accounts with session revocation and audit logging.
  - RBAC middleware (`requireAuth`, `requireRole`, `requireVerifiedEmail`) and double-submit CSRF protection middleware (`csrfProtection`).
- Added comprehensive integration tests against an isolated PostgreSQL test database covering:
  - Schema constraints, indexes, partial unique indexes, check constraints, and migration reversibility.
  - Customer registration, verification challenge delivery, attempt limits, and resend privacy safety.
  - Customer login, email verification gate, session cookie issuance, `/auth/me`, and logout revocation.
  - Staff TOTP enrollment, TOTP-enforced login, and Super Admin recovery protection.
  - Deterministic seeds and initial Super Admin creation.
  - Customer 30-day and staff 60-minute inactivity timeouts, and CSRF protection.
- Verified all quality checks pass cleanly: 48 automated tests passing, clean ESLint, Prettier format check, and successful Next.js build.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `pnpm format:check` | All files match prettier style | Exit code 0, 0 style warnings | Pass |
| `pnpm lint` | Clean eslint across api & web | Exit code 0, 0 warnings, 0 errors | Pass |
| `pnpm test` | Unit & API tests pass | Exit code 0, 48 tests passed (migrations, auth-flow, session-security, staff-totp, seeds, app, env, errors, rate-limit) | Pass |
| `pnpm build` | Clean production build of api & web | Exit code 0, Next.js prerendered routes cleanly | Pass |

### Errors
| Error | Resolution |
|-------|------------|
| Planning resolver script execution was blocked by the local policy; Git status could not run because the root is not a Git repository | Recorded both limitations and avoided any source-control or repository-state claims. |
| One `rg` expression was invalid after PowerShell escaping | Re-ran the read with a simpler expression; this did not affect files or findings. |
| `pnpm` not in system PATH when spawning recursive scripts | Enabled pnpm shim via `corepack enable --install-directory "$env:APPDATA\npm" pnpm`. |
| ESLint reported React/Next warnings on `apps/api` and `no-undef` on `fetch` | Scoped Next.js ESLint plugin to `apps/web/` and declared Node runtime globals for `apps/api/`. |
| ESLint caught missing `setInterval` global in `rate-limit.js` and unused `AppError` in test | Added timer globals to ESLint config and added explicit test assertion for base `AppError`. |

## Session: 2026-10-23

### Current Status
- **Phase:** Phase 9 — Milestone 4: Catalog + Admin Product Management (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Implemented **Catalog + Admin Product Management** milestone following existing schema, business rules, and API specifications.
- Implemented replaceable media storage abstraction (`apps/api/src/modules/media/storage-adapter.js`):
  - `LocalStorageAdapter` with safe directory boundary enforcement, resolving against configured `UPLOAD_DIR`, and preventing path traversal.
  - Factory `createStorageAdapter` to easily allow swapping in cloud/S3/blob storage in future without modifying catalog or media services.
- Implemented secure media processing service (`apps/api/src/modules/media/media-service.js`):
  - Real content inspection via magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF....WEBP`).
  - Strict MIME validation against allowed list (`image/jpeg`, `image/png`, `image/webp`).
  - Size enforcement against `MAX_UPLOAD_SIZE_BYTES`.
  - Non-executable, collision-resistant UUID filename generation.
  - Multi-reference check across `product_images` and `banners` before physical file deletion, avoiding deletion of files referenced by products or banners.
- Implemented media endpoints and routes (`apps/api/src/modules/media/media-controller.js`, `media-routes.js`):
  - Zero-dependency multipart parsing using Node.js Web API `Readable.toWeb(req)` and `new Response(stream, headers).formData()`.
  - Authenticated admin upload endpoint: `POST /api/v1/admin/media/upload` (requires `admin` or `super_admin`).
  - Public safe image serving: `GET /media/:filename` with strict filename regex, `X-Content-Type-Options: nosniff`, and `Cache-Control`.
- Implemented complete admin catalog domain logic (`apps/api/src/modules/catalog/catalog-service.js`, `catalog-schemas.js`, `catalog-controller.js`, `catalog-routes.js`):
  - **Categories**: Hierarchy management, cycle prevention (cannot set parent to self or descendant), safe deletion checks (blocks deletion if child subcategories or products exist).
  - **Brands**: Full CRUD, active/inactive toggling, safe deletion checks (blocks deletion if products exist).
  - **Products**: Full CRUD, slug generation/validation, publish/unpublish, hide/unhide, price in EGP, new/used condition, and duration of use for used items.
  - **Variants**: SKU validation, price, stock, active toggling, and atomic default-variant switching (maintaining exactly one default variant per product in PostgreSQL). Safe deletion logic: default variants cannot be deleted; variants with foreign references (`inventory_adjustments`, `cart_items`, `order_items`) are safely deactivated (`is_active = false`) instead of throwing foreign key violations.
  - **Specifications**: Upsert, list, and delete with unique `(product_id, spec_name)` constraint.
  - **Product Images**: Primary-image invariant maintenance (first image uploaded becomes primary; setting new primary demotes previous primary; deleting primary promotes next image), display ordering.
  - **Homepage Banners & Featured Products**: Full CRUD, ordering, active/inactive toggles, position-based homepage layout management.
  - **Inventory Adjustments**: Atomic stock adjustment with row-level locking (`SELECT ... FOR UPDATE`), strictly blocking negative stock outcomes (`409 INSUFFICIENT_STOCK`), disallowing zero delta (`422`), and writing auditable log entries with actor (`admin_id`), timestamp, delta, and reason.
- Updated `apps/api/src/modules/auth/session-service.js` to accept either `{ userId, role }` or user object in `createSession`.
- Documented persistent-disk requirement, storage adapter abstraction, image validation controls, and catalog invariants in `docs/OPERATIONS.md`.
- Added comprehensive automated test suites:
  - `apps/api/test/admin-catalog.test.js`: 6 test suites covering RBAC, category hierarchy & cycle prevention, brand CRUD & safe deletion, product creation with default variant & specifications & used condition/duration of use, inventory adjustments & audit logs, banners & featured products.
  - `apps/api/test/media-storage.test.js`: 3 test suites covering image magic-byte validation, rejection of spoofed/executable files, safe media serving headers, path traversal defense, and multi-reference physical file retention/deletion.
- Verified all quality checks pass cleanly: 59 automated tests passing (48 auth/db + 11 catalog/media), 0 ESLint warnings/errors, 0 Prettier format warnings, clean Next.js/Express build.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `pnpm format:check` | All files match prettier style | Exit code 0, 0 style warnings | Pass |
| `pnpm lint` | Clean eslint across api & web | Exit code 0, 0 warnings, 0 errors | Pass |
| `pnpm test` | Unit & API tests pass | Exit code 0, 59 tests passed (48 previous + 11 new catalog & media tests) | Pass |
| `pnpm build` | Clean production build of api & web | Exit code 0, Next.js & Express compiled cleanly | Pass |

### Errors
| Error | Resolution |
|-------|------------|
| TypeORM PostgreSQL `UPDATE/DELETE ... RETURNING *` returns `[rows, rowCount]` while `INSERT ... RETURNING *` returns `rows` | Created `normalizeRow(res)` in `catalog-service.js` to normalize the return structure. |
| Foreign key constraint violation on variant deletion when `inventory_adjustments` exist | Implemented safe deactivation (`is_active = false`) for referenced variants while preserving hard deletion for unreferenced non-default variants. |

## Session: 2026-10-23 (Milestone: Storefront + Cart)

### Current Status
- **Phase:** Phase 10 — Milestone 5: Storefront + Cart (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Implemented **Storefront + Cart** milestone adhering strictly to existing architecture, API contracts, design identity, and business rules without inventing claims or mock data.
- Implemented **Public Catalog Endpoints**:
  - `GET /api/v1/banners`: returns active/published banners ordered by `sort_order ASC`.
  - `GET /api/v1/featured-products`: returns featured products with safe public projection, EGP prices, and availability indicators.
  - `GET /api/v1/categories`: returns active categories.
  - `GET /api/v1/brands`: returns active brands.
  - `GET /api/v1/products`: published products list with server filtering (`q`, `category`, `brand`, `condition`, `minPrice`, `maxPrice`, `availability=in_stock`), stable sorting, pagination, and zero disclosure of exact stock quantities.
  - `GET /api/v1/products/:slug`: published product details with active variants, images, technical specifications, and boolean availability.
- Implemented **Persistent Cart Backend Module** (`apps/api/src/modules/cart/`):
  - `GET /api/v1/cart`: verified customer cart with line items, dynamic availability checks, and authoritative subtotal calculated from PostgreSQL database values.
  - `POST /api/v1/cart/items`: atomically adds or increments items in cart; validates published product, active variant, positive bounded quantity, and rejects out-of-stock or stock-exceeding requests (`409 STOCK_UNAVAILABLE`, `409 INSUFFICIENT_STOCK`).
  - `PATCH /api/v1/cart/items/:itemId`: updates line quantity with ownership check and available stock validation.
  - `DELETE /api/v1/cart/items/:itemId`: removes item with ownership enforcement.
  - `DELETE /api/v1/cart/items`: clears caller's cart.
- Built **Customer-Facing Storefront** in Next.js 16 (App Router) using Vanilla CSS design tokens adhering to the established brand identity:
  - Petrol green `#153F3A`, Warm off-white `#F6F0EB`, White cards, Discount red `#D94B3D`, Inter typography, and EGP currency formatting.
  - Shared Header with brand logo, navigation links, expandable search, customer auth/logout actions, and live cart badge with subtotal preview.
  - Shared Footer with brand assurances, catalog links, and Egypt COD notices.
  - Responsive Homepage (`/`) with hero showcase, horizontal category pill navigation, featured products grid, and 4-step WhatsApp explainer card.
  - Shop catalog listing (`/products`) with responsive sidebar filters, sorting dropdown, search term display, pagination, and empty state.
  - Product detail page (`/products/[slug]`) with image gallery, variant switching, technical specifications table, and stock availability indicator (zero-stock items marked "Unavailable" and disabled).
  - Shopping cart page (`/cart`) with authoritative subtotals, quantity controls, line item deletion, non-reservation notice, and unauthenticated/empty state handlers.
  - Authentication views (`/login`, `/register`, `/verify-email`) connected to real authentication endpoints with OTP verification.
- Added comprehensive automated test suites:
  - `apps/api/test/public-catalog.test.js`: tests public catalog visibility, active status filters, search, filtering, sorting, pagination, safe fields projection, and slug retrieval.
  - `apps/api/test/cart.test.js`: tests auth/verified email requirement, adding items, stock enforcement, ownership isolation across customers, item updates, deletions, and authoritative price revalidation.
- Verified all quality checks pass cleanly: 66 automated tests passing (59 previous + 7 new catalog/cart integration suites), 0 ESLint warnings/errors, 0 Prettier format warnings, clean Next.js/Express production build.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `pnpm format:check` | All files match prettier style | Exit code 0, 0 style warnings | Pass |
| `pnpm lint` | Clean eslint across api & web | Exit code 0, 0 warnings, 0 errors | Pass |
| `pnpm test` | Unit & API tests pass | Exit code 0, 66 tests passed (all suites green) | Pass |
| `pnpm build` | Clean production build of api & web | Exit code 0, all routes compiled and prerendered | Pass |

### Errors
| Error | Resolution |
|-------|------------|
| `createProduct` schema expects `variant_label` inside `default_variant` | Added `variant_label` to test fixtures in `public-catalog.test.js` and `cart.test.js`. |
| TypeORM PostgreSQL `DELETE ... RETURNING` returns `[rows, count]`, causing `deleted.length === 0` to evaluate to false | Created `extractRows` helper to properly inspect the returned rows array. |

## Session: 2026-10-23 (Milestone: Checkout + Orders + Coupons + Admin Order Management)

### Current Status
- **Phase:** Phase 11 — Milestone 6: Checkout + Orders + Coupons + Admin Order Management (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Implemented **Checkout + Orders + Coupons + Admin Order Management** milestone in accordance with the established API contracts, PostgreSQL database entities, and business decisions without duplicate modules or altered business rules.
- **Backend Order, Checkout, and Coupon Modules (`apps/api/src/modules/orders/`)**:
  - `order-schemas.js`: Zod schemas for checkout payload, coupon quote, admin coupons, admin final total dispatch, customer agreement recording, and order status transitions.
  - `order-service.js`:
    - **Customer Checkout**: Enforces verified customer authentication; validates Egyptian shipping details; verifies cart is non-empty; calculates authoritative server-side line totals; evaluates applicable coupon discount; snapshots items, prices, discounts, and terms acceptance (`terms_version` + timestamp); generates order number `PIX-YYYYMMDD-XXXXXX`; creates Pending Cash-on-Delivery order inside a PostgreSQL transaction.
    - **Customer-Scoped Idempotency**: Header `Idempotency-Key` is hashed alongside user ID and payload. Replaying identical request returns original order response safely without side-effects; modified payload with same key returns `409 IDEMPOTENCY_CONFLICT`.
    - **Stock Invariant**: Stock is strictly **not** reserved or deducted on Pending order creation.
    - **Cart Preservation**: Persistent cart is cleared only *after* the order database transaction commits successfully.
    - **Coupon Validation**: `POST /api/v1/coupons/quote` validates active status, validity window, usage limits, and minimum order requirements. Quotes do not reserve or increment usage. At most one coupon per order.
    - **WhatsApp Handoff**: Generates click-to-chat URL using dynamically fetched store phone number from `store_settings` or `WHATSAPP_NUMBER` configuration with prefilled encoded order reference and summary.
    - **Admin Order Queue & Details**: Role-protected queue filtering by status, date, and order reference with immutable item and address snapshots.
    - **Admin Final Total Dispatch**: Records final total, shipping fee, timestamps `final_total_sent_at`, increments `pricing_version`, and initiates 24-hour expiration countdown.
    - **Customer Agreement**: Enforces recording `customer_agreed_at` before order confirmation can proceed.
    - **Guarded Atomic Confirmation**: Runs inside a single database transaction with row-level locks (`SELECT ... FOR UPDATE` on `product_variants`). Re-checks stock, deducts stock atomically, verifies coupon limit, records coupon redemption, updates status to `confirmed`, and appends an immutable order audit event.
    - **Safe Cancellation & Reversal**: Cancelling a confirmed order restores inventory atomically and marks the coupon redemption as reversed (`is_reversed: true`).
    - **Immutable Order Events**: Chronological append-only audit trail (`order_events`). No update/delete routes exist.
    - **24-Hour Expiration Reconciliation**: Standalone CLI job (`orders:expire`) safely expires Pending orders where `final_total_sent_at < NOW() - INTERVAL '24 hours'`. Never touches confirmed or cancelled orders.
- **Admin Settings Module (`apps/api/src/modules/orders/`)**:
  - Super Admin protected endpoints to view and update store WhatsApp number and business settings.
- **Frontend Integration (`apps/web`)**:
  - `apps/web/app/lib/api.js`: Added all API client methods for coupon quote, order creation with idempotency key, order inspection, cancellation, and admin operations.
  - `apps/web/app/checkout/page.js`: Responsive checkout page with Egyptian address validation, terms acceptance, real-time server coupon quote, authoritative price breakdown, and client UUID idempotency key.
  - `apps/web/app/orders/[orderNumber]/page.js`: Order success & WhatsApp handoff screen with prefilled message, WhatsApp click-to-chat button, and pending order cancellation controls.
  - `apps/web/app/orders/page.js`: Customer order history with status pills, dates, and navigation links.
  - `apps/web/app/admin/orders/page.js`: Full admin order management interface with status filters, search, modal inspection of immutable snapshots, shipping fee / final total dispatch, customer agreement recording, confirmation action, cancellation action, and audit trail.
  - `apps/web/app/components/Header.jsx`: Connected "My Orders" for customers and "Admin Orders" for staff.
  - `apps/web/app/cart/page.js`: Connected "Proceed to Checkout" link.
- **Automated Tests (`apps/api/test`)**:
  - `orders-checkout.test.js`: 7 tests covering auth/verification, server totals, cart preservation, post-commit cart clearance, non-deduction on pending creation, idempotency replay/conflict, coupon quote validation, customer isolation, customer cancellation, and WhatsApp URL generation.
  - `admin-orders.test.js`: 8 tests covering admin role checks, Super Admin settings isolation, final total dispatch (+24h countdown & version increment), customer agreement requirement before confirmation, coupon limits enforcement, confirmed order cancellation with atomic stock restoration & coupon reversal, 24-hour expiry reconciliation job, append-only order events immutability, and concurrent confirmation on last stock unit avoiding overselling.
  - Total automated test count increased from 66 to **81 passing tests**.
- **Documentation**:
  - Updated `docs/OPERATIONS.md` with Section 4 covering the 24-hour expiration policy, CLI job invocation (`pnpm --filter @pixel/api orders:expire`), scheduler compatibility, atomic confirmation concurrency controls, and WhatsApp store configuration.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `pnpm format:check` | All files match prettier style | Exit code 0, 0 style warnings | Pass |
| `pnpm lint` | Clean eslint across api & web | Exit code 0, 0 warnings, 0 errors | Pass |
| `pnpm test` | Unit & API tests pass | Exit code 0, 81 tests passed (all suites green) | Pass |
| `pnpm build` | Clean production build of api & web | Exit code 0, all static and dynamic routes compiled | Pass |

### Errors
| Error | Resolution |
|-------|------------|
| Column name mismatch: `stock` vs `stock_quantity` on `ProductVariant` | Verified schema and updated all queries in `order-service.js` to reference `stock_quantity`. |
| `AppError` parameter mismatch in service helper | Corrected `AppError` signature to `(message, { statusCode, code, fields })`. |
| Next.js ESLint warning regarding React 19 `react-hooks/set-state-in-effect` | Unified user verification and data loading in single `useEffect` with cleanup ignore flag in `apps/web/app/admin/orders/page.js`. |

## Session: 2026-10-23 (Milestone: Integration + QA + Deployment Readiness)

### Current Status
- **Phase:** Phase 12 — Milestone 7: Integration + QA + Deployment Readiness (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Established real baseline across repository checks: Prettier check, ESLint, Node.js test runner against PostgreSQL, and Next.js Turbopack production build.
- **End-to-End Integration & Security Audit**:
  - Identified unscoped `router.use(requireAuth, requireVerifiedEmail)` in `cart-routes.js` that inadvertently intercepted all non-cart requests lacking session cookies. Scoped to `/cart` path: `router.use('/cart', requireAuth, requireVerifiedEmail)`.
  - Audited `api.getMe()` and `api.login()` return shapes. Resolved schema mismatch where `/api/v1/auth/me` returns `{ data: { user } }` while callers in `checkout` and `admin/orders` expected normalized user fields. Normalized user object in `api.js` supporting both camelCase (`emailVerifiedAt`) and snake_case (`email_verified_at`), and direct root properties.
  - Added redirect parameter preservation in `apps/web/app/login/page.js` via `useSearchParams()` inside `<Suspense>` boundary, ensuring seamless return to `/checkout` or `/admin/orders` after customer/staff authentication.
  - Added database safety guards in `apps/api/test/helpers/db-helper.js`: `getTestDataSource` and `cleanDatabase` strictly block execution if `NODE_ENV === 'production'` or if database URL does not contain `"test"`.
  - Added HTTP scheduler webhook endpoint `POST /api/v1/jobs/expire-orders` in `order-routes.js` and `order-controller.js` guarded by `SCHEDULER_SECRET`, enabling reliable free-tier web cron schedulers (e.g. cron-job.org or GitHub Actions curl) without requiring container shell or SSH access.
  - Created comprehensive end-to-end integration test `apps/api/test/e2e-workflow.test.js` validating complete customer-to-admin lifecycle against PostgreSQL: customer registration, email OTP verification, login, admin catalog creation (category, brand, product with stock 5, 10% coupon), public catalog safe browsing without stock disclosure, cart additions, coupon quoting, idempotent checkout, WhatsApp handoff URL generation, stock non-deduction on pending creation, idempotency replay and conflict detection, admin order queue search, premature confirmation prevention, shipping & final total dispatch (+24h countdown & version increment), customer agreement recording, atomic confirmation with stock deduction (5 -> 3), duplicate confirmation block, status progression to processing, admin cancellation with atomic stock restoration (3 -> 5) and coupon redemption reversal (`reversed_at`), and chronological immutable audit trail.
- **Operations & Deployment Readiness Documentation**:
  - Updated `docs/OPERATIONS.md` with Section 5 covering the free-tier deployment strategy, the local-filesystem persistent media storage blocker, and free-tier resolution pathways (Fly.io/Oracle Cloud persistent volumes or Supabase/Cloudinary storage adapters).
  - Updated `.env.example` with Next.js frontend URLs (`NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`) and safe placeholder secrets.
  - Updated `README.md` with full milestone status, order expiry job commands, and quality scripts.

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `pnpm format:check` | All files match prettier style | Exit code 0, 0 style warnings | Pass |
| `pnpm lint` | Clean eslint across api & web | Exit code 0, 0 warnings, 0 errors | Pass |
| `pnpm test` | Unit & API tests pass | Exit code 0, 82 tests passed (all suites green against PostgreSQL) | Pass |
| `pnpm build` | Clean production build of api & web | Exit code 0, all static and dynamic routes compiled | Pass |

### Errors & Resolutions
| Error | Resolution |
|-------|------------|
| `cart-routes.js` unscoped `router.use(requireAuth)` intercepted unauthenticated scheduler route | Scoped middleware to `/cart` route prefix in `cart-routes.js`. |
| `api.getMe()` returned `{ user: { ... } }` causing `me.role` and `currentUser.email_verified_at` to be undefined in frontend callers | Normalized user object in `api.js` exposing root properties alongside `.user` object. |
| Login page always navigated to `/cart`, ignoring `?redirect=` query param | Added `useSearchParams()` with safe destination validation wrapped in `<Suspense>`. |
| Test helper lacked explicit production database guard | Added hard checks throwing errors if `NODE_ENV === 'production'` or DB name lacks `"test"`. |
| ESLint caught unused `logger` in `order-controller.js` and `superAdminLoginBody` in `e2e-workflow.test.js` | Removed unused logger argument and added assertion for `superAdminLoginBody.data.user.role`. |

## Session: 2026-10-23 (Milestone: Admin Catalog & Inventory Implementation)

### Current Status
- **Phase:** Admin Catalog & Inventory Foundation (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Built and verified the four core administrative catalog and inventory pages:
  1. `/admin/products`: Full product catalog list with search by title/SKU/slug, filters for category, brand, condition ('new' / 'used'), publication status, and sorting. Support for product creation with default variant, multiple specifications, and duration of use for used hardware. Product management drawer supporting editing core details, variant management (add/edit/delete), technical specifications, and photo gallery (multipart image upload, primary selection, deletion).
  2. `/admin/categories`: Category management with search and active-status filters, parent category selection preventing invalid self-parenting loops, sort ordering, creation, editing, and safe deletion.
  3. `/admin/brands`: Brand management with search and active-status filters, automated slug generation, active/inactive toggles, creation, editing, and conflict-checked deletion (preventing deletion of brands with associated products). Note: Brands schema has no logo column; no fake file upload was created per project rules.
  4. `/admin/inventory`: SKU inventory management with real-time stock levels and alert badges (In Stock, Low Stock, Out of Stock). Real-time stock adjustment modal with quantity delta (+ / -) and mandatory audit reason. Prevents negative stock balance. Threshold management for low-stock alerts. Auditable chronological inventory adjustment trail tab showing staff user, timestamp, delta, and reason.
- Backend gaps addressed:
  - Added `listInventoryItems` endpoint (`GET /api/v1/admin/inventory/items`) in `catalog-service.js`, `catalog-controller.js`, and `catalog-routes.js` supporting search, status filter (`out_of_stock`, `low_stock`, `in_stock`), condition filter, and pagination.
  - Added automated integration tests in `admin-catalog.test.js` verifying inventory items list, stock quantity, and SKU matching.
- Frontend API Client (`apps/web/app/lib/api.js`):
  - Updated `fetchJson` to support `FormData` (omits default `Content-Type: application/json` for browser boundary calculation).
  - Added `fetchPaginated` helper returning `{ items, pagination }`.
  - Added full admin API methods for categories, brands, products, variants, specifications, images, and inventory adjustments.
- Quality Gates & Verification:
  - `pnpm format`: Prettier applied across all 4 files.
  - `pnpm format:check`: 100% compliant.
  - `pnpm lint`: Exit code 0 across both `apps/api` and `apps/web`.
  - `pnpm test` (API): All 82 tests passing against PostgreSQL.
  - `pnpm --filter @pixel-store/web build`: Turbopack build compiled all 15 routes including all 4 admin routes with exit code 0.

## Session: 2026-10-23 (Milestone: Admin Management Pages & Storefront Policy Pages)

### Current Status
- **Phase:** Admin Management Pages & Storefront Policy Pages (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Built and verified the remaining five administrative management pages and six storefront policy pages in one cohesive pass without mock data, fake controls, or unpersisted local state.
- **Admin Management Pages**:
  1. `/admin/coupons`: Complete coupon lifecycle management. Live KPI metrics (Active, Inactive, Expired, Total Redemptions). Filterable table by code search, discount type (`percentage` vs `fixed`), and status. Modal create and edit dialogs supporting percentage discounts with cap or fixed EGP discounts, ISO validity windows, minimum purchase requirement, per-coupon usage limits, and active status toggle. Quick status switch and safe deletion dialog backed by backend check preventing deletion of coupons with existing redemptions.
  2. `/admin/banners`: Hero and promotional banners manager. Supports live upload using real media storage endpoint (`api.uploadStandaloneMedia`), image URL input fallback, banner title/content, external or internal destination URL, numeric sort order, and published toggle. Live preview card with responsive styling. Safe delete confirmation dialog.
  3. `/admin/featured`: Featured hardware curation backed by `/api/v1/admin/featured-products`. Candidate product picker dropdown dynamically filtering out products already featured to prevent duplicate assignments. Inline sort order editing and modal removal dialog with immediate database synchronization.
  4. `/admin/settings`: Real persisted store configuration backed by `store_settings` table and `/api/v1/admin/settings/whatsapp`. Displays active WhatsApp contact configuration, Egyptian fulfillment policy specifications (24h payment window, 1-coupon restriction, Cash on Delivery terms), and free-tier infrastructure runtime status. Read access granted to all administrators; mutation restricted to Super Admins.
  5. `/admin/users`: Role-guarded staff management strictly accessible to Super Admins (enforced by backend `requireRole('super_admin')` and frontend route gate). User listing with role badges, TOTP status indicators, and creation date. Staff creation modal with secure Argon2id password hashing and role assignment (`admin` or `super_admin`). Edit modal supporting role updates, active/deactive status, and self-lockout prevention (blocks self-deactivation or self-demotion). TOTP reset action clearing credentials to allow re-onboarding. Sanitized API responses never expose password hashes or TOTP secrets.
- **Backend Gaps Addressed**:
  - `DELETE /api/v1/admin/coupons/:id`: Added safe deletion in `order-service.js`, `order-controller.js`, and `order-routes.js` with check preventing deletion of coupons referenced in `coupon_redemptions` or `orders` (returns 409 `COUPON_IN_USE`).
  - Relaxed `GET /api/v1/admin/settings/whatsapp` to `requireRole('admin', 'super_admin')` while preserving `PATCH` for `super_admin`.
  - Added staff management endpoints in `auth-routes.js`: `GET /api/v1/admin/users`, `POST /api/v1/admin/users`, and `PATCH /api/v1/admin/users/:id` guarded by `requireAuth, requireRole('super_admin')`.
- **Frontend API Client (`apps/web/app/lib/api.js`)**:
  - Added `uploadStandaloneMedia(formData)` for banner uploads.
  - Added full coupon methods: `getAdminCoupons`, `getAdminCoupon`, `createAdminCoupon`, `updateAdminCoupon`, `deleteAdminCoupon`.
  - Added banner methods: `getAdminBanners`, `createAdminBanner`, `updateAdminBanner`, `deleteAdminBanner`.
  - Added featured product methods: `getAdminFeaturedProducts`, `addAdminFeaturedProduct`, `updateAdminFeaturedProduct`, `removeAdminFeaturedProduct`.
  - Added settings methods: `getAdminWhatsappSetting`, `updateAdminWhatsappSetting`.
  - Added staff management methods: `getAdminStaffUsers`, `createAdminStaffUser`, `updateAdminStaffUser`, `resetAdminStaffTotp`.
- **Storefront Policy Pages (`apps/web/app/`)**:
  - Implemented 6 pure Server Component policy pages with full SEO metadata, semantic hierarchy, and brand-consistent design tokens:
    - `/about`: Company mission, hardware specialization (GPUs, CPUs, workstations), Egyptian hardware retail pillars, and 4-step fulfillment process.
    - `/contact`: Operating hours (Sat–Thu, 10 AM–10 PM CLT), WhatsApp channel details, Cairo/Giza distribution hub, and inquiry form.
    - `/shipping-policy`: Cairo & Giza coverage, 1–3 business day SLA, parcel inspection upon delivery, COD terms, and 24h expiration rule.
    - `/returns`: 14-day testing warranty for certified used hardware, authorized agency warranty for brand new sealed items, and step-by-step RMA procedure.
    - `/privacy`: Transparent personal data handling, delivery address usage, session cookie security, and zero third-party commercial data sharing.
    - `/terms`: Terms of Service, EGP pricing, 24h expiration, 1-coupon limit, and Egyptian governing law.
  - Added reusable policy styling to `apps/web/app/globals.css` ensuring Server Component compatibility.
  - Updated `apps/web/app/components/Footer.jsx` with direct links to all six policy pages in the customer support column and bottom bar.
- **Automated Tests**:
  - Created `apps/api/test/staff-management.test.js` with 5 integration tests covering authorization, staff creation with Argon2id, duplicate email rejection, self-lockout prevention, and unused vs used coupon deletion.
  - Total automated test count increased from 82 to **87 passing tests**.
- **Quality Gates & Verification**:
  - `pnpm format`: Prettier applied across all new and updated files.
  - `pnpm format:check`: 100% compliant.
  - `pnpm lint`: Clean across both `apps/api` and `apps/web` (0 errors, 0 warnings).
  - `pnpm test` (API): All 87 tests passed across all 18 test suites against PostgreSQL.
  - `pnpm --filter @pixel-store/web build`: Turbopack build compiled all 26 static & dynamic routes with exit code 0.
  - Verified HTTP 200 responses on all new admin routes and storefront policy routes.

## Session: 2026-10-23 (Milestone: Final End-to-End Project Audit & System Verification)

### Current Status
- **Phase:** Final End-to-End Audit & Pre-Deployment Verification (Complete)
- **Completed:** 2026-10-23

### Actions Taken
- Conducted exhaustive end-to-end audit across the 9 core functional and non-functional areas:
  1. **Customer Journey**: Registration, OTP email verification, login, public product catalog (stock quantity safe-browsing with no disclosures), persistent cart isolation, client-side UUID idempotency key on checkout, Egyptian address validation, and dynamic WhatsApp handoff URL generation.
  2. **Order Lifecycle**: Pending COD order creation, immutable order events audit log, admin shipping fee and final total calculation (+24h expiration window and pricing version increment), customer agreement recording, guarded confirmation, status progression (`confirmed` -> `processing` -> `delivered`), customer pending self-cancellation, and automated 24-hour expiration reconciliation.
  3. **Inventory Integrity**: Stock validation with atomic deduction via pessimistic row lock (`SELECT ... FOR UPDATE` on `product_variants`) inside confirmation transaction. Concurrency verified against overselling on the last unit of stock. Order cancellation safely restores inventory atomically. Manual stock adjustments enforce non-negative balances and log staff ID, timestamp, delta, and reason to `inventory_adjustments`.
  4. **Coupons**: Authoritative server-side calculation (percentage with optional cap vs fixed EGP), active date window checks, per-coupon global and customer usage limits, one-coupon-per-order cap, and redemption recording strictly upon admin confirmation (never reserved at checkout). Cancellation reverses redemption (`reversed_at`). Deletion blocked if coupon was ever redeemed.
  5. **Admin Security**: Strict role enforcement (`admin` vs `super_admin`), 60-minute staff idle session timeout (vs 30-day customer timeout), CSRF double-submit cookie & origin check, AES-256-GCM encrypted TOTP credentials, staff management restricted to Super Admins with self-lockout prevention, and zero exposure of password hashes, session tokens, or TOTP secrets in API payloads.
  6. **Catalog Management**: Products, variants, categories with circular-parenting prevention, brands, banners, and featured products curation with duplicate-assignment guards.
  7. **Frontend Functionality**: Responsive layouts, form validation, error states, and Next.js Turbopack compilation across all 26 application routes.
  8. **Store Policies**: Audited customer-facing statements in `/about`, `/contact`, `/shipping-policy`, `/returns`, `/privacy`, and `/terms`. Identified and marked unverified business claims requiring owner confirmation.
  9. **Operations & Deployment Readiness**: Audited environment variables, CORS origins, health endpoints (`/health` & `/health/ready`), database safety guards, CLI expiry job (`pnpm orders:expire`) and HTTP scheduler webhook (`POST /api/v1/jobs/expire-orders`). Formulated deployment phase checklist for zero-cost hosting.
- **Defects Fixed**:
  - Corrected policy wording in `shipping-policy/page.js`, `terms/page.js`, and `about/page.js` where text previously claimed components were "reserved for 24 hours upon placing an order" and "returned to the catalog on expiration". Realigned customer-facing text with the verified technical invariant: stock is strictly neither held nor deducted at pending checkout; physical stock is allocated and deducted upon official admin confirmation following recorded customer agreement.
- **Verification Results**:
  - Full Backend Test Suite: 87/87 tests passed across all 18 test suites (0 failures).
  - Code Style: Prettier check clean (100% compliant).
  - ESLint: 0 errors, 0 warnings across all packages.
  - Production Build: Next.js Turbopack compiled all 26 static & dynamic routes with exit code 0.
- **Environment Limitations**:
  - Automated browser testing via `browser_subagent` could not run in the local environment due to Playwright driver binary installation failure (`404 Not Found` downloading `playwright-1.57.0-win32_x64.zip` from Azureedge).


