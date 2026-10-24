# Findings & Decisions

## Requirements
- Pixel Store is an English-language, EGP, Egypt-focused hardware/electronics storefront with a Next.js/React frontend and a Node.js/Express CommonJS JavaScript backend in a pnpm-workspace modular monorepo.
- PostgreSQL plus JavaScript-compatible TypeORM/EntitySchema is the documented persistence stack. Production services must remain on genuinely suitable free tiers.
- Checkout is authenticated and email-verified only; it creates a Pending COD order, snapshots items/address, and opens a user-sent WhatsApp click-to-chat message. It does not reserve/deduct stock or auto-send WhatsApp.
- An Admin sets shipping, records final-total dispatch and customer agreement; confirmation atomically revalidates price/coupon/stock and then deducts inventory and records coupon redemption.
- Pending expiry is 24 hours after `final_total_sent_at`, not order creation. No final-total dispatch means no automatic expiry under the approved rule.
- Roles are Customer, Admin, and Super Admin. Admins run normal operations; only Super Admin manages administrative accounts and the configured WhatsApp number. Admins require TOTP.

## Research Findings
- Actual workspace state: only `final_docs_of_project/`, `.agents/`, and `skills-lock.json` exist. There is no source code, package manifest, `.env` example, existing `docs/planning/`, or Git repository in the inspected root.
- Inspected PRD, SRS, primary UI design specification, and a substantial portion of the database schema. The source material establishes constraints rather than an existing implementation.
- The PRD and SRS agree on the central order, inventory, coupon, role, and free-tier requirements.
- Use cases/workflows resolve key implementation behavior: customer-scoped idempotency is checked and persisted atomically with order creation; cart clears only after that transaction commits; a cancellation of a previously confirmed order must release coupon usage and restore stock exactly once.
- UI assets were visually inspected. They establish a polished, warm hardware-retail storefront: deep petrol green, warm off-white, white cards, limited warm-red discount accents, Inter typography, and the supplied logo/hero composition. The showcase PNG includes transparent space that must be preserved over the prescribed hero treatment.
- `UI-Direction/code.html` is a static Tailwind CDN prototype with mock catalogue copy, remote design-image URLs, a client-only fake cart total, and a Wishlist affordance. It is reference material only—not an implementation baseline—and conflicts with the MVP exclusion of favorites/wishlist and the rule against unverified stock/marketing claims.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Plan a server-managed opaque-session approach, subject to implementation confirmation | The requirements mandate server-side logout/inactivity enforcement and CSRF-safe session handling; the schema already outlines hashed database-backed sessions. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| IDE tabs referenced an existing `.planning/...` plan, but it was absent from the actual workspace at the start of this run | Initialized the isolated plan with the same descriptive ID and used it as the planning-workflow ledger. |
| Documents require production free-tier verification, but no provider has been selected | Treat provider choice, commercial-use terms, persistent image storage, email delivery, and backup/restore evidence as release gates; verify current terms from official sources before proposing a deployment recommendation. |
| Static UI prototype includes a Wishlist icon/control and claims such as "100% Genuine Stock", "Rapid Dispatch", and mock active stock/product data | Preserve only the visual direction. Exclude Wishlist functionality and replace any unverified operational or product claims with real application data or approved content. |
| UI-source inspection command initially failed due to PowerShell/regex quoting | Read the relevant UI design and HTML source through a corrected command; no source was modified. |

## Resources
- `final_docs_of_project/PRD.md`
- `final_docs_of_project/SRS.md`
- `final_docs_of_project/DESIGN.md`
- `final_docs_of_project/database-schema.md`
