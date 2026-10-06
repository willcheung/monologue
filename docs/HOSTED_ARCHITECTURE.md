# Monologue deployment architecture

This document is the source of truth for where Monologue code belongs and how the open-source and hosted versions stay together.

## Application capabilities

Implemented in the application:

- public website at `/` and product feed at `/feed`
- single-user and cloud runtime modes
- workspace-scoped actions and deduplication
- hashed, revocable cloud agent keys
- Better Auth browser sessions and Google sign-in
- first-run onboarding and agent-key management
- short-lived, no-copy agent connection approval
- stable agent identity with optional platform and skill-version metadata
- write-only automatic agent keys with backward-compatible legacy keys
- local SQLite and hosted libSQL/Turso database connections
- public agent setup page at `/agent-setup` and raw skill at `/agent-setup/SKILL.md`
- server-owned self-reported provenance for agent-key ingestion
- stable Action-to-Agent relationships with historical backfill
- private AI Crew list and agent track-record pages
- private weekly agent ledger, active-agent roster, and browser-generated static share cards
- optional OAuth MCP reporting and separately approved, workspace-scoped timeline reading

## Repository policy

`willcheung/monologue` remains the single canonical repository for:

- the public marketing website
- the hosted web product
- the action ingestion API
- local and hosted persistence code
- the portable Monologue skill
- reusable product and technical documentation and tests

Keep distribution strategy, product sizing, roadmaps, channel status, publisher checklists, and release evidence in ignored `private/` files. All plugin packaging, manifests, build scripts, package tests and marketplace guides are private as well. Public source and documentation support the standalone, self-hosted application and portable skill. Public build and test commands must work without private files. The hosted service uses the shared application code; private distribution wrappers reuse the canonical skill without duplicating the application.

Do not create separate marketing, cloud-app, or skill repositories. A separate private operations repository may be created later only if infrastructure-as-code, incident material, or privileged operational tooling develops an independent ownership and release lifecycle. It must not duplicate application code.

## Code placement

| Change | Location |
| --- | --- |
| Public website and landing pages | `app/(marketing)/` |
| Sign-in and authentication screens | `app/(auth)/` |
| Feed, onboarding, and settings pages | `app/(product)/` |
| HTTP route handlers | `app/api/` |
| Reusable visual components | `components/` |
| Authentication and authorization logic | `lib/auth.ts`, `lib/auth-client.ts` |
| Workspace resolution and access checks | `lib/workspace.ts` |
| Agent API-key creation and verification | `lib/api-keys.ts` |
| Action validation and queries | `lib/action-schema.ts`, `lib/actions.ts` |
| Weekly ledger aggregation | `lib/ledger.ts`, `lib/weekly-ledger.ts` |
| Database connection selection | `lib/db.ts` |
| Models and committed migrations | `prisma/` |
| Agent-facing installation package | `skills/monologue/` |
| Private plugin manifests, wrappers, builders and package checks | ignored `private/` |
| Automated behavior checks | `tests/` |
| Human-facing technical decisions | `docs/` |

Route groups organize code without appearing in public URLs. The application routes are:

```text
/                    marketing homepage
/privacy             hosted-service privacy policy
/terms               hosted-service terms of service
/integrations        public agent setup hub
/integrations/[slug] public platform-specific setup guide
/templates           public starter prompts for existing agents
/sitemap.xml         public-page discovery only
/sign-in             create an account or return to Monologue
/welcome             optional agent setup guide
/connect             approve a short-lived agent connection
/feed                authenticated action feed
/agents              authenticated AI Crew
/agents/[agentId]    authenticated private agent profile and track record
/recap               authenticated private seven-day agent ledger
/settings/keys       add agents and manage agent keys
/api/auth/*           browser authentication
/api/actions          agent ingestion and authenticated action reads
/api/connect/*        request, approve, and claim an automatic agent connection
/mcp                 OAuth MCP reporting and private timeline reading
/oauth/*             MCP registration, consent, token exchange and revocation
/.well-known/*       MCP OAuth discovery
```

## Runtime modes

One application supports two explicit modes:

### Single-user mode

- local SQLite database file
- one environment-provided ingestion key
- no hosted account requirement
- optional development seed data

### Cloud mode

- hosted SQLite-compatible libSQL/Turso database
- browser sessions for people
- hashed, workspace-scoped API keys for agents
- no automatic seed data
- every query scoped to the authenticated workspace

The application must fail closed if cloud authentication or workspace resolution is unavailable. Preview deployments must never connect to the production database. Database selection follows the explicit runtime mode; the presence of Turso variables alone must never make a local or preview runtime use the hosted database.

## Authentication boundary

People and agents use different credentials:

- People access the website with a secure browser session.
- Agents call `/api/actions` with a revocable workspace API key.
- OAuth MCP clients call `/mcp` with resource-bound tokens and explicitly approved read/write scopes. OAuth tokens and REST keys are not interchangeable.

A browser session must never double as an agent credential. A global `MONOLOGUE_API_KEY` remains appropriate only for single-user mode.

## Google sign-in

The initial hosted sign-in method is **Continue with Google**, implemented with Better Auth's Google provider. In product language this can be called Google sign-in. It is OAuth/OIDC social authentication, not enterprise SAML SSO.

The authorization flow is:

1. The user selects **Continue with Google** on `/sign-in`.
2. Better Auth starts the provider flow and validates its state.
3. Google returns to `/api/auth/callback/google`.
4. A new user is sent to `/settings/keys`, unless they arrived through an agent approval link; a returning user is sent to `/feed` or their requested page.
5. On first use, Monologue creates one personal workspace owned by that user.

Request only the identity scopes needed to sign in:

```text
openid
email
profile
```

Do not request Gmail, Calendar, Drive, contacts, offline access, or refresh-token consent during sign-in. Future Google product integrations must use separate, explicit connection flows so users can understand the additional access being granted.

Expected environment variables:

```dotenv
BETTER_AUTH_SECRET="a-high-entropy-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Expected Google OAuth redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://staging.example.com/api/auth/callback/google
https://monologue.example.com/api/auth/callback/google
```

Replace the example domains with your own deployment origins. Redirect URIs must match exactly, including scheme, host, path, and trailing-slash behavior. Use separate OAuth clients for local/staging and production when practical so credentials and consent configuration remain isolated.

Do not add enterprise SSO, Google Workspace domain restrictions, or organization switching until the product actually needs them.

## Hosted data ownership

The hosted data model adds `Workspace`, `Agent`, and `ApiKey` records and places `workspaceId` on every `Action`. An Agent is the stable identity behind one or more connections; its display name, platform, skill version, and connecting user are server-owned context rather than trusted action fields.

Security invariants:

- Resolve workspace membership from the authenticated session, never from a client-provided workspace ID alone.
- Resolve agent workspace access from the API key record.
- Derive agent identity from an associated Agent record when present. Legacy keys without one remain payload-compatible.
- Default automatically connected keys to `actions:write`; do not let them read a future shared timeline.
- Preserve existing and manual key scopes so current integrations do not break.
- Store only an API-key hash and a non-secret display prefix; show the raw key once.
- Include `workspaceId` in action deduplication and relevant indexes.
- Scope action lists, searches, filter options, counts, and detail lookups to the workspace.
- Do not seed demo records into customer workspaces.

## Sign-up and installation flow

1. A visitor clicks **Start your agent feed**.
2. They continue with Google.
3. Monologue creates their personal workspace.
4. `/settings/keys` presents the no-key setup prompt before manual API-key options.
5. The agent creates a short-lived connection request and gives the user an approval link.
6. The signed-in user approves the named agent. The browser never receives or displays its API key.
7. Monologue creates a stable Agent identity and a write-only key. The agent claims that key once and stores it in its own secure secret store.
8. The first reported action appears in `/feed`.

Manual key creation remains in `/settings/keys` for connectors that cannot complete the automatic flow. Connection requests store only hashed device and approval codes, expire after ten minutes, and create the long-lived key only when the approved agent claims it.

OAuth-capable MCP clients can instead connect `/mcp` through their secure connection settings. The user signs in and approves the permissions shown; no key is displayed. The setup prompt remains shared across the homepage, Add agent, integrations and starter prompts, loading the same portable reporting instructions regardless of connection method.

API evolution must remain additive. Older skills may omit platform and version data, and the action endpoint must continue accepting the existing V1 payload. Workspace, connected agent, reporting key, and user attribution should be inferred on the server whenever possible so multiplayer changes never require reinstalling an agent skill.

Do not add teams, invitations, billing, or enterprise authentication to this first hosted flow.

### OAuth MCP connections

The optional `/mcp` endpoint exposes `report_action` (`actions:write`) and `read_timeline` (`actions:read`) using the same action schema and persistence. Read approval explicitly covers other agents' reports in that workspace; it never upgrades existing write-only grants. Timeline reads are filtered, paginated and workspace-scoped, with raw metadata and credential identifiers excluded. Each tool checks its permission, and token refresh cannot broaden a grant.

It adds OAuth discovery, dynamic client registration, URL-based Client ID Metadata Documents (CIMD), PKCE code exchange and rotating resource-bound tokens in this app; browser sign-in remains separate from agent tokens. Token/code/client secrets are stored as hashes. Each grant uses an existing `ApiKey` row for workspace/Agent attribution, approved scopes and shared revocation, without exposing a REST key. New `McpOAuthClient`, `McpOAuthCode` and `McpOAuthToken` tables are additive; read access needs no further migration. The endpoint defaults off behind `MONOLOGUE_MCP_ENABLED`; see [MCP plan and rollout checks](MCP_PLAN.md) before enabling it.

### URL-based OAuth client metadata

CIMD clients use their public HTTPS metadata URL as the client ID. The authorization flow fetches and validates that document before presenting consent and again before issuing a code. The document must identify the exact requested client ID, a client name and valid callbacks. Only public-client authentication (`none`) is supported for CIMD; existing DCR confidential-client methods remain available. Client names are self-declared, not verified brands.

Metadata fetching is bounded to five seconds including DNS, 32 KiB and eight concurrent loads per process. It permits HTTPS on port 443, requires a non-root path, rejects credentials, query strings, fragments and dot segments, and never follows redirects. All DNS answers must be public; a validated address is pinned to a fresh TLS socket with normal hostname/certificate verification. Private, loopback, link-local, mapped IPv6, transition, multicast and reserved ranges are rejected. Response bodies must be uncompressed JSON. Additional metadata (including logo and key URLs) is not fetched.

Documents are fetched afresh on each authorization validation rather than cached. Invalid or unavailable metadata fails closed; previously stored callback data is not a fallback for new authorizations. The existing client table stores validated snapshots only after callback/resource validation, with the same hourly new-client bound as DCR. Existing code/token bindings, grant scopes, refresh rotation and revocation remain unchanged. Token exchange, refresh and revocation use stored records without remote metadata retrieval, so outages do not prevent revocation. No schema migration, new permission or second service is required.

## Change and release workflow

- Keep `main` deployable.
- Develop hosted work on focused branches and merge through reviewed pull requests.
- Use a separate database and OAuth configuration for stable staging.
- Run lint, typecheck, tests, and a production build before merging.
- Commit schema migrations with the code that depends on them.
- Deploy production from `main` only after its database migration succeeds.
- Pull the linked Vercel environment and run `npm run db:migrate:turso` before deploying code that depends on a new schema. The runner records checksums in `_monologue_migrations` and refuses edited migrations.
- Tag meaningful open-source releases; the skill ships from the same tag as the compatible API.

Setup-guide content and starter prompts share one static catalog in `lib/distribution-content.ts`; they do not introduce platform-specific credentials, reporting schemas, or extra deployments. Share-card exports omit agent names and app details unless selected in the preview; accompanying text links only to the public setup hub. Search crawl rules supplement, never replace, route authorization.

Plugin packaging and publisher operations stay in ignored `private/`; generated archives stay ignored in `dist/`. Neither is part of the open-source installation or required by public checks.

## When a new repository is justified

A new repository requires all three:

1. an independent owner or access boundary
2. an independent release lifecycle
3. no duplication of Monologue application or domain logic

If all three are not true, the code belongs here.
