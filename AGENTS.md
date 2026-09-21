<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Monologue repository rules

Read [`docs/HOSTED_ARCHITECTURE.md`](docs/HOSTED_ARCHITECTURE.md) before changing routes, authentication, persistence, tenancy, deployment configuration, or repository structure.

- This repository is the source of truth for the public website, hosted product, ingestion API, database schema, and portable Monologue skill. Do not create a second implementation or a cloud-only fork.
- Keep product routes in `app/`, reusable UI in `components/`, domain and server logic in `lib/`, database models and migrations in `prisma/`, the agent integration in `skills/monologue/`, and automated checks in `tests/`.
- Keep browser session authentication separate from agent ingestion keys.
- In hosted mode, every action read and write must be scoped to a workspace. Never accept a workspace ID from an untrusted payload as authorization.
- Google sign-in is authentication only. Request identity scopes only; Gmail, Calendar, Drive, and other Google API access require separate future integrations and explicit consent.
- Never commit secrets, database files, generated build output, raw API keys, OAuth client secrets, or production data.
- SQLite remains the local persistence layer. The planned hosted database is SQLite-compatible libSQL/Turso so both modes can share one schema.
- Prefer one application and one deployment. A new repository requires a concrete ownership or release boundary documented in the architecture guide first.
