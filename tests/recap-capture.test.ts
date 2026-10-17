import { describe, expect, it } from "vitest";
import { buildActivitySnapshot } from "@/lib/activity";
import { buildWeeklyLedger, type LedgerAction } from "@/lib/ledger";

describe("Recap capture-time consistency", () => {
  it.each(["UTC", "America/Los_Angeles", "Asia/Tokyo"])("keeps the weekly chart and matrix aligned in %s", timeZone => {
    const now = new Date("2026-10-14T12:00:00Z");
    const actions: LedgerAction[] = [now, new Date(now.getTime() + 1)].map(occurredAt => ({
      occurredAt, status: "completed", agentName: "Muse", agentId: "muse", category: "calendar", system: "Calendar",
    }));
    const weekly = buildWeeklyLedger(actions, now, timeZone);
    const monthly = buildActivitySnapshot(actions, now, timeZone);
    expect(weekly.totalChanges).toBe(1);
    expect(weekly.totalChanges).toBe(monthly.totalActions);
    expect(weekly.days.at(-1)?.count).toBe(1);
  });
});
