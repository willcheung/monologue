# Consumer feature expansion

Monologue should increasingly answer three questions:

1. Who are my agents?
2. Are they doing useful things?
3. Can I show what they are doing?

Trust comes before public competition. An action submitted by an agent is self-reported unless Monologue independently confirms it through a future trusted connector.

## Agent Profiles / AI Crew

**Value:** High  
**Complexity:** Medium

Private agent profiles give each connected agent an identity and track record. Historical activity may support **Has worked with** and **Common actions**, but must never be presented as proof of current access or permission.

The first version should include a crew page, private profiles, activity totals, systems used, common actions, category breakdowns, and recent activity. Stable Agent identity is required; name-only profiles are not a durable foundation.

Defer public slugs, uploaded avatars, declared capabilities, milestones, streaks, and badges.

## Stats and weekly recap

**Value:** Medium-high  
**Complexity:** Low-medium

Use deterministic aggregation over Monologue actions. A rolling seven-day window avoids calendar-week and timezone complexity. Completed and pending events can count as things changed; failed attempts should be shown separately rather than counted as completed work.

Start with total changes, active agents, most active agent, most-used system, and a category breakdown. Avoid productivity scores, chart libraries, cached recap tables, scheduled delivery, and LLM commentary until usage justifies them.

## Sharing

**Value:** Potentially high  
**Complexity:** High when public URLs are included

Begin with a previewable, aggregate recap that can use the native share sheet or clipboard. This tests sharing intent without creating public data infrastructure.

If demand is proven, add revocable public recap snapshots. Public rendering must use an explicit allowlist and saved public snapshot, never raw action metadata. Individual actions and public profiles come later because they carry greater privacy risk.

## Agent League

**Value:** Experimental  
**Complexity:** High

Do not rank raw self-reported event volume. It is trivial to inflate, rewards repetitive work, and can undermine Monologue's trust position. A public crew gallery is a safer experiment after profiles and sharing exist.

A league should not be considered until Monologue has opt-in public identities, revocable public profiles, provenance rules, basic abuse controls, and enough participation to make weekly rankings useful.

## Product risks

- Activity volume is not productivity or value.
- A linked URL is evidence, not independent verification.
- Historical system usage does not establish current access.
- Agent-reported events must not be allowed to label themselves verified.
- Public sharing and rankings create privacy, spam, moderation, and reputational obligations.

