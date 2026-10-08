# Monologue look and feel

Use this guide for every user-facing addition. Monologue is a warm, consumer-friendly record of what AI agents changed. It should feel like a personal ledger with a little personality—not an admin dashboard or developer console.

## Design principles

1. **The feed is the hero.** New UI should help people answer “What did my agents do?” quickly.
2. **Warm, not childish.** Use the handwritten display voice for personality and the sans-serif voice for facts, controls, and longer copy.
3. **Calm density.** Prefer rails, dividers, and grouped sections over a wall of floating cards.
4. **Consequences over process.** Show external actions, outcomes, evidence, and useful before → after changes. Never introduce tracing language.
5. **Exceptional status only.** Completed is the default and does not need a badge. Make failed and pending visible but quiet.

## Foundations

- Paper: `--paper` (`#fbfaf6`)
- Ink: `--ink` (`#20201d`)
- Muted text: `--muted` (`#75736c`)
- Dividers: `--line` (`#e8e5dd`)
- Accent: `--accent` coral (`#ff6b45`)
- Positive accent: `--sage` (`#617a67`)
- Body and data: `--font-sans`
- Headlines, brand moments, primary verbs, and playful labels: `--font-display` (Gaegu)

Do not add a new font or one-off brand color for a single feature. Use generous whitespace, thin warm-gray rules, soft shadows, and rounded corners. Avoid glassy enterprise panels, neon gradients, and dense metric grids.

## The timeline pattern

The current feed is the canonical action presentation. A timeline includes:

- a calendar-style date block on the left;
- time in a narrow column;
- the category emoji centered on the vertical rail;
- agent name and category above the summary;
- a readable sans-serif summary with only the leading action verb in the display font;
- system, context, value, or other supporting facts beneath it;
- an inline before → after row when structured change data exists;
- a bordered surface only for a meaningful change comparison, failure, or pending result.

Use the same category emoji and color mapping everywhere by going through `categoryPresentation` and `ActionIcon`. Do not let an agent choose visual formatting through its summary.

## Type hierarchy

- Display headlines: large Gaegu, tight line-height, sentence case.
- Primary action verb: bold Gaegu inside a sans-serif sentence.
- Body copy: sans serif, comfortable line-height.
- Metadata: sans serif, muted, never so small that it becomes decorative texture.
- Setup-prompt button labels: 20px display font across the site.
- Uppercase labels: short only, with modest tracking.

Handwriting is an accent, not the whole interface. Names, timestamps, values, URLs, filters, and detail content stay easy to scan.

## Components and behavior

- Reuse existing buttons, pills, avatars, action icons, timeline rows, dialogs, and empty states before making a variant.
- Primary buttons use ink; coral is an accent, not a large background color.
- Prefer one clear primary action per section.
- Show starter template prompts directly, with a copy action; do not hide them behind a disclosure. Agent setup has one default action: **Copy setup prompt**. An empty action feed shows only **Connect an agent** and that button, copying the setup prompt for the displayed workspace and this instance. Keep technical connection instructions in the agent-facing guide and developer docs; show manual API-key setup as a collapsed fallback. Never promise that a prompt can silently add an MCP connection in every client.
- Drawers are for complete action details. The timeline itself should already explain the action.
- Share artifacts are static snapshots. They must not reveal future activity or create ongoing access.
- Links to proof or receipts should be visible when present, but raw metadata stays in details.

## Responsive and accessible

- Design desktop and mobile together. On mobile, stack the date above the rail and preserve time, icon, summary, and metadata.
- Keep tap targets at least 44px when practical.
- Do not communicate failed or pending state with color alone.
- Respect reduced-motion preferences.
- Use semantic headings, times, links, buttons, and useful accessible labels.

## Copy voice

Use plain consumer words: **feed, action, agent, changed, sent, bought, booked, pushed, deployed, failed**.

Avoid: **observability, telemetry, trace, span, instrumentation, execution graph**.

Prefer short concrete sentences. A little wit is welcome in secondary copy, but never invent claims about an agent or obscure what happened.

## Before shipping UI

- Compare it with the homepage, feed, agent pages, and weekly recap.
- Check desktop and a narrow mobile viewport.
- Confirm completed actions are not over-labeled.
- Confirm empty, failed, pending, long-text, and missing-metadata states still work.
- Run typecheck, lint, tests, and the production build.


## Workspaces and recap briefings

Keep the Workspaces dropdown at the far right of product navigation. Show the selected workspace, Private/Shared labels and a checkmark, with links to create a workspace at the top of the workspace list and view all workspaces. Keep Add agent in the top navigation before Workspaces, bound to the displayed workspace. Keep sign out at the bottom of the dropdown for signed-in accounts. Do not show a secondary workspace title or navigation bar. Development sample-account controls live inside the dropdown. Workspaces is a top-level destination that lists all of a person’s workspaces with Private/Shared labels, without a selected workspace bar. My agents lists only the displayed workspace’s agents. Personal shows its agents; shared workspaces include teammates’ agents with person attribution. Switching workspaces from My agents stays on that page and updates the list. Personal has no settings page. Workspace creation appears only at the top of that list. Show Settings beside Open workspace in the workspace list for shared workspaces only. Use compact page headings for workspace settings. Shared feeds show the original reporting person's name beside the assistant; same-named assistants should stay distinguishable in feed rows and profiles. Team settings use plain member rows and owner/member labels, with a three-person cap including the owner. Pending invitations reserve a place. At capacity, disable creating invitations and explain that cancelling an invitation or removing a member frees a place. Keep billing and upgrade controls out of this release.

Recap combines the seven-day ledger with a last-24-hours report on one page. Daily summaries reuse current action summaries and outcomes; include original person attribution for shared workspaces. Older daily-report URLs redirect to the corresponding section in Recap. Share exports remain explicitly weekly snapshots. Keep paid-plan controls and email/Slack delivery settings out of the current product UI.

Recap offers a compact **Get my weekly briefing** action. Opening it shows weekly briefing, project catch-up and coordination check prompts for the same workspace and seven calendar days as the recap. Keep the request visible and include connection setup inside every copied prompt. Use one short note: setup is included and one connection enables reading and reporting. Do not show a separate connection section or a technical setup checklist. The approved connection covers the workspace, while the prompt asks for a narrower review period. Never imply that copying runs a briefing, grants access or creates a schedule. Keep the action feed focused on reported changes.

Add agent stays a setup page even when connections already exist: show the destination workspace, one Copy setup prompt button, collapsed manual-key fallback and a separate Agent connections section. Use plain connection copy in the primary flow. My agents and its empty state link directly to setup for the selected workspace. Profile navigation uses the profile’s workspace.

Add agent is a secondary outlined button in product navigation, My agents and its empty state. Reuse the existing secondary button style and keep it sized to its label on mobile. Connecting is not the primary action in a configured workspace; Copy setup prompt remains the primary setup action.

Sign-in displays a compact, readable legal notice immediately below Continue with Google. Use 12px text, underline Terms and Privacy links and explicitly tie the button click to agreement. Keep the identity-scope note separate. Legal pages must describe implemented behavior and remain readable, rather than promise legal immunity or unimplemented safeguards.

Invitation emails identify the inviter and workspace and offer one clear Join workspace action. The sign-in welcome repeats that context from a validated invitation, explains the shared feed and personal privacy, and preserves the invitation through Google sign-in. Do not show an agent setup task before joining. Expired or used invitations get a clear explanation; a wrong account gets a direct account-switch action, not a join button that will fail. Email receipts must distinguish confirmed sending from copy-link fallback.
