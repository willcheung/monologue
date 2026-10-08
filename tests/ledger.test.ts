import { describe, expect, it } from "vitest";
import { buildWeeklyLedger, weeklyLedgerBounds, type LedgerAction } from "@/lib/ledger";

const action = (occurredAt: string, overrides: Partial<LedgerAction> = {}): LedgerAction => ({
  occurredAt:new Date(occurredAt),
  status:"completed",
  category:"code",
  system:"GitHub",
  agentName:"Codex",
  ...overrides,
});

describe("weekly agent ledger", () => {
  it("counts completed changes across seven calendar days and separates failures", () => {
    const ledger = buildWeeklyLedger([
      action("2026-09-17T12:00:00Z"),
      action("2026-09-23T08:00:00Z", { category:"communication", system:"Gmail", agentName:"Muse" }),
      action("2026-09-23T09:00:00Z", { status:"failed" }),
      action("2026-09-16T23:59:59Z"),
    ], new Date("2026-09-23T18:00:00Z"));

    expect(ledger.periodLabel).toBe("Sep 17–Sep 23");
    expect(ledger.totalChanges).toBe(2);
    expect(ledger.failedAttempts).toBe(1);
    expect(ledger.activeAgents).toBe(2);
    expect(ledger.days.map((day) => day.count)).toEqual([1, 0, 0, 0, 0, 0, 1]);
    expect(ledger.days[6].agents).toEqual([{ id:null, name:"Muse", count:1 }]);
    expect(ledger.agents.map((agent) => agent.name)).toEqual(["Codex", "Muse"]);
    expect(ledger.busiestDay).toEqual({ name:"Thu · Sep 17", count:1 });
  });

  it("ranks agents and systems deterministically without counting failed attempts", () => {
    const ledger = buildWeeklyLedger([
      action("2026-09-22T12:00:00Z"),
      action("2026-09-23T08:00:00Z"),
      action("2026-09-23T09:00:00Z", { status:"failed", agentName:"Muse", system:"Gmail" }),
    ], new Date("2026-09-23T18:00:00Z"));

    expect(ledger.topAgent).toEqual({ id:null, name:"Codex", count:2 });
    expect(ledger.topSystem).toEqual({ name:"GitHub", count:2 });
    expect(ledger.categories).toEqual([{ name:"code", count:2 }]);
  });

  it("uses the viewer's calendar date near UTC midnight", () => {
    const ledger = buildWeeklyLedger([
      action("2026-09-24T00:30:00Z"),
    ], new Date("2026-09-24T01:00:00Z"), "America/Los_Angeles");

    expect(ledger.periodLabel).toBe("Sep 17–Sep 23");
    expect(ledger.snapshotLabel).toBe("Sep 23");
    expect(ledger.days[6]).toMatchObject({ key:"2026-09-23", count:1 });
  });
  it("gives briefing timestamps for the same seven calendar days as Recap near UTC midnight", () => {
    const now = new Date("2026-09-24T01:00:00Z");
    const range = weeklyLedgerBounds(now, "America/Los_Angeles");
    expect(range.from.toISOString()).toBe("2026-09-17T07:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-09-24T06:59:59.999Z");
    const ledger = buildWeeklyLedger([
      action(new Date(range.from.getTime() - 1).toISOString()),
      action(range.from.toISOString()), action(range.to.toISOString()),
      action(new Date(range.to.getTime() + 1).toISOString()),
    ], now, "America/Los_Angeles");
    expect(ledger.totalChanges).toBe(2);
  });
  it("keeps calendar-day boundaries correct through daylight-saving changes", () => {
    const spring = weeklyLedgerBounds(new Date("2026-03-09T12:00:00Z"), "America/Los_Angeles");
    expect(spring.from.toISOString()).toBe("2026-03-03T08:00:00.000Z");
    expect(spring.to.toISOString()).toBe("2026-03-10T06:59:59.999Z");
    const fall = weeklyLedgerBounds(new Date("2026-11-02T12:00:00Z"), "America/Los_Angeles");
    expect(fall.from.toISOString()).toBe("2026-10-27T07:00:00.000Z");
    expect(fall.to.toISOString()).toBe("2026-11-03T07:59:59.999Z");
  });
});
