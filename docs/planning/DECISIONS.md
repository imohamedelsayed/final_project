# Pixel Store Decisions Register

## Confirmed baseline decisions

| Decision | Source / rationale |
|---|---|
| Modular monolith, pnpm workspace | PRD technical constraint; appropriate for a small team. |
| Next.js/React frontend; Express CommonJS JavaScript backend | PRD technical constraint; backend TypeScript prohibited. |
| PostgreSQL + TypeORM EntitySchema | PRD/database baseline. |
| COD, verified authenticated checkout, manual WhatsApp send | PRD/SRS/workflows. |
| Pending order has no stock reservation; confirmation is atomic | Approved business/integrity rules. |
| Three roles and staff TOTP | PRD/SRS. |
| No reviews, ratings, favorites or comparisons in MVP | User-established scope and PRD. |
| English storefront and EGP | PRD/SRS/design. |
| `Unavailable` is the public non-purchasable state | Confirmed customer-facing label; exact stock and low-stock data remain private. |
| Images reside on the application-server filesystem | Confirmed MVP rule. Persistent disk availability remains a future production requirement. |
| Super Admin authorizes staff TOTP recovery | Recovery requires identity verification, audit logging, and protected secrets; implementation is deferred. |

## Proposed technical decisions

| Proposal | Rationale | Status |
|---|---|---|
| Opaque, hashed database-backed sessions in secure cookies | Enforces logout, inactivity and RBAC changes; keeps tokens out of frontend storage. | Proposed—approve with security design. |
| Customer-scoped order idempotency keys | Required by use cases to prevent duplicate order creation. | **Approved (2026-10-22)** with unique constraint on `(user_id, idempotency_key)`. |
| Order price/agreement version tracking | Prevents confirmation after terms change without renewed agreement. | **Approved (2026-10-22)** with immutable line snapshots and explicit version tracking. |
| Coupon reference/reversal rules | Supports correct revalidation and cancelled-order usage rules. | **Approved (2026-10-22)** with confirmation-only counting and cancellation reversal. |
| Order operational-event record | Provides a focused timeline for key actions and recovery. | **Approved (2026-10-22)** as append-only log without sensitive data. |

## Deferred decisions and production requirements

1. **Persistent server filesystem:** choose a future free-tier host with a persistent disk and prove uploads survive restart/redeploy. No cloud object storage is in scope.
2. **Hosting/database/scheduler:** selection is deferred until deployment. Develop locally first and retain the free-tier-only constraint; verify current terms then.
3. **TOTP recovery procedure:** define Super Admin authorization, identity verification, protected-secret handling, audit fields, and recovery/rotation steps before implementation.
4. Final legal/policy/contact/shipping content.
5. Email OTP provider selection, sender setup and delivery testing are deferred. Email OTP verification remains mandatory; no credentials are invented or stored.

## Approved database refinements (Approved 2026-10-22)

| Refinement | Approved Requirement | Implementation Rule |
|---|---|---|
| Customer-scoped idempotency | Durable customer-scoped idempotency keys with a unique constraint on `(user_id, idempotency_key)`. | Repeated requests using the same key must not create duplicate orders; retries return the original operation's appropriate result. |
| Order pricing and customer agreement | Store immutable order-line price and quantity snapshots, applicable discount/shipping amounts, and the server-calculated order total. Preserve the customer-agreement or pricing version. | If material terms change before confirmation, require an explicit safe resolution rather than silently confirming against terms the customer did not agree to. |
| Coupon redemption and cancellation reversal | Retain explicit coupon references and redemption records. Coupon usage is recorded exactly once upon order confirmation. | Reversed safely according to approved cancellation policy. Pending orders must not count as confirmed redemptions. |
| Append-only order events | Record important order status transitions and administrative actions with timestamps, actor references, and reasons where applicable. | Ordinary application flows must not edit or delete historical events. Do not log passwords, secrets, or unnecessary sensitive data. |

## Non-blocking follow-ups

- Select precise test runner, lint/format configuration and component-library policy after bootstrap.
- Define data retention and account deletion policy before any deletion endpoint.
- Decide document/image size/count limits and supported formats before upload work.

## Evidence and free-tier notes (checked 2026-10-22)

- Render’s own documentation says its free web/database tier is for preview/hobby use, with spin-down, ephemeral files and a 30-day free Postgres expiry; it is rejected for this production plan.
- Netlify states Free can host commercial projects but reserves suspension/removal discretion; it is an option only with usage monitoring and migration readiness.
- Supabase Free currently documents 500 MB DB, 1 GB storage, 5 GB egress and inactivity pausing; it needs independent backup/restore and availability acceptance.
- Brevo Free documents 300 daily sends; Resend Free documents 3,000 monthly/100 daily sends. Sender verification and actual OTP delivery are required tests, not assumptions.

Official sources consulted: [Netlify Free announcement](https://www.netlify.com/blog/introducing-netlify-free-plan/), [Render Free docs](https://render.com/docs/free), [Supabase pricing](https://supabase.com/pricing), [Supabase pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [Brevo pricing help](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [Resend pricing](https://resend.com/pricing).
