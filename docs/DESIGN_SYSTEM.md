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
- Uppercase labels: short only, with modest tracking.

Handwriting is an accent, not the whole interface. Names, timestamps, values, URLs, filters, and detail content stay easy to scan.

## Components and behavior

- Reuse existing buttons, pills, avatars, action icons, timeline rows, dialogs, and empty states before making a variant.
- Primary buttons use ink; coral is an accent, not a large background color.
- Prefer one clear primary action per section.
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
