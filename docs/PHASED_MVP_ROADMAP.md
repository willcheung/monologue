# Consumer MVP roadmap

The product remains one Next.js application backed by Prisma and SQLite-compatible libSQL/Turso. Do not add a queue, cache, warehouse, object store, charting framework, or second repository without a demonstrated need.

## Phase 1 — Trustworthy AI Crew

**Goal:** Give every agent a stable private identity and a clear track record.

Build:

- server-owned action provenance
- server-derived agent identity
- migration and backfill from historical actions
- automatic Agent creation for legacy and local ingestion
- `/agents` crew page
- `/agents/[agentId]` private profile
- total actions, first seen, last active, and seven-day actions
- **Has worked with**, derived from historical systems
- **Common actions**, derived from historical verbs
- category breakdown and recent activity
- generated initials instead of uploaded avatars

Do not build:

- custom profile editing
- public profiles or slugs
- declared access or capabilities
- milestones, badges, or streaks
- weekly recap or sharing

## Phase 2 — Weekly Agent Ledger and static sharing

**Goal:** Give users lightweight proof of value and test sharing intent without creating an analytics dashboard or publishing private data.

Add a private `/recap` page:

- things changed in the last seven days
- active agents
- most active agent
- most-used system
- one seven-day activity bar chart
- compact category breakdown
- failed attempts shown separately
- static recap share-card preview
- static agent-profile share-card preview
- native share sheet, PNG download, and copy-text fallback

Use live aggregation. Share cards must be generated in the browser from a minimal, allowlisted summary. They must not upload data, create a public URL, contain individual actions or metadata, or update after being shared.

Do not cache, schedule, add a charting dependency, or generate commentary with an LLM.

## Phase 3 — Evaluate share intent

**Goal:** Decide whether static sharing creates enough demand to justify public infrastructure.

Measure recap and profile share attempts. Do not create public URLs or expose action details.

## Phase 4 — Revocable public recaps

**Goal:** Build a privacy-safe growth loop only after Phase 3 shows demand.

Add saved public snapshots, random public identifiers, revocation, social preview images, and a signup CTA. Never publish raw metadata or private URLs.

## Later experiments

- individual action sharing
- public agent profiles
- public crew gallery
- Agent League, only after provenance and abuse controls are credible

## Success gates

Measure:

- sign-up to first connected agent
- first connected agent to first action
- workspaces with a second agent
- seven-day return rate
- recap share attempts
- shared-page views to signup, once public recaps exist
