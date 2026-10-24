# Pixel Store Architecture

## Chosen shape: modular monolith in a pnpm workspace

This is the documented architecture, not a microservice proposal. A single deployable Express API owns security and transactional business rules; a Next.js application owns rendering and browser interaction. PostgreSQL is the source of truth.

```text
Browser → Next.js storefront/admin UI → /api (HTTPS) → Express modules → PostgreSQL
                                             │              ├─ email provider
                                             │              ├─ WhatsApp click-to-chat URL
                                             │              └─ application-server filesystem (uploads)
                                             └─ scheduled expiry invocation → orders module
```

### Technology choices

| Choice | Purpose and rationale | Alternatives / limit |
|---|---|---|
| pnpm workspace | Required monorepo; one lockfile and clear app boundaries | Do not introduce Nx/Turborepo until build needs justify it. |
| Next.js + React (frontend may use TypeScript) | Required storefront/admin rendering, responsive pages and data-fetching UI | No separate mobile app in MVP. |
| Node.js + Express, CommonJS JavaScript | Required API and durable business boundary; keeps TypeORM JavaScript-compatible | Backend TypeScript is prohibited by the baseline. |
| PostgreSQL + TypeORM EntitySchema | Required relational integrity and transactional locking; EntitySchema avoids decorators | No automatic `synchronize` in production. |
| Zod (or equivalent shared runtime schemas) | Validate untrusted request/query data and create safe DTO boundaries | Schemas must be JavaScript-consumable by the API. |
| Server-managed opaque sessions | Supports revocation, role changes, inactivity rules, HttpOnly cookies and CSRF defence | Avoid browser-stored JWTs; never operate two session stores. |
| Pino-style structured logger | Request correlation and safe errors without secrets | Redact authorization, cookies, passwords, OTPs, TOTP and tokens. |

## Concrete structure

```text
apps/
  web/                         # Next.js storefront and admin UI
    app/ (or pages/)            # route segments, layouts, error/loading states
    components/                 # design-system and feature components
    features/                   # catalog, cart, checkout, account, admin
    lib/api-client.ts           # typed HTTP boundary; no direct DB access
  api/                          # Express CommonJS application
    src/
      app.js, server.js
      config/                   # env validation and dependency composition
      db/                       # data source, EntitySchemas, migrations, seeds
      modules/
        auth/ catalog/ cart/ coupons/ orders/ inventory/ settings/ media/
        admin-users/ banners/ featured/
      middleware/               # session, csrf, RBAC, validation, errors, rate limit
      jobs/expire-pending-orders.js
      shared/                   # errors, money, pagination, logger, ids
    test/                       # unit and integration tests
packages/
  contracts/                    # API DTO/schema definitions and generated-safe constants
  ui/ (optional)                # only after reuse is proven across web areas
docs/planning/
```

Each module owns routes, controller, request schema, service, repository/query helpers, and tests. Controllers translate HTTP only; services enforce ownership, business transitions and transactions; repositories never decide authorization.

## Security and reliability model

- Argon2id preferred (bcrypt fallback only if operationally necessary), unique normalized email, generic login errors, account active/verified checks.
- Opaque random session token in `Secure; HttpOnly; SameSite=Lax` cookie; store a token hash, expiry, revocation, and activity server-side. Rotate session on login/privilege change. Customer idle limit 30 days; staff 60 minutes.
- For cookie-authenticated mutation endpoints: same-origin allow-list, CORS only for known web origin, CSRF token/origin validation, JSON body size limits, Helmet/security headers, and rate limits on login, registration, verification and sensitive admin actions.
- RBAC middleware permits `admin|super_admin` operational access, with explicit `super_admin` checks for staff accounts and store settings. Always scope customer records by `session.userId`.
- Use an idempotency key for order creation, unique per customer and request semantic hash. Return the original completed result for safe replay; reject key reuse with different payload.
- Confirm orders inside one DB transaction: lock the order; assert Pending/not expired/agreed; lock coupon when present; conditional-decrement every variant (`stock_quantity >= requested`); insert redemption; mark Confirmed. Any failure rolls back.
- Cancellation locks the order and applies stock restore/redemption reversal only when their recorded effect timestamps/rows prove it has not already happened.
- Expiry job uses a transaction and `WHERE status='pending' AND expires_at <= now()` conditional transition. Reads/confirmation must also reject elapsed orders so job delay cannot allow confirmation.

## Configuration, observability, and operations

Validate all environment variables at boot: database URL, cookie/TOTP encryption keys, web origin, API origin, email credentials, WhatsApp configuration policy, upload directory/limits, and scheduler secret. Ship `.env.example` with names only; Git ignores real `.env` files. OTP provider credentials remain unset until a later provider decision.

Health endpoints expose liveness and dependency-safe readiness (never credentials). Log JSON with request ID, user ID only where justified, route/status/latency, and error code. Do not log PII beyond a deliberate minimum; never log raw tokens, OTP, passwords, TOTP, cookie values, or payment-like data.

## Deployment plan and verified free-tier constraints

No provider is selected until a pre-launch owner verifies account, regional, commercial-use, domain, and latest terms. Current official information supports the following evaluation:

| Service | Candidate | Verified constraint / planning decision |
|---|---|---|
| Frontend | Netlify Free | Netlify states commercial projects are allowed; its free tier can suspend projects at its discretion. Use only with usage monitoring and a migration runbook. |
| API | Render Free | **Not a production choice.** Render says free services are for preview/hobby use, spin down after 15 minutes, lose local files, and cannot use persistent disks. |
| PostgreSQL | Supabase Free | 500 MB database, 1 GB storage, 5 GB egress, two active projects; projects can pause after a week of low activity and free plan lacks automatic backups. Suitable only with external tested logical backups and an availability acceptance decision. |
| Email OTP | Brevo Free (primary evaluation) / Resend Free | Brevo documents 300 sends/day and transactional email; Resend documents 3,000/month and 100/day. Verify sender/domain approval and deliverability from Egypt before selection. |
| Uploads | Application-server filesystem | Confirmed MVP approach. Future host must provide a persistent disk; ephemeral filesystem deployment is unacceptable. |

**Deployment selection is deferred.** Develop locally first. At deployment, select only a free-tier arrangement that supports the approved Next.js/Express/PostgreSQL split and a persistent application-server upload disk; document its current terms and backup/recovery limits. Do not introduce cloud object storage or a paid service merely to bypass that requirement.

TOTP recovery is a future security flow: only a Super Admin may authorize it after appropriate identity verification; log the authorizer, affected staff account, time, reason and outcome; protect encrypted TOTP secrets and never expose them in logs or responses.

For expiry, invoke a protected internal job endpoint with a scheduled provider after validating its reliability/limits, and add daily reconciliation/alerting. The job must be idempotent; a scheduler is not a substitute for expiration checks in confirmation/read paths.
