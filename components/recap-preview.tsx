import { ActivityMatrix } from "./activity-matrix";
import { SketchLedgerChart } from "./sketch-ledger-chart";
import { buildActivitySnapshot } from "@/lib/activity";
import { buildWeeklyLedger } from "@/lib/ledger";

// Public sample activity, shared by both charts and independent of account data.
const capturedAt = new Date("2026-10-17T12:00:00Z");
const actions = Array.from({ length: 28 }, (_, index) => {
  const occurredAt = new Date("2026-09-20T08:00:00Z");
  occurredAt.setUTCDate(occurredAt.getUTCDate() + index);
  return Array.from({ length: [0, 2, 4, 8, 12, 20, 1][index % 7] }, (_, item) => ({
    occurredAt,
    status: "completed",
    category: item % 2 ? "calendar" : "code",
    system: item % 2 ? "Calendar" : "GitHub",
    agentId: item % 2 ? "sample-muse" : "sample-hermes",
    agentName: item % 2 ? "Muse · Maya" : "Hermes · Henry",
  }));
}).flat();
const activity = buildActivitySnapshot(actions, capturedAt, "UTC");
const ledger = buildWeeklyLedger(actions, capturedAt, "UTC");

export function RecapPreview() {
  return <ActivityMatrix snapshot={activity} showSharing={false}>
    <section className="activity-weekly" aria-labelledby="homepage-weekly-heading">
      <div className="activity-chart-heading"><h3 id="homepage-weekly-heading">Last 7 days</h3><p>{ledger.periodLabel}</p></div>
      <div className="activity-weekly-plot"><SketchLedgerChart days={ledger.days} agents={ledger.agents} periodLabel={ledger.periodLabel} /></div>
    </section>
  </ActivityMatrix>;
}
