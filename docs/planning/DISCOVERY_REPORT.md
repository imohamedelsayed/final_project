# Pixel Store Discovery Report

## Scope and inspection record

The inspected root contains documentation and visual assets only: `final_docs_of_project/`, `.agents/`, and `skills-lock.json`. It has no application source, package manifest/lockfile, environment example, tests, deployment configuration, existing `docs/planning/`, or Git repository. Therefore no existing implementation, dependencies, completed features, or source architecture can be verified or preserved beyond the documents and assets.

Reviewed sources: `PRD.md`, `SRS.md`, `DESIGN.md`, `database-schema.md`, `use-cases-user-stories.md`, `workflow-diagrams.md`, `UI-Direction/DESIGN.md`, `UI-Direction/code.html`, `screen.png`, `Pixel Store Brand Identity Board.png`, and `Gaming PC Hardware Product Showcase.png`. All three supplied images were visually inspected.

## Confirmed requirements

- Egypt-focused, English-language hardware/electronics store; currency is EGP; payment is COD only.
- Modular-monolith pnpm workspace: Next.js/React frontend; Node.js/Express backend in **JavaScript CommonJS**; PostgreSQL and JavaScript-compatible TypeORM/EntitySchema.
- Roles are `customer`, `admin`, and `super_admin`. Backend authorization is mandatory. Only Super Admin manages administrators and the configurable WhatsApp number. Staff require TOTP.
- Catalog supports categories/subcategories, brands, products, images, category-specific specifications, variants, new/used condition and optional truthful usage duration. A visible zero-stock item cannot be purchased; public views never expose quantities/low-stock data.
- Persistent, database-backed customer cart. Server controls price, coupon, availability, subtotal, and totals.
- Verified authenticated customers create idempotent Pending orders with immutable item/address snapshots. WhatsApp is a click-to-chat handoff only; customers manually send. Stock is neither reserved nor deducted at creation.
- Admin records shipping/final-total dispatch and customer agreement. Confirmation revalidates the order and atomically changes status, deducts stock, and records coupon usage. Expiry runs 24 hours after recorded final-total dispatch, never simply from creation.
- Coupons are fixed or percentage, one per order, apply before shipping, and count only after confirmation. A later cancellation must release redemption/usage and restore stock exactly once.
- Storefront design: supplied Pixel Store logo and hero asset; Inter; petrol `#153F3A`, warm off-white `#F6F0EB`, white cards, restrained red `#D94B3D`; responsive TechHub-inspired composition. Admin dashboard is out of the storefront-design scope, but in MVP product scope.

## Requirements audit

| Classification | Finding | Effect / source |
|---|---|---|
| Existing implementation | None verified | No source tree or manifests exist. |
| Missing implementation | Entire monorepo, API, migrations, UI, tests, CI/CD, environment samples, and operational runbooks | Workspace state versus all requirement documents. |
| Confirmed business rule | Order creation saves Pending first; WhatsApp has no delivery guarantee | PRD §5.2, SRS §5, workflows 5–6. Must separate database commit from browser handoff. |
| Confirmed integrity rule | Confirm transaction must protect order status, stock, and coupon redemption together | PRD §5.3–5.5, SRS §4/6/7, database schema §6. |
| Confirmed UX rule | Customer must never see a made-up shipping fee/final total or exact stock | PRD, SRS, primary DESIGN §§5–7. |
| Technical gap | Documented workflow requires idempotency keys, but the schema has no idempotency table | Add a customer-scoped `order_idempotency_keys` table or equivalent unique durable record. |
| Technical gap | Schema describes sessions/challenges/TOTP/inventory adjustments later but omits some of them from its ER diagram | Keep tables; repair diagram before it is used as the sole ERD. |
| Deployment risk | The documented MVP says server-local image storage, while common free app runtimes have ephemeral filesystems | A persistent-storage solution or a formally approved object-storage exception is a release gate. |

## Contradictions and recommendations

1. **Favorites/Wishlist:** the design header and prototype render a Wishlist icon; PRD excludes favorites. Keep it out of navigation/functionality in MVP (or make it a non-interactive visual placeholder only if the product owner explicitly approves).
2. **Prototype claims and data:** `code.html` contains mock products/prices/discounts, “Verified Active Stocks,” “100% Genuine Stock,” and “Rapid Dispatch.” These are not verified business facts. Treat it as a styling reference only; all production copy/data must be approved or database-backed.
3. **Out-of-stock wording:** PRD says customers must not see explicit out-of-stock messages, while later design text calls for a “clear unavailable/out-of-stock state.” Use a clear **Unavailable** disabled state without quantities or low-stock information; approve exact public copy before implementation.
4. **Image storage:** PRD defers external object storage, but persistent server filesystem is a stated launch gate. Do not deploy uploads to an ephemeral free runtime. Decide between a durable no-cost host volume (if terms permit) and a scoped object-storage exception.

## Unresolved decisions and risks

- Which deployment combination meets free-tier, commercial-use, persistence, backup, and operational needs at launch.
- Approved customer-facing unavailable wording, shipment policy copy, contact details, and legal policy review.
- Administrator TOTP enrollment/recovery ceremony and encryption-key rotation procedure.
- Whether the coupon reference on a pending order is immutable (`coupon_id` plus snapshot) and how order edits version customer agreement; this plan recommends both.
- A background expiration executor must run when staff are offline. It needs monitoring and a reconciliation path; HTTP traffic/polling is not proof of a reliable scheduler.

## Requirements traceability highlights

| Area | Primary implementation evidence |
|---|---|
| Auth | hashed passwords/OTP/session tokens, rate-limit tests, role tests, TOTP tests |
| Orders | idempotency test, pending snapshot test, WhatsApp failure persistence test |
| Confirmation | concurrent stock/coupon tests and one transaction boundary |
| Expiry/cancellation | clock-driven transition tests; one-time stock/redemption reversal tests |
| UI | responsive visual review; real-state loading/error/unavailable coverage; no fabricated data |
| Operations | restore drill, upload-persistence test, provider-limit review before launch |
