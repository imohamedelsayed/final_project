# Task Plan: Pixel Store — Discovery, Architecture & Implementation Planning

## Goal
Produce verified, implementation-ready planning artifacts for the documented Pixel Store MVP without implementing application code.

## Next Step
Admin Catalog & Inventory pages implemented and verified. Ready for next administrative milestone (Marketing / Coupons / Banners / Settings).

## Current Phase
Phase 13 — Milestone 8: Admin Catalog & Inventory Implementation (Complete)

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Inspect workspace, Git availability, and planning conventions
- [x] Inspect every project document, UI source, and visual asset
- [x] Reconcile requirements, conflicts, risks, and unknowns
- **Status:** complete

### Phase 2: Architecture & Contracts
- [x] Define architecture, security, operations, and deployment approach
- [x] Design project structure, database review, and API contract
- **Status:** complete

### Phase 3: Implementation Roadmap
- [x] Define dependency-aware milestones, tests, risks, and Definitions of Done
- [x] Record confirmed and unresolved decisions
- **Status:** complete

### Phase 4: Planning Artifact Verification
- [x] Verify all seven requested planning artifacts exist and cross-reference correctly
- [x] Verify no application source, manifests, or original documentation changed
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize findings, decisions, open questions, and first milestone
- [x] Deliver for user review without beginning implementation
- **Status:** complete

### Phase 6: Decision Updates & Repository Foundation
- [x] Record confirmed decisions and pending database proposals without schema changes
- [x] Initialize minimal pnpm/Next.js/Express/TypeORM foundation
- [x] Add configuration, health/error/logging, quality tooling and CI
- [x] Run safe installation, lint, test and build verification
- **Status:** complete

### Phase 7: Milestone 1 — API Foundation
- [x] Record approved database refinements in decision register and planning documents
- [x] Implement enhanced configuration validation (all boot env vars, database URL, secrets placeholders, upload limits)
- [x] Implement TypeORM data-source wiring & migration runner helper (no migrations execution or table creation)
- [x] Standardize error classes, error handler, and request context logging with redaction
- [x] Implement security middleware (Helmet, CORS with origin check, request ID propagation, rate limit skeleton)
- [x] Implement readiness and liveness health checks (never leaking credentials)
- [x] Run formatting, lint, unit/integration tests, and build checks
- **Status:** complete

### Phase 8: Milestone 2 — Database + Authentication
- [x] Implement approved PostgreSQL schema via TypeORM EntitySchema and 4 sequential migrations
- [x] Incorporate all approved schema refinements: idempotency keys, coupon FK on orders, pricing agreement versioning, reversible redemptions, append-only order events
- [x] Implement deterministic seeds (singleton store settings) and secure initial Super Admin creation
- [x] Implement customer registration, password hashing (Argon2id), and OTP verification delivery
- [x] Implement database-backed secure sessions, HttpOnly cookies, logout, and rolling inactivity enforcement (30 days customer / 60 mins staff)
- [x] Implement staff TOTP enrollment, verification with AES-256-GCM encryption at rest, and Super Admin recovery protection
- [x] Implement RBAC middleware and CSRF double-submit protection
- [x] Implement comprehensive integration tests using isolated PostgreSQL test database
- [x] Verify lint, format, 48 automated tests, and build checks
- **Status:** complete

### Phase 9: Milestone 4 — Catalog + Admin Product Management
- [x] Implement replaceable storage adapter abstraction (`LocalStorageAdapter`) with path traversal guards and directory boundary checks
- [x] Implement secure image handling service with magic-byte validation, MIME matching, file size limits, safe UUID naming, and multi-reference safe deletion
- [x] Implement authenticated, role-protected admin media upload endpoint (`POST /api/v1/admin/media/upload`) and safe media serving route (`GET /media/:filename`) with security headers
- [x] Implement Zod validation schemas for all catalog entities (categories, brands, products, variants, specifications, images, banners, featured products, inventory adjustments)
- [x] Implement Categories admin APIs with hierarchy cycle prevention and safe deletion guards
- [x] Implement Brands admin APIs with safe deletion guards (blocked if products exist)
- [x] Implement Products admin APIs with SKU, pricing in EGP, used condition/duration of use, publish/unpublish, and hide/unhide
- [x] Implement Product Variants admin APIs with transactional default-variant switching and safe deactivation on deletion when referenced
- [x] Implement Product Specifications admin APIs enforcing uniqueness per product
- [x] Implement Product Images admin APIs with automatic/manual primary image management and ordering
- [x] Implement Homepage Banners and Featured Products admin APIs
- [x] Implement atomic inventory adjustments with row-level locks (`SELECT ... FOR UPDATE`), negative stock prevention, and audit logs
- [x] Document operational persistent-disk deployment constraint in `docs/OPERATIONS.md`
- [x] Implement comprehensive integration tests (59 total passing tests across auth, catalog, and media storage)
- [x] Verify formatting, linting, tests, and build checks
- **Status:** complete

### Phase 10: Milestone 5 — Storefront + Cart
- [x] Implement public catalog API endpoints (`GET /api/v1/banners`, `/featured-products`, `/categories`, `/brands`, `/products`, `/products/:slug`) with safe public projection and zero stock disclosure
- [x] Implement persistent cart backend module (`apps/api/src/modules/cart/`): `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId`, `DELETE /cart/items` with verified customer auth, ownership enforcement, authoritative server price calculation, and available stock validation
- [x] Add comprehensive integration tests for public catalog and persistent cart (`public-catalog.test.js`, `cart.test.js`), bringing total passing test suite to 66 tests
- [x] Implement Next.js 16 App Router customer storefront using established design system (Petrol green `#153F3A`, Warm off-white `#F6F0EB`, White cards, Discount red `#D94B3D`, Inter typography, and EGP currency):
  - Shared Header with brand logo, navigation, expandable search, auth entry points, and live cart badge
  - Shared Footer with brand assurances, catalog links, and Egypt COD notices
  - Interactive Homepage with hero showcase, category bar, featured products, and 4-step WhatsApp explainer card
  - Shop catalog page (`/products`) with filtering (category, brand, condition, availability, price range), sorting, search, pagination, and empty states
  - Product detail page (`/products/[slug]`) with image gallery, variant selection, technical specifications, and disabled unavailable state
  - Shopping cart page (`/cart`) with authoritative subtotals, quantity adjustments, item removal, non-reservation notice, and empty/unauthenticated states
  - Customer authentication pages (`/login`, `/register`, `/verify-email`) supporting email verification OTP
- [x] Verify format, lint (0 warnings, 0 errors), 66 automated tests, and Next.js/Express production build
- **Status:** complete

### Phase 11: Milestone 6 — Checkout + Orders + Coupons + Admin Order Management
- [x] Implement complete authenticated customer checkout flow with Egyptian shipping address validation and explicit terms acceptance recording (`terms_version` + timestamp)
- [x] Implement customer-scoped `Idempotency-Key` header mechanism preventing duplicate orders on retry and detecting payload mutations
- [x] Create Pending Cash-on-Delivery order and immutable price/quantity/discount/shipping/total snapshots inside a database transaction
- [x] Verify no inventory reservation or deduction occurs on Pending order creation
- [x] Clear persistent cart strictly after database transaction commits
- [x] Implement customer coupon quote/validation (`POST /api/v1/coupons/quote`) with fixed-EGP and percentage rules, limits, validity, and subtotal thresholds without premature reservation
- [x] Implement WhatsApp click-to-chat handoff generation using configured store WhatsApp number from settings/environment without hard-coding
- [x] Implement admin order operations: order queue with filtering, inspection of immutable snapshots, setting shipping fee and final total, incrementing `pricing_version`, and recording customer agreement
- [x] Implement atomic confirmation inside a transactional row lock (`SELECT ... FOR UPDATE`): re-checks stock, deducts stock atomically, records single coupon redemption, appends immutable order event audit
- [x] Implement concurrency protection against overselling and duplicate confirmations on last stock unit
- [x] Implement cancellation with atomic stock restoration and coupon redemption reversal (`is_reversed: true`)
- [x] Implement safe 24-hour pending order expiry CLI command (`orders:expire`) without in-process timers
- [x] Build frontend customer checkout (`/checkout`), order success & WhatsApp handoff (`/orders/[orderNumber]`), order history (`/orders`), and admin order queue & detail modal (`/admin/orders`)
- [x] Verify format, lint, 81 automated tests, and Next.js/Express production build
- **Status:** complete

### Phase 12: Milestone 7 — Integration + QA + Deployment Readiness
- [x] Establish real baseline with full workspace quality checks (`pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build`)
- [x] Audit end-to-end customer and admin flows across all 10 core functional areas
- [x] Fix unscoped cart auth middleware: scoped `router.use('/cart', requireAuth, requireVerifiedEmail)` so non-cart endpoints are never hijacked
- [x] Fix login redirect query parameter preservation: `apps/web/app/login/page.js` parses `redirect` via `useSearchParams()` inside `<Suspense>`
- [x] Fix user response normalization in `api.getMe()` and `api.login()` supporting both camelCase and snake_case properties
- [x] Add production database safety guards in test database helper (`apps/api/test/helpers/db-helper.js`) refusing to run in production or truncate non-test databases
- [x] Implement secure HTTP expiration webhook `POST /api/v1/jobs/expire-orders` guarded by `SCHEDULER_SECRET` for free-tier web cron schedulers
- [x] Implement comprehensive full-lifecycle E2E integration test (`apps/api/test/e2e-workflow.test.js`) testing entire flow from customer registration to admin order cancellation and stock restoration
- [x] Verify total automated test suite increased to 82 tests passing cleanly against PostgreSQL
- [x] Document free-tier hosting strategy, scheduler options, email delivery, deployment checklist, and persistent media storage blocker in `docs/OPERATIONS.md`
- [x] Update `.env.example` with Next.js frontend variables (`NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`) and `README.md`
- [x] Verify final clean pass of format (0 warnings), lint (0 errors), 82 automated tests, and production build
- **Status:** complete

### Phase 13: Milestone 8 — Admin Catalog & Inventory Implementation
- [x] Implement `/admin/categories` with hierarchy selection, cycle avoidance, search/status filters, and safe deletion
- [x] Implement `/admin/brands` with auto-slug generation, active/inactive toggle, search/status filters, and safe deletion (no fake logo upload per schema truth)
- [x] Implement `/admin/products` with search, category/brand/condition/status filters, sorting, pagination, and out-of-stock badges
- [x] Implement product creation flow with default variant, multiple specifications, and duration of use for used hardware
- [x] Implement product management drawer with core details editing, variant management, specifications, and photo gallery with multipart image upload
- [x] Implement `/admin/inventory` with real-time stock levels, out-of-stock and low-stock health badges, and alert threshold management
- [x] Implement auditable stock adjustment modal with quantity delta (+ / -), mandatory reason, negative balance prevention, and audit history log tab
- [x] Add backend `GET /api/v1/admin/inventory/items` endpoint and integration tests in `admin-catalog.test.js`
- [x] Connect all frontend operations to real backend APIs with session cookie auth and CSRF protection
- [x] Verify format, lint (exit code 0), 82 automated tests passing, and Next.js production build
- **Status:** complete



## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Create an isolated planning-workflow plan in `.planning/` | No existing planning directory was present in the actual workspace; the user requested a multi-document planning deliverable. |
| Treat source documents as the requirements baseline | The repository has no application code or dependency manifests to supersede the PRD/SRS and related documentation. |
| Do not choose Render Free for production | Its official documentation says the tier is not for production and has spin-down, ephemeral files, and database expiry limitations. |
| Treat durable image storage and scheduler choice as launch blockers | The documented server-file requirement conflicts with common free ephemeral runtimes; expiry must function while admins are offline. |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| `resolve-plan-dir.ps1` was blocked by the local PowerShell execution policy | Used a later bypassed invocation only for the planning initializer; discovered no prior `.planning/` directory existed. |
| `git diff --stat` reported that `F:\E-Commerce` is not a Git repository | Record this as a discovery limitation; do not fabricate Git status. |
