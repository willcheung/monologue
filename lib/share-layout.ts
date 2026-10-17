import type { ShareCardData } from "./share-card";

type Recap = Extract<ShareCardData, { kind: "recap" }>;

// Seven chart colors and two legend rows: keep the six most active agents,
// then combine the remainder without dropping any daily activity.
export function recapShareSeries(data: Recap) {
  if (data.agents.length <= 7) return { agents: data.agents, days: data.days };
  const kept = data.agents.slice(0, 6);
  const keys = new Set(kept.map(agent => agent.key ?? agent.name));
  const other = { key: -1, name: "Other agents", count: data.agents.slice(6).reduce((sum, agent) => sum + agent.count, 0) };
  return {
    agents: [...kept, other],
    days: data.days.map(day => {
      const agents = day.agents.filter(agent => keys.has(agent.key ?? agent.name));
      const count = day.agents.filter(agent => !keys.has(agent.key ?? agent.name)).reduce((sum, agent) => sum + agent.count, 0);
      return { ...day, agents: count ? [...agents, { ...other, count }] : agents };
    }),
  };
}

// Ellipsis preserves the font's proportions; canvas maxWidth squeezes letters.
export function fitShareText(text: string, maxWidth: number, measure: (value: string) => number) {
  const value = text.replace(/\s+/g, " ").trim();
  if (measure(value) <= maxWidth) return value;
  const letters = Array.from(value);
  let low = 0, high = letters.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measure(`${letters.slice(0, mid).join("")}…`) <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return `${letters.slice(0, low).join("").trimEnd()}…`;
}
