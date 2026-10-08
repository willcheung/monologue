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
- read-and-write automatic agent keys with backward-compatible legacy keys
- local SQLite and hosted libSQL/Turso database connections
- public agent setup page at `/agent-setup` and raw skill at `/agent-setup/SKILL.md`
- server-owned self-reported provenance for agent-key ingestion
- stable Action-to-Agent relationships with historical backfill
- private AI Crew list and agent track-record pages
- private weekly agent ledger, active-agent roster, and browser-generated static share cards
- optional OAuth MCP reporting and timeline reading under one workspace-scoped connection approval
- personal and shared workspaces, member invitations, workspace selection, and person attribution
- private daily workspace summaries and contextual prompts for agent-generated briefings

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
/agents              authenticated selected-workspace agent roster
/agents/[agentId]    authenticated private agent profile and track record
/recap               authenticated private weekly recap and daily summary
/settings/keys       add agents and manage agent keys
/workspaces          list, select and create personal/shared workspaces
/settings/workspaces redirect to /workspaces
/settings/workspace  selected workspace: invite and manage members
/join                accept an email-bound workspace invitation
/reports             redirect to Recap’s daily summary
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

Workspace selection is based on explicit membership. Enterprise SSO and Google Workspace domain restrictions remain outside this implementation.

## Hosted data ownership

The hosted data model adds `Workspace`, `Agent`, and `ApiKey` records and places `workspaceId` on every `Action`. An Agent is the stable identity behind one or more connections; its display name, platform, skill version, and connecting user are server-owned context rather than trusted action fields.

Security invariants:

- Resolve workspace membership from the authenticated session, never from a client-provided workspace ID alone.
- Resolve agent workspace access from the API key record.
- Derive agent identity from an associated Agent record when present. Legacy keys without one remain payload-compatible.
- Default new connections to `actions:write actions:read` in one user-approved workspace. Read and write access both follow the connecting user’s current membership; preserve existing limited grants until reconnection.
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
7. Monologue creates a stable Agent identity and a read-and-write key. The agent claims that key once and stores it in its own secure secret store.
8. The first reported action appears in `/feed`.

Manual key creation remains in `/settings/keys` for connectors that cannot complete the automatic flow. Connection requests store only hashed device and approval codes, expire after ten minutes, and create the long-lived key only when the approved agent claims it.

OAuth-capable MCP clients can instead connect `/mcp` through their secure connection settings. The user signs in and approves the permissions shown; no key is displayed. The setup prompt remains shared across the homepage, Add agent, integrations and starter prompts, loading the same portable reporting instructions regardless of connection method.

API evolution must remain additive. Older skills may omit platform and version data, and the action endpoint must continue accepting the existing V1 payload. Workspace, connected agent, reporting key, and user attribution should be inferred on the server whenever possible so multiplayer changes never require reinstalling an agent skill.

Personal remains the default. Shared workspaces extend this flow through explicit invitations; enterprise authentication and live billing are outside the current development implementation.

### OAuth MCP connections

The optional `/mcp` endpoint exposes `report_action` (`actions:write`) and `read_timeline` (`actions:read`) using the same action schema and persistence. The standard connection approval covers reading and reporting, including other agents' reports in that workspace; it never upgrades existing write-only grants. Timeline reads are filtered, paginated and workspace-scoped, with raw metadata and credential identifiers excluded. Each tool checks its permission, and token refresh cannot broaden a grant.

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


## Shared workspaces

Each person has one personal workspace identified by unique personalOwnerId and can own or join multiple shared workspaces. Existing owner workspaces are backfilled without moving actions or credentials. Browser workspace selection is an HTTP-only cookie; resolve ownership or membership on every request. Requests bound to a displayed workspace use a checked workspace header or explicit consent field so changing another tab cannot silently reroute a mutation. Agent credentials remain fixed to their selected workspace regardless of browser selection.

Owners manage invitations, members, and report settings. Members see the shared feed and connect/manage their own assistants. Personal workspaces cannot accept members. Invitations store hashed tokens, expire after seven days, and require the authenticated user's verified email to match the invited address. Pending invitations reserve seats. Seat checks acquire a transactional workspace write lock before counting reservations. All shared workspaces are capped at three people including the owner, regardless of any stored plan label. The server and client UI share one limit; invite creation and acceptance both enforce it. Cancelled or expired invitations and removed members release their places. Billing and higher limits remain deferred. No general tool-permission or execution-approval system is added.

Removing a member revokes their workspace credentials and approved connection claims while preserving action history and original person attribution. REST/MCP credentials and OAuth code/refresh exchange check current membership. Same-named assistants are resolved by workspace and connecting person. Retry deduplication uses stable agent identity when present; legacy name-based uniqueness applies only to actions without an agent ID.

Recap shows the selected workspace's seven-day ledger and last 24 hours on the same page, with original person attribution in shared workspaces and completed/attention counts. Paid controls and delivery settings are absent from the product UI. The existing report-settings persistence and entitlement helpers remain dormant for compatibility; they do not connect providers, start a scheduler or send messages. Report aggregation does not add activity events or change agent reporting behavior.

Recap generates copyable weekly briefing, project catch-up and coordination-check prompts for the displayed workspace and the same seven calendar days, including timezone and daylight-saving boundaries. Every prompt includes this instance's MCP setup, reuses an existing connection when available, and uses the same combined read-and-write setup prompt if missing. The agent handles connection setup through its supported secure flow; the UI has no separate connection checklist and does not preflight a browser account's connection inventory. Disabled MCP instructs the agent to stop and ask for instance setup. Each prompt requests paginated read_timeline results, scoped report links and a distinction between reported facts and inferences. Supporting links carry an explicit workspace ID resolved against current membership. Older `/reports` links forward their workspace to Recap’s daily section, where membership is checked before any report query. Recap also checks explicit workspace links against current membership. Old weekly-briefing feed links redirect to Recap. Prompt copying does not authorize reading or execute work.

## Isolated workspace development

Run `npm run dev:workspace` to migrate and seed `prisma/workspace-dev.db` and start a loopback-only app at `http://localhost:3100/feed`. The launcher provides its own local configuration, suppresses inherited hosted credentials, and never copies customer data. Seed data is synthetic and confined to that database. Sample people and a shared project let contributors test joining, privacy, daily summaries and contextual briefing prompts without external services.

Development impersonation requires NODE_ENV=development, MONOLOGUE_WORKSPACE_DEV=1, a loopback HTTP auth origin, a file database, no hosted database credentials, and no Vercel deployment marker. It returns unavailable in production. Real cloud deployment continues to require browser authentication and hosted environment configuration. The development server binds only to 127.0.0.1 and should not be exposed publicly.

My agents lists only the displayed workspace’s roster, including teammates’ assistants in shared workspaces. Resolve explicit workspace destinations against authenticated membership before loading agents or their counts; personal and other-workspace agents are excluded. Product feed, My agents, Recap and setup navigation retain the displayed workspace ID, independently of another tab’s selected cookie. Switching workspaces from My agents, Recap or Add agent keeps that destination open with the new checked workspace. Direct agent profiles resolve their workspace against current access independently of the active workspace cookie. Opening full activity explicitly selects that workspace before loading its feed. Personal settings redirect to the workspace list.

The far-right Workspaces dropdown uses the existing membership-checked selection endpoint. After selection it opens the feed with an explicit workspace ID, keeping the visible destination stable across tabs. All product pages use one main navigation with a workspace-bound Add agent link and the far-right chooser; there is no secondary workspace title or menu bar. Shared workspace Settings links live beside Open workspace on `/workspaces`. Create workspace links to the single form at the top of `/workspaces`; personal workspaces still have no settings page.

Authenticated Add agent builds its prompt for this configured instance and intended workspace. It reuses the same portable reporting skill but replaces hosted setup defaults for self-hosted/dev instances, requires one explicit connection approval for reading and reporting in the destination, preserves existing credential pairings and requests reading and reporting together in one approval. All setup surfaces use the same prompt factory, varying only by instance and selected workspace. Signed-out visitors choose a workspace during approval. Unauthorized explicit Add agent destinations return 404 after authentication. Profile headers use their membership-checked workspace; full activity links include both workspace and agent IDs so another tab cannot silently reroute them.

## Operator-owned legal documents

The public repository contains reusable `/terms` and `/privacy` renderers, not the hosted operator's policy text. Supply each document through the server-only `MONOLOGUE_TERMS_DOCUMENT` and `MONOLOGUE_PRIVACY_DOCUMENT` environment variables. Hosted policy drafts, operator identity, contact details and review notes stay in ignored private files or deployment configuration. Public builds and self-hosted installations work without those files. Without configured documents, pages explain that the operator has not supplied its policies, and sign-in does not claim agreement to missing terms.

Each variable contains a JSON object with `updated` and `nodes`. A node is text or an object with `tag`, `children` and an optional safe `href` for an anchor. Allowed tags are `p`, `section`, `h2`, `h3`, `a`, `strong`, `em`, `ul` and `li`. For example: `{"updated":"January 1, 2026","nodes":[{"tag":"p","children":["Contact this installation's operator for its policies."]}]}`. Documents are limited to 32 KiB each; deployed environments must also fit the provider's combined environment-variable limit. Rendering escapes text and rejects executable markup and unsafe link protocols. Set values at deployment, without committing the operator's documents or placing them in public client configuration.

Core workspace models, membership checks and agent/feed/MCP authorization remain in the open-source implementation. Future commercial integrations and hosted operations may use a private layer without duplicating these boundaries.

The migration runner applies additive migrations and their checksum receipts in one write transaction. Historical migrations that toggle `PRAGMA foreign_keys` retain their original execution behavior; rehearse those on an isolated database and preserve a backup. Applied migration SQL/checksums must not be rewritten.

Self-service account deletion and stored agreement-version evidence are not implemented. Sign-in shows button-linked legal notice only when both operator documents are configured; this does not create a durable acceptance record. Private legal review and release decisions belong under ignored `private/`.

Automatic connection approvals persist the permissions shown in the consent form. The additive `20261007000000_connection_approved_scopes` migration preserves older reporting-only approvals, including unclaimed requests. Older browser forms omit scopes and therefore approve reporting only; the current form explicitly approves reading and reporting together. Apply this migration before deploying the new connection flow.

Vercel Git deployment is enabled only for `main`. Development branches use the isolated staging project; they must not create previews against the live project’s database configuration.


## Invitation welcome and outgoing email

Creating an invitation sends a transactional email when `RESEND_API_KEY` and `MONOLOGUE_EMAIL_FROM` are configured. `MONOLOGUE_EMAIL_REPLY_TO` is optional. Verify the sender domain with Resend first; preserve existing inbound-forwarding MX records and use only the sending provider’s required DKIM/return-path records. Sending uses the fixed Resend HTTPS API with a bounded timeout and per-invitation idempotency key, after owner, email and free-seat checks. New credentials are server-only. Local sample development never sends real email. No scheduler, newsletter or signup-tracking service is added.

The invitation remains valid if sending cannot be confirmed; the owner receives its copyable link and a truthful status. Provider acceptance confirms sending, not inbox delivery. An unconfigured self-hosted installation keeps the manual-link flow. No raw invitation token is stored in the database; email providers necessarily process the intended recipient, inviter/workspace names and the private join link. Operator privacy disclosures should identify the outgoing provider before enabling it. Resend open/click tracking should remain disabled for these private links.

A valid invitation token permits only the inviter/workspace welcome preview before sign-in, not feed access. Resolve that preview from the hashed-token record, never names supplied in a URL; do not expose the recipient address on the unsigned sign-in page. Invitation pages are dynamic, non-indexed and no-referrer. Preserve the join callback for new and returning Google users. Joining still requires the exact invited verified email and available capacity; wrong-account users get an explicit account-switch button. An already-accepted link opens the workspace only for the matching current member. No agent installation is required to join.
