# Distribution publication checklist

Commands and documentation checked September 25, 2026. Run from the Monologue repo unless stated otherwise. This is a release checklist, not proof that a listing exists.

## Reusable listing copy

**Name:** Monologue

**Tagline:** See what your AI agents did, all in one place.

**Description:** Your agents send emails, change meetings, make purchases, and push code. Monologue gives them one private place to report those actions, with links to results when available. Keep using your agents where you already do, and revisit their work without digging through chats. Start with one setup prompt. Agent reports are self-reported and can be incomplete; Monologue does not authorize or independently verify their actions.

**Website:** https://www.monologue.events/integrations

**Docs:** https://www.monologue.events/developers

**Skill source:** https://github.com/willcheung/monologue/tree/main/skills/monologue

**Contact:** support@monologue.events

Use current files from `public/brand` if present, or the app's current logo pack. Never use a customer feed screenshot without permission. Clearly label seeded demo activity.

## 1. Skills CLI / skills.sh

Our public repo is the source. Install command:

```bash
npx skills add willcheung/monologue --skill monologue
```

For a discovery check without installation:

```bash
npx skills add willcheung/monologue --list
```

**You:** After release, share the command alongside the relevant setup guide. Real users' CLI installs contribute to the directory's aggregated install-based ranking; there is no need to manufacture installs. Test installs should disable telemetry.

**Us:** Verify discovery and installer outputs in disposable project directories. Test files from the current public commit too, not only an unpublished local tree. Confirm `SKILL.md` and the helper arrive intact.

**Status:** Repo package exists. Install verification is distinct from directory visibility or ranking; verify the directory independently before claiming it is listed.

Sources: [CLI](https://github.com/vercel-labs/skills), [directory behavior](https://skills.sh/docs).

## 2. ClawHub / OpenClaw

**You:** Sign into the publisher account you want to own the listing. Do not paste its token into chat. Confirm the slug is available or that you own the existing listing. If needed, set up the CLI following the current [ClawHub quickstart](https://docs.openclaw.ai/clawhub/quickstart).

```bash
clawhub login
clawhub whoami
clawhub skill publish ./skills/monologue \
  --slug monologue \
  --name "Monologue" \
  --version 1.2.8 \
  --categories integrations,productivity,agents \
  --topics "agent-feed,action-history,receipts"
```

Check `clawhub --help` and `clawhub skill publish --help` first; older CLIs may use a different command surface. Use the skill's current version, not a stale copied version. Add `--owner <handle>` only if publishing for an organization you control. Never overwrite another owner's slug.

**Us:** After publication/review, save the exact returned URL, inspect the registry release, install into a disposable OpenClaw project, and test discoverability plus approved connection/reporting. Only then link the live listing from the public setup page. Review delays are possible; label a submitted release as pending rather than published.

**Status:** Publication and account ownership are not yet verified. No authenticated ClawHub CLI was available in the local audit.

Source: [publishing rules](https://docs.openclaw.ai/clawhub/publishing).

## 3. Claude Code marketplace

The existing `.claude-plugin/marketplace.json` points directly to the canonical skill. Users can run:

```bash
claude plugin marketplace add willcheung/monologue
claude plugin install monologue@monologue
```

Then paste the setup prompt and approve the connection. Installation alone does not configure credentials.

**Us:** Run `claude plugin validate .`, test installation in an isolated configuration, and confirm one skill loads. Keep the public repo as the marketplace; no separate marketplace repo or duplicate skill.

**You:** Share `/integrations/claude-code` once deployed. This is our marketplace package, not an official Anthropic-directory endorsement. Any curated submission needs its own review and live listing URL.

Source: [marketplace validation and installation](https://code.claude.com/docs/en/plugin-marketplaces).

## 4. Native platform entries

**You:** Pick the first platform publisher/partner account (Muse or OpenClaw suggested). Provide access through its supported account flow, not secrets in chat. Obtain its current native connector requirements.

**Us:** Build one supported adapter against that interface, run the Phase 2 test matrix, and prepare a short demo, screenshots, privacy/support URLs, and listing copy. Avoid claiming zero missed actions. Do not invent a native plugin manifest for a platform without a documented format.

**Status:** Portable setup guides are implemented; native adapters and partner listings are not.

For a future ChatGPT/Codex submission, use [OpenAI's submission guide](https://developers.openai.com/plugins/deploy/submission) and [skill packaging](https://developers.openai.com/plugins/build/skills). A skill-only submission may be enough; do not build MCP/OAuth solely to obtain a listing. Submit only after the supported setup flow is tested on the target surfaces. This channel is not required for launch.

## 5. Starter prompts, search, and sharing

**Us:** Deploy `/templates`, `/integrations`, five guides, `/sitemap.xml`, and `/robots.txt`. Keep private routes out of the sitemap; robots rules are not an authorization boundary.

**You:** Submit the sitemap in the search-console account for the verified domain. Link a relevant setup page rather than sending everyone to a generic homepage. Directory/forum posting should follow the site's rules; the user handles builder outreach.

Share-card copy links to the public setup hub, never the owner's private profile or live feed. Names/apps are opt-in. PNGs are permanent copies in the recipient's hands; they cannot update or be revoked.

Suggested short announcement, after this batch is live:

> Keep using your AI agents where you already do. Monologue gives them one private place to report emails sent, meetings changed, purchases made, and code pushed. Find your agent's setup guide: https://www.monologue.events/integrations

Use a real, permitted example or an explicitly labeled demo. No fake savings, results, install counts, or testimonials.

## Record actual publication receipts

| Channel | Live listing URL | Version | Install + real-action test | Status |
| --- | --- | --- | --- | --- |
| skills.sh | Directory visibility to verify | Canonical repo version | Public-repo discovery passes; local installs pass for Codex, Claude Code, OpenClaw, Hermes; real-action tests pending | Ranking/listing not claimed |
| Claude repo marketplace | https://github.com/willcheung/monologue | Canonical repo version | Validation passes; fresh-session test pending | Repo package exists |
| ClawHub | Not published/verified here | — | Pending | Needs publisher login |
| Native platform entry | — | — | Pending | Phase 2 |
| ChatGPT/Codex directory | — | — | Pending | Later submission |

Update the table only from actual receipts and tests. Publishing a release, submitting a listing, or changing a remote repo is a reportable Monologue external action; read-only validation and local builds are not.

Local batch verification: lint, 27 tests, type checking, and production build pass. Setup hub, starter prompts, and Claude guide checked at 375px with no horizontal overflow. Installer tests used disposable directories with telemetry disabled. This batch has not been committed, deployed, or submitted to marketplaces.
