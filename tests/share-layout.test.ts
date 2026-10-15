import { describe, expect, it } from "vitest";
import { fitShareText, recapShareSeries } from "@/lib/share-layout";
import { shareCardSnapshot, type ShareCardData } from "@/lib/share-card";

describe("bounded share layout", () => {
  it("groups large crews without losing activity or merging same-named agents", () => {
    const agents = Array.from({ length: 17 }, (_, key) => ({ key, name: "Same name", count: 7 }));
    const input: ShareCardData = { kind: "recap", periodLabel: "Oct 9–15", snapshotLabel: "Oct 15", totalChanges: 119, activeAgents: 17, topAgent: "Same name", topSystem: "", agents, days: Array.from({ length: 7 }, () => ({ weekday: "Fri", count: 17, agents: [...agents].reverse().map(agent => ({ ...agent, count: 1 })) })) };
    const snapshot = shareCardSnapshot(input, { includeNames: false, includeApps: false });
    if (snapshot.kind !== "recap") throw new Error("Expected recap");
    const series = recapShareSeries(snapshot);
    expect(series.agents).toHaveLength(7);
    expect(series.agents.at(-1)).toEqual({ key: -1, name: "Other agents", count: 77 });
    expect(series.agents.reduce((sum, agent) => sum + agent.count, 0)).toBe(119);
    for (const day of series.days) {
      expect(day.agents).toHaveLength(7);
      expect(day.agents.reduce((sum, agent) => sum + agent.count, 0)).toBe(day.count);
      expect(day.agents.at(-1)?.count).toBe(11);
    }
    expect(JSON.stringify(series)).not.toContain("Same name");
    expect(input.agents).toHaveLength(17);
  });

  it("fits long Unicode labels with an ellipsis and leaves short labels intact", () => {
    const measure = (value: string) => Array.from(value).length * 10;
    expect(fitShareText("Muse", 90, measure)).toBe("Muse");
    const result = fitShareText("Muse 🐦 family calendar and school assistant", 100, measure);
    expect(result).toBe("Muse 🐦 fa…");
    expect(measure(result)).toBeLessThanOrEqual(100);
  });
});
