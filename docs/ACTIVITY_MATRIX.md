# Recorded agent activity

Recap includes a 28-calendar-day activity snapshot alongside the existing weekly ledger, daily report and profile sharing. It uses the existing React, Next.js, Lucide and canvas sharing infrastructure without adding runtime dependencies. The browser suite uses Playwright as a development dependency.

## Aggregate contract

The Recap server route resolves the signed-in workspace and authorizes explicit `workspaceId` selection before querying. Explicit selection wins over the browser's workspace cookie, including when another tab changes it. All activity batches filter by that workspace, completed status, and `occurredAt <= capturedAt`. The weekly chart shares the same capture time and also excludes future records, even later on the current local date.

The timezone follows Recap's existing validated `x-vercel-ip-timezone` convention, falling back to UTC. Exactly 28 local dates, including today, are generated using calendar-date arithmetic. The accumulator converts timestamps into that timezone and enforces the exact local date range for chart totals, while retaining older active dates to resolve the streak. This handles DST, leap days and year boundaries without treating local days as fixed 24-hour intervals.

Queries select only the timestamp, pagination ID and identity fields. They page backwards by timestamp and ID until the 28-day chart window and the first gap in the current streak are both resolved. This allows streaks beyond 28 days without reading the rest of a workspace’s history. The legacy agent name is used only as a last-resort identity fallback; names, app labels and action categories are not included in the aggregate snapshot. They fetch at most 500 rows per batch in one read transaction (15-second timeout), with workspace and capture-time constraints repeated in every batch. Memory holds one batch, aggregate counts and the distinct local activity dates read. A timeout fails the request rather than displaying a silently truncated total. Existing ingestion deduplication remains authoritative: every persisted completed record is counted once. No fuzzy deduplication is added.

Active agents use stable `agentId`. Legacy records fall back to `reportedByKeyId`, then the exact legacy `agentName`, with distinct key prefixes. Same-named agents with different stable identities stay distinct. Records lacking both identities cannot distinguish different agents with the same name; different old reporting keys can count separately even if used by one agent.

Empty dates have zero counts. Active days are dates with at least one completed record. The displayed current streak counts consecutive local dates with completed records, beginning today when active or yesterday while today is still open. A whole missing day breaks it. Failed, pending and future records do not contribute, and older activity never increases the 28-day totals. Absence of records is not proof that no work happened or that reporting was complete.

## Matrix and sharing

The 28-day matrix and seven-day stacked chart share one activity section. Above 850px they sit side by side, with a narrower matrix on the left and a wider weekly chart on the right. At narrower widths they stack in that order. One compact stats row shows 28-day action and agent totals plus the current streak; the weekly chart has no repeated headline totals. Each chart labels its own date range and retains its own static share action. Weekly highlights and the daily report remain below the combined section.

Sunday through Saturday form seven rows. Chronological week columns contain 28 real dates, with neutral outlined padding outside the period. Arrow keys move by a day vertically or a week horizontally; Home/End jump to range edges. Every real day has an accessible exact date/count label, a 44px touch target, and persistent selectable details.

Fixed daily bands are 0, 1–4, 5–9, 10–19 and 20+. The zero band uses the existing divider color. Positive bands tint the existing sage accent with paper; 20+ uses sage itself. The matrix reuses Rough.js from the weekly chart, with deterministic uneven outlines and angled hatching that becomes denser at higher bands. Gaegu supplies the handwritten labels and totals. The same drawing options, thresholds and colors drive the SVG matrix, legends and PNG.

One aggregate snapshot supplies the matrix, totals, copied text and image. Activity sharing includes aggregate totals and dates only. Agent, app and action-type breakdowns and their inclusion controls are omitted. Existing weekly/profile sharing retains its own inclusion options. Weekly exports with more than seven agents show the top six plus an “Other agents” series; daily and overall counts remain complete. Long optional labels use ellipses rather than overlapping the chart or compressing the font. The activity export uses an allowlist and includes no workspace names, agent names, app labels, action categories, teammate identities, action contents, URLs from actions or metadata. It links to the existing public `/integrations` setup page and grants no account access.

All activity, weekly and profile previews, PNG downloads and native file shares use the same prepared 1200×630 PNG bytes after fonts load. Every image includes monologue.events; copied and native-share text links to the public setup hub. Mobile dialogs scroll the preview independently of the always-visible action footer, use 48px action targets and 16px text fields, and respect dynamic viewport height and safe-area insets. Saved/shared images cannot be revoked. Native cancellation is neutral; unavailable file sharing starts a download. Clipboard and export failures produce actionable feedback. The native modal contains focus, supports Escape and restores the triggering control.

## Verification limits

Unit and disposable SQLite/libSQL integration tests cover date and identity boundaries, authorization and batched workspace queries. Playwright exercises desktop and mobile Chromium layouts, touch, keyboard, focus, workspace changes, aggregate-only privacy and real PNG downloads. Native-share/clipboard success, cancellation and failures use browser stubs; they do not prove OS share-sheet behavior or acceptance by individual destination apps. Physical iOS/Safari and Android device sharing still need a device check. Production-scale throughput has not been benchmarked.

For local sample data, run `npm run dev:workspace` and open `http://localhost:3100/recap`. For fresh disposable fixtures, run `npm run test:browser`.
