# Pixel Store Implementation Plan

Implementation begins only after the decisions marked blocking in `DECISIONS.md` are approved. Each milestone is independently reviewable and must meet its tests/acceptance criteria before the dependent work starts.

| # | Objective and tasks | Depends on | Tests / acceptance criteria | Main risk |
|---|---|---|---|---|
| 0 | **Repository foundation.** Initialize pnpm workspace, `apps/web`, `apps/api`, lint/format/test scripts, `.gitignore`, `.env.example`, CI, branch/PR convention. | Decisions on package versions | **In progress:** scaffold only; clean install, lint, test, build and config validation must pass. | No current repository/Git baseline. |
| 1 | **API foundation.** Express composition, config validation, TypeORM datasource, migrations runner, standard errors/logger, health endpoints, request IDs, security headers/CORS/rate-limit skeleton. | 0 | Invalid config stops boot; error shape consistent; health leaks no secrets. | Over-permissive CORS/logging. |
| 2 | **Database and seeds.** Implement reviewed entities/migrations, indexes, initial settings, controlled Super Admin seed. | 1, blocking schema decisions | Empty DB migration/rollback or recovery test; constraints/index tests; no `synchronize`. | Missing idempotency/agreement fields. |
| 3 | **Identity and access.** Registration, hashed verification challenge/email adapter, login, opaque sessions, CSRF, roles, TOTP enrollment/verify, staff lifecycle. | 1–2, email choice | Hash/token redaction, timeout/revocation, rate-limit, IDOR/RBAC, TOTP tests. | Unsafe recovery/key management. |
| 4 | **Catalog and media administration.** Categories/brands/products/variants/specs/images/banners/featured; publication and inventory adjustment. | 2–3, media decision | SKU/default/primary constraints, upload type/size checks, public exclusion of hidden data, atomic adjustment. | Ephemeral uploads. |
| 5 | **Storefront catalog.** Design tokens/assets, responsive header/footer/home/list/detail, public API client, loading/error/unavailable states. | 3–4 | Desktop/tablet/mobile visual review; filters/sort/pagination; no fake stock/reviews/discounts/Wishlist feature. | Prototype copied as product logic. |
| 6 | **Cart and coupon quotes.** Persistent cart APIs/UI, ownership, current-price totals, coupon quote. | 3–5 | Cross-device persistence; invalid/unpublished items; fixed/%/minimum/date logic; cart is not reservation. | Client calculation treated as authoritative. |
| 7 | **Checkout and WhatsApp handoff.** Shipping form, terms, idempotent Pending order/snapshots, post-commit cart clear and manual WhatsApp result page/order history. | 2–3, 6 | Same-key retry creates one order; failure preserves cart; WhatsApp failure preserves reference; verified customer gate. | Duplicate orders/false delivery claim. |
| 8 | **Admin order operations.** Operational queue, final total dispatch/agreement, guarded confirmation, lifecycle/cancellation, scheduled expiry/reconciliation. | 2–3, 7, scheduler decision | Concurrent confirmation, coupon limit, stock restoration, expiry timestamp and terminal-transition tests. | Partial transaction/race condition. |
| 9 | **Admin dashboard and static content.** Admin UI for catalog/orders/settings/staff (Super Admin only), policy-page content integration. | 4, 8 | Role-gated routes/actions; meaningful pending follow-up/low-stock states; no public exposure. | Privilege escalation. |
| 10 | **Release readiness.** Integration/E2E/security/accessibility tests, backup restore drill, upload persistence test, provider limits review, monitoring/runbooks, legal policy review. | all | Release-gate evidence recorded; recovery and rollback practiced; no unresolved blocker. | Free-tier changes/operational fragility. |

## Parallel work

- After Milestone 2: frontend design-system shell and API auth test harness may proceed in parallel.
- After Milestone 4: storefront catalog UI and admin catalog UI can proceed in parallel against versioned contracts.
- Milestones 7 and 8 are serial at the transactional boundary: checkout snapshots/idempotency must land before confirmation/cancellation/expiry.
- Deployment research can proceed throughout but does not unblock production until its evidence is approved.

## Test strategy

Use the selected stack’s unit runner for pure money/status/coupon rules; Supertest-style API integration tests with isolated PostgreSQL; a real browser E2E tool for registration→cart→checkout→WhatsApp-result and staff confirmation; and two-connection concurrency tests for guarded stock/coupon updates. Add accessibility checks and responsive visual acceptance to the web suite. Mock email/storage only at unit level; integration tests exercise adapter contracts against a safe test environment.

Definition of Done for every milestone: reviewed code/contracts/migrations, tests added and passing, validation/error/security paths covered, docs/env changes made, and no new unapproved dependency or paid service introduced.
