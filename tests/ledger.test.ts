import { describe, expect, it } from "vitest";
import { buildWeeklyLedger, type LedgerAction } from "@/lib/ledger";

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
});
