import { describe, expect, it } from "vitest";
import { shareCardSnapshot, shareSummary, type ShareCardData } from "@/lib/share-card";

const recap: ShareCardData = {
  kind: "recap", periodLabel: "Sep 19–Sep 25", snapshotLabel: "Sep 25", totalChanges: 3, activeAgents: 2,
  topAgent: "Private nickname", topSystem: "Private app",
  agents: [{ name: "Private nickname", count: 2 }, { name: "Other nickname", count: 1 }],
  days: [{ weekday: "Fri", count: 3, agents: [{ name: "Private nickname", count: 2 }, { name: "Other nickname", count: 1 }] }],
};

describe("static share snapshots", () => {
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
