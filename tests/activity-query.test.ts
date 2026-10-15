import { describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({ findMany: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $transaction: query.transaction } }));
import { getWorkspaceActivity } from "@/lib/workspace-activity";

describe("activity read boundary", () => {
  it("uses bounded, scoped pages in one snapshot and never selects action content or secrets", async () => {
    const now = new Date("2026-10-14T12:00:00Z");
    query.findMany.mockReset(); query.transaction.mockReset();
    query.transaction.mockImplementation(async callback => callback({ action: { findMany: query.findMany } }));
    const record = { id: "0500", occurredAt: now, agentId: "a", agentName: "Name", reportedByKeyId: null, category: "code", system: "App", agent: null };
    query.findMany.mockResolvedValueOnce(Array.from({ length: 500 }, (_, index) => ({ ...record, id: String(501 - index).padStart(4, "0") }))).mockResolvedValueOnce([{ ...record, id: "0001" }]);
    const result = await getWorkspaceActivity("authorized-workspace", now);
    expect(result.totalActions).toBe(501);
    expect(query.transaction).toHaveBeenCalledTimes(1);
    expect(query.findMany).toHaveBeenCalledTimes(2);
    for (const [args] of query.findMany.mock.calls) {
      expect(args.where).toMatchObject({ workspaceId: "authorized-workspace", status: "completed", occurredAt: { lte: now } });
      expect(args.orderBy).toEqual([{ occurredAt: "desc" }, { id: "desc" }]);
      expect(args.take).toBeGreaterThan(0); expect(args.take).toBeLessThanOrEqual(500);
      expect(Object.keys(args.select).sort()).toEqual(["agentId", "agentName", "id", "occurredAt", "reportedByKeyId"]);
    }
    expect(query.findMany.mock.calls[1][0].where.OR).toEqual([{ occurredAt: { lt: now } }, { occurredAt: now, id: { lt: "0002" } }]);
    expect(result.currentStreak).toBe(1);
  });

  it("stops reading old history after the chart window and first streak gap are resolved", async () => {
    query.findMany.mockReset(); query.transaction.mockReset();
    query.transaction.mockImplementation(async callback => callback({ action: { findMany: query.findMany } }));
    query.findMany.mockResolvedValue(Array.from({ length: 500 }, (_, index) => ({ id: String(500 - index), occurredAt: new Date("2025-01-01"), agentId: "old", agentName: "Old", reportedByKeyId: null })));
    expect(await getWorkspaceActivity("authorized-workspace", new Date("2026-10-14"))).toMatchObject({ currentStreak: 0, totalActions: 0, activeAgents: 0 });
    expect(query.findMany).toHaveBeenCalledTimes(1);
  });
});
