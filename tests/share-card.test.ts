import { describe, expect, it } from "vitest";
import { shareCardSnapshot, shareSummary, type ShareCardData } from "@/lib/share-card";
import { buildActivitySnapshot } from "@/lib/activity";

const recap: ShareCardData = {
  kind: "recap", periodLabel: "Sep 19–Sep 25", snapshotLabel: "Sep 25", totalChanges: 3, activeAgents: 2,
  topAgent: "Private nickname", topSystem: "Private app",
  agents: [{ name: "Private nickname", count: 2 }, { name: "Other nickname", count: 1 }],
  days: [{ weekday: "Fri", count: 3, agents: [{ name: "Private nickname", count: 2 }, { name: "Other nickname", count: 1 }] }],
};

describe("static share snapshots", () => {
  const activity = { kind: "activity" as const, ...buildActivitySnapshot([
    { occurredAt: new Date("2026-10-14T10:00:00Z"), status: "completed", agentId: "secret-agent-id", agentName: "Private nickname" },
  ], new Date("2026-10-14T12:00:00Z")), agents: [{ name: "Private nickname", count: 1 }], apps: [{ name: "Private app", count: 1 }], categories: [{ name: "Private type", count: 1 }], workspaceName: "Never export", metadata: { customer: "Never export" } };

  it("exports an allowlisted activity snapshot with private labels hidden by default", () => {
    const result = shareCardSnapshot(activity, { includeNames: false, includeApps: false });
    expect(JSON.stringify(result)).not.toMatch(/Private|secret|Never export|workspaceName|metadata/);
    expect(result).toMatchObject({ totalActions: 1, activeAgents: 1, activeDays: 1, days: activity.days, capturedAt: activity.capturedAt });
    expect(shareSummary(result)).toContain("1 reported completed actions");
    expect(shareSummary(result)).toContain("1-day current streak");
    expect(shareSummary(result)).not.toContain("active days");
    expect(shareSummary(result)).toContain(`${activity.periodLabel} (UTC)`);
    expect(shareSummary(result)).not.toMatch(/Private|secret|Never export/);
    expect(shareSummary(result)).toContain("https://www.monologue.events/integrations");
  });

  it.each([[true, false], [false, true], [true, true]])("keeps activity aggregate-only regardless of legacy sharing options", (includeNames, includeApps) => {
    const result = shareCardSnapshot(activity, { includeNames, includeApps });
    expect(shareSummary(result)).not.toMatch(/Agents:|Apps:|Action types:|Private/);
    expect(JSON.stringify(result)).not.toMatch(/Never export|secret-agent-id|Private|agents|apps|categories/);
    expect(result).toMatchObject({ days: activity.days, totalActions: activity.totalActions, activeDays: activity.activeDays });
  });
  it("hides names and app details unless explicitly selected, including chart labels", () => {
    const result = shareCardSnapshot(recap, { includeNames: false, includeApps: false });
    expect(JSON.stringify(result)).not.toMatch(/Private|nickname/);
    if (result.kind !== "recap") throw new Error("Expected recap");
    expect(result.agents[0].name).toBe("Agent 1");
    expect(result.days[0].agents[0].name).toBe(result.agents[0].name);
    expect(result.topAgent).toBe(result.agents[0].name);
    expect(result.totalChanges).toBe(3);
    expect(recap.topAgent).toBe("Private nickname");
  });

  it("includes only the requested details", () => {
    const result = shareCardSnapshot(recap, { includeNames: true, includeApps: false });
    expect(result).toMatchObject({ topAgent: "Private nickname", topSystem: "" });
    expect(shareCardSnapshot(recap, { includeNames: true, includeApps: true })).toEqual(recap);
  });

  it("keeps same-named agents distinct across daily segments and anonymous labels", () => {
    const agents = [{ key: 0, name: "Same private name", count: 2 }, { key: 1, name: "Same private name", count: 1 }];
    const duplicateNames: ShareCardData = { ...recap, topAgent: agents[0].name, agents, days: [{ weekday: "Fri", count: 3, agents: [...agents].reverse() }] };
    const result = shareCardSnapshot(duplicateNames, { includeNames: false, includeApps: false });
    if (result.kind !== "recap") throw new Error("Expected recap");
    expect(result.agents.map(agent => agent.name)).toEqual(["Agent 1", "Agent 2"]);
    expect(result.days[0].agents.map(agent => agent.name)).toEqual(["Agent 2", "Agent 1"]);
    expect(result.topAgent).toBe("Agent 1");
    expect(JSON.stringify(result)).not.toContain("Same private name");
    expect(shareCardSnapshot(duplicateNames, { includeNames: true, includeApps: true })).toEqual(duplicateNames);
  });

  it("redacts profile details and does not imply all recorded actions succeeded", () => {
    const profile: ShareCardData = { kind: "profile", snapshotLabel: "Sep 25", agentName: "Private nickname", platform: "Codex", totalActions: 4, activeSince: "Sep 19", systems: ["Private app"], commonActions: [{ name: "purchased", count: 1 }] };
    const result = shareCardSnapshot(profile, { includeNames: false, includeApps: false });
    expect(result).toMatchObject({ agentName: "My AI agent", systems: [], commonActions: [] });
    expect(shareSummary(result)).toContain("4 recorded actions");
    expect(shareSummary(result)).not.toContain("completed");
  });

  it("links only to a public setup page, never a live feed or profile", () => {
    const text = shareSummary(shareCardSnapshot(recap, { includeNames: false, includeApps: false }));
    expect(text).toContain("https://www.monologue.events/integrations");
    expect(text).not.toMatch(/\/feed|\/agents\/|\/recap|nickname/);
    expect(shareSummary({ ...recap, totalChanges: 0, activeAgents: 0, agents: [], days: [] })).not.toContain("Most active");
  });
});
