# Monologue distribution plan

Updated September 25, 2026. Build and release in small batches. A packaged skill is not the same as a native integration, and a listing is not proof of active users.

## What we want to learn

Can someone discover Monologue where they already use an agent, connect without handling a key, and get a real action into their feed? Prioritize that over listing count.

One canonical skill, one reporting API, one website. No browser extension, new permissions, public activity pages, or analytics service in this first batch.

## Phase 1 — Make installation shareable

Rough effort: a few focused development sessions, plus manual account setup and review time.

| Channel | First deliverable | Release gate |
| --- | --- | --- |
| 1. Skill/plugin directories | Skills CLI install, Claude marketplace package, ClawHub release instructions | Fresh installation discovers the canonical skill; setup approval and a real action work |
| 2. Native agent integrations | Begin with existing Claude packaging and portable agent setup; prepare the platform test checklist | Do not call this native or automatic capture; native platform work is Phase 2 |
| 3. Starter kits | Personal assistant, shopping helper, coding prompts at `/templates` | Preserve approval rules; do not grant apps or invent agents/activity |
| 4. Searchable setup pages | `/integrations` and five platform guides; public sitemap | Unique useful instructions, canonical URLs, responsive copy buttons, honest fallback |
| 5. Share cards | Existing static PNGs plus public setup link in accompanying text; optional names/apps | Defaults hide names and app details; preview matches downloaded/shared image and copied text |

This batch is local until reviewed and deployed. No ClawHub listing, official marketplace approval, or partner integration is implied by adding these files.

### Publication sequence

1. Review local pages and sharing defaults. Run checks and the installer smoke tests.
2. Deploy website changes. Open every setup page and sitemap on the public domain.
3. Publish/update the ClawHub skill from `skills/monologue`. Save the listing URL and version in the publication checklist. Test installation from the registry, not just from local files.
4. Share the Skills CLI command and Claude marketplace URL in our README and setup guides. These are installable repository channels, not separate marketplace approval claims.
5. Run one fresh-account connection and real-action test in each targeted platform. Use a disposable test repo/message/calendar item only with permission. Do not seed fake actions into a consumer feed. A test report must be clearly identified as a test.
6. Submit to curated directories only after the corresponding installation works. Record approval/pending/rejection accurately. Do not submit to unrelated directories or repeatedly repost.

See [site-by-site checklist and copy](DISTRIBUTION_PUBLISHING.md).

## Phase 2 — Publish the portable skill

Supersedes the native-integration proposal below. Publish one canonical skill through Skills CLI, ClawHub, and the existing Claude marketplace wrapper. No hooks, automatic action detection, native adapters, or separate reporting implementations. Verify registry installation and skill discovery, then test the existing approval/reporting flow. Marketplace publication improves discovery, not guaranteed reporting.

## Deferred — Native integration proposal (not authorized for this rollout)

Choose one platform after we know where successful connections and recurring actions come from. First candidates: Muse for consumer fit, or OpenClaw for a platform-controlled post-action integration. Claude packaging remains a lower-effort distribution channel, not an automatic action detector.

Before coding an adapter, verify the platform has a supported installation/auth surface and can identify agent-caused external outcomes. Agree on:

- a visible Connect Monologue entry point;
- existing approval flow or supported OAuth, with per-agent revocation;
- one reporting owner, stable action IDs, outcomes and result links;
- no secret in a prompt, no transcript scraping, no recording reads/drafts/local development;
- separation from independently running deterministic jobs;
- portable skill still works as fallback.

Start with one or two real workflows. Test success, failure, pending outcome, retry/deduplication, expired/revoked credentials, parent/child ownership, and discovery in background runs. Reuse `/api/actions` and its current attribution; no provider-specific action schema. Avoid a universal hook that guesses outcomes from arbitrary tool names.

This requires platform access/documentation and sometimes vendor coordination. It is not a fixed small task until we know that interface. After the first adapter works, document its contract and use it to judge the next platform.

### Phase 2 kickoff — September 25

OpenClaw is the first technical candidate, pending a test instance and user confirmation. Its [typed plugin hooks](https://docs.openclaw.ai/plugins/hooks) provide documented integration points, but a completed agent run is not evidence of an external action. Do not turn every reply or tool call into a report.

Keep the pilot narrow: one explicitly approved outbound-message workflow, with agent origin, actual delivery outcome, and a stable identifier confirmed from the target runtime. Exclude routine chat replies, drafts, reads, and independently running deterministic sends. If the runtime cannot reliably distinguish these, retain skill reporting rather than guessing. Native and skill reporting must agree on one reporting owner before enabling capture.

Next dependency: an OpenClaw test installation/version and a safe test destination, or Muse's supported connector interface if Muse is preferred. Neither an OpenClaw runtime nor a ClawHub publisher CLI was found in the local command-path check. No adapter has been installed or enabled. Phase 1 website deployment and marketplace publication remain outstanding; reviewing the dev pages did not publish them.

## Phase 3 — Expand what converts

- Add more setup pages only for agents with a useful, tested installation path.
- Add starter kits based on actual workflows; do not fork the Monologue skill for every role.
- Submit a skill/plugin bundle to the ChatGPT/Codex directory after fresh-session setup and reporting are reliable. Review is a dependency, not the launch deadline.
- Add a browser extension only if users want the feed beside their existing chats. Test Chrome before Safari; neither is needed for Phases 1–2.

## Weekly operating rhythm

At first, use the registry/store dashboards, hosting request logs where available, and existing connection/action data. They do not provide full cross-channel attribution, so do not pretend they do.

Track in a small private sheet: channel, live URL, published version, fresh-install result, setup issues, first reported action, second real action on another day, and recurring users where measurable. Keep keys, emails, and private actions out of public release notes.

Review weekly. Fix the biggest discovery/approval/reporting failure before adding another listing. Keep channels that bring recurring users; stop maintaining channels that only produce installs without useful actions. Introduce attribution only when these coarse signals are insufficient; do not add fingerprinting or invasive tracking.

## What we are deliberately not building

Delegation UI, chat scraping, dozens of source-app integrations, broad browser permissions, public live feeds, referral rewards, a badge engine, automated community spam, or duplicate hosted implementations.
