# Pixel Store

## Local Development & Operations

Prerequisites: Node.js 22+, pnpm 10+, and PostgreSQL 14+.

### 1. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure `DATABASE_URL` with your local PostgreSQL credentials (e.g. `postgresql://postgres:postgres@localhost:5432/pixel_store`).
3. For local development, `EMAIL_PROVIDER=in_memory` is used by default; verification codes are simulated in memory and logged securely without requiring third-party credentials.
4. For real email delivery, set `EMAIL_PROVIDER=brevo` or `EMAIL_PROVIDER=resend` and configure `EMAIL_API_KEY` and `EMAIL_FROM`.
5. In production mode, `DATABASE_URL`, `SESSION_SECRET` (>= 32 chars), and `TOTP_ENCRYPTION_KEY` (>= 16 chars) are strictly validated at startup.

### 2. Database Migrations and Seeding

Run migrations and deterministic seed scripts:

```bash
# Run sequential TypeORM migrations (synchronize is disabled)
pnpm --filter @pixel-store/api db:migrate

# Seed singleton store settings (WhatsApp number)
pnpm --filter @pixel-store/api db:seed

# Create initial Super Admin securely (using INITIAL_SUPER_ADMIN_* env vars or CLI flags)
pnpm --filter @pixel-store/api db:create-super-admin
# Or specify parameters directly:
# node apps/api/src/db/scripts/create-super-admin.js --email=admin@pixelstore.com --password=SecurePassword123! --name="Super Admin"
```

### 3. Order Expiry Reconciliation Job (24h Window)

To expire pending orders exceeding their 24-hour window from final-total dispatch:

```bash
# Standalone CLI execution
pnpm --filter @pixel-store/api orders:expire

# Or via secure HTTP webhook (free-tier web cron schedulers)
curl -X POST http://localhost:4000/api/v1/jobs/expire-orders \
  -H "Authorization: Bearer <SCHEDULER_SECRET>"
```

### 4. Running Services

- Run the API: `pnpm dev:api` (default: `http://localhost:4000`)
  - Liveness: `GET /health`
  - Readiness: `GET /health/ready`
- Run the web storefront: `pnpm dev:web` (default: `http://localhost:3000`)

### 5. Quality Commands

- Test suite: `pnpm test` (executes schema safety, authentication flows, TOTP lifecycle, CSRF, session security, catalog, cart, checkout, admin order management, and full E2E lifecycle tests against an isolated PostgreSQL database)
- Linter: `pnpm lint`
- Formatter: `pnpm format:check` / `pnpm format`
- Build check: `pnpm build`

### Status & Milestones

- **Milestone 1 (API Foundation)**: Complete (Express composition, error envelope, security headers, rate limit skeleton, health checks, logger redaction).
- **Milestone 2 (Database + Authentication)**: Complete (TypeORM EntitySchemas, 4 sequential migrations, constraints/indexes, customer registration/verification/login/logout, secure sessions, staff TOTP enrollment/recovery, RBAC, CSRF, seeds, and initial Super Admin creation).
- **Milestone 3 (Catalog + Admin Product Management)**: Complete (Categories, brands, products, variants, specifications, images, banners, featured products, atomic inventory adjustments with audit logs, and replaceable storage adapter).
- **Milestone 4 (Storefront + Cart)**: Complete (Next.js 16 customer storefront, shared header/footer, homepage hero/featured, catalog search/filtering, product details, and persistent customer cart).
- **Milestone 5 (Checkout + Orders + Coupons + Admin Order Management)**: Complete (Validated checkout, idempotency key replay/conflict, immutable snapshots, coupon quotes/redemptions, WhatsApp handoff, admin queue, final total dispatch, customer agreement, atomic confirmation, status progression, cancellation reversal, and 24h expiry reconciliation).
- **Milestone 6 (Integration + QA + Deployment Readiness)**: Complete (Full customer-to-admin E2E verification, production DB guards, scoped cart middleware, normalized auth responses, deployment checklist, and operations guide in `docs/OPERATIONS.md`).
