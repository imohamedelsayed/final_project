# Pixel Store Planning Set

These documents translate the approved requirements baseline into an implementation-ready plan. They do **not** implement the application.

| Read when you need to… | Document |
|---|---|
| Understand the verified repository state, requirements, conflicts, and risks | [DISCOVERY_REPORT.md](DISCOVERY_REPORT.md) |
| Build the monorepo, modules, security controls, and deployment topology | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Implement a route or client integration | [API_CONTRACT.md](API_CONTRACT.md) |
| Write migrations, entities, transactional services, and seeds | [DATABASE_REVIEW.md](DATABASE_REVIEW.md) |
| Sequence work, tests, and acceptance reviews | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) |
| Resolve or approve a policy/technical decision | [DECISIONS.md](DECISIONS.md) |

## Authority order

1. The approved PRD and SRS define business scope and rules.
2. The workflow diagrams resolve operational behavior where consistent with the SRS.
3. `database-schema.md` is the database-design baseline, subject to the review in this set.
4. The design documents and assets define the storefront visual direction; backend rules override mockup behavior.
5. These planning files propose implementation choices and clearly label open decisions.

Before implementation, resolve the blocking decisions in `DECISIONS.md`, choose providers only after rechecking their current terms, and create a Git repository/branching convention because the inspected workspace has none.
