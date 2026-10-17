import { describe, expect, it } from "vitest";
import { activityBand, activityWeeks, buildActivitySnapshot, type ActivityAction } from "@/lib/activity";
import { shiftDayKey } from "@/lib/ledger";

const action = (date: string, values: Partial<ActivityAction> = {}): ActivityAction => ({ occurredAt: new Date(date), status: "completed", agentId: "agent-a", agentName: "Codex", ...values });

describe("28-day recorded activity", () => {
  it.each([
    [[], 0], [[14], 1], [[13], 1], [[12], 0], [[14, 12], 1], [[13, 12], 2], [[12, 14, 13, 14], 3],
  ])("counts consecutive days, with today still open (%j)", (dates, expected) => {
    const actions = dates.map(date => action(`2026-10-${date}T10:00:00Z`));
    actions.push(action("2026-10-14T13:00:00Z"), action("2026-10-11T10:00:00Z", { status: "pending" }), action("2026-10-10T10:00:00Z", { status: "failed" }));
    expect(buildActivitySnapshot(actions, new Date("2026-10-14T12:00:00Z")).currentStreak).toBe(expected);
  });

  it("keeps streaks beyond 28 days without inflating the displayed period's totals or agents", () => {
    const actions = Array.from({ length: 45 }, (_, index) => action(`${shiftDayKey("2026-10-14", -index)}T10:00:00Z`, { agentId: index >= 28 ? "older-agent" : "current-agent" }));
    expect(buildActivitySnapshot(actions.reverse(), new Date("2026-10-14T12:00:00Z"))).toMatchObject({ currentStreak: 45, activeDays: 28, totalActions: 28, activeAgents: 1 });
  });

  it.each([
    ["America/Los_Angeles", "2026-03-09T07:30:00Z", ["2026-03-07T20:00:00Z", "2026-03-08T19:00:00Z", "2026-03-09T07:00:00Z"]],
    ["America/Los_Angeles", "2026-11-02T08:30:00Z", ["2026-10-31T19:00:00Z", "2026-11-01T08:30:00Z", "2026-11-01T09:30:00Z", "2026-11-02T08:00:00Z"]],
    ["UTC", "2024-03-01T12:00:00Z", ["2024-02-28T12:00:00Z", "2024-02-29T12:00:00Z", "2024-03-01T12:00:00Z"]],
    ["Pacific/Kiritimati", "2026-01-01T10:30:00Z", ["2025-12-30T10:00:00Z", "2025-12-31T10:00:00Z", "2026-01-01T10:00:00Z"]],
  ])("uses calendar dates for streaks across timezone, DST, leap-day and year boundaries in %s", (zone, now, dates) => {
    expect(buildActivitySnapshot(dates.map(date => action(date)), new Date(now), zone).currentStreak).toBe(3);
  });

  it("counts each persisted completed action once, excludes range edges and future timestamps, and fills empty dates", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = buildActivitySnapshot([
      action("2025-12-13T23:59:59.999Z"), action("2025-12-14T00:00:00Z"),
      action("2026-01-10T12:00:00Z"), action("2026-01-10T12:00:00.001Z"), action("2026-01-11T00:00:00Z"),
      action("2026-01-09T12:00:00Z", { status: "pending" }), action("2026-01-08T12:00:00Z", { status: "failed" }),
      // Identical contents are separate persisted records, never fuzzy-deduplicated.
      action("2026-01-10T12:00:00Z"),
    ], now);
    expect(result.days).toHaveLength(28);
    expect(result.days[0]).toMatchObject({ key: "2025-12-14", count: 1 });
    expect(result.days[27]).toMatchObject({ key: "2026-01-10", count: 2 });
    expect(result).toMatchObject({ totalActions: 3, activeDays: 2, activeAgents: 1, timeZone: "UTC", capturedAt: now.toISOString() });
    expect(result.days.slice(1, 27).every(day => day.count === 0)).toBe(true);
    expect(result.days.reduce((sum, day) => sum + day.count, 0)).toBe(result.totalActions);
    expect(result.periodLabel).toBe("Dec 14, 2025 – Jan 10, 2026");
  });

  it.each([
    ["America/Los_Angeles", "2026-03-09T07:30:00Z", "2026-02-10T08:00:00Z", "2026-02-10", "2026-03-09"],
    ["America/Los_Angeles", "2026-11-02T08:30:00Z", "2026-10-06T07:00:00Z", "2026-10-06", "2026-11-02"],
    ["Pacific/Kiritimati", "2026-01-01T10:30:00Z", "2025-12-05T10:00:00Z", "2025-12-06", "2026-01-02"],
    ["Asia/Kathmandu", "2026-03-01T18:30:00Z", "2026-02-02T18:15:00Z", "2026-02-03", "2026-03-02"],
  ])("uses local dates in %s across DST, offset and month/year boundaries", (zone, now, start, firstKey, lastKey) => {
    const result = buildActivitySnapshot([action(new Date(Date.parse(start) - 1).toISOString()), action(start), action(now)], new Date(now), zone);
    expect(result.days[0]).toMatchObject({ key: firstKey, count: 1 });
    expect(result.days[27]).toMatchObject({ key: lastKey, count: 1 });
    expect(result).toMatchObject({ totalActions: 2, activeDays: 2 });
  });

  it("puts repeated DST hours on one local day and keeps same-named identities separate", () => {
    const result = buildActivitySnapshot([
      action("2026-11-01T08:30:00Z"), action("2026-11-01T09:30:00Z", { agentId: "agent-b" }),
      action("2026-11-01T10:30:00Z", { agentId: null, reportedByKeyId: "key-a" }),
      action("2026-11-01T10:31:00Z", { agentId: null, reportedByKeyId: "key-b" }),
      action("2026-11-01T10:32:00Z", { agentId: null, agentName: "agent-a" }),
      action("2026-11-01T10:33:00Z", { agentId: null, agentName: "agent-a" }),
    ], new Date("2026-11-02T12:00:00Z"), "America/Los_Angeles");
    expect(result).toMatchObject({ totalActions: 6, activeAgents: 5, activeDays: 1 });
    expect(result).not.toHaveProperty("agents");
    expect(result.days.find(day => day.key === "2026-11-01")?.count).toBe(6);
  });

  it("falls back to UTC for invalid zones and represents zero activity honestly", () => {
    const result = buildActivitySnapshot([], new Date("2024-03-02T01:00:00Z"), "invalid/timezone");
    expect(result).toMatchObject({ timeZone: "UTC", totalActions: 0, activeAgents: 0, activeDays: 0 });
    expect(result.days).toHaveLength(28);
    expect(result.days.some(day => day.key === "2024-02-29")).toBe(true);
    expect(result.days.every(day => day.count === 0)).toBe(true);
  });

  it.each(["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"])("aligns weekdays in chronological week columns when ending %s", date => {
    const result = buildActivitySnapshot([], new Date(`${date}T12:00:00Z`));
    const weeks = activityWeeks(result.days);
    const actual = weeks.flat().filter(day => day !== null);
    expect(actual).toEqual(result.days);
    expect(weeks).toHaveLength(new Date(`${result.days[0].key}T12:00:00Z`).getUTCDay() ? 5 : 4);
    weeks.forEach(week => week.forEach((day, row) => { if (day) expect(new Date(`${day.key}T12:00:00Z`).getUTCDay()).toBe(row); }));
  });

  it("uses fixed intensity thresholds across all snapshots", () => {
    expect([0, 1, 4, 5, 9, 10, 19, 20, 10000].map(activityBand)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
