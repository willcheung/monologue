import { PUBLIC_SITE_URL } from "./distribution-content";

type Count = { name: string; count: number; emoji?: string };
export type ShareCardData =
  | { kind: "recap"; periodLabel: string; snapshotLabel: string; totalChanges: number; activeAgents: number; topAgent: string; topSystem: string; agents: Count[]; days: Array<{ weekday: string; count: number; agents: Count[] }> }
  | { kind: "profile"; snapshotLabel: string; agentName: string; platform: string; totalActions: number; activeSince: string; systems: string[]; commonActions: Count[] };

export function shareCardSnapshot(data: ShareCardData, options: { includeNames: boolean; includeApps: boolean }): ShareCardData {
  if (data.kind === "profile") return {
    ...data,
    agentName: options.includeNames ? data.agentName : "My AI agent",
    systems: options.includeApps ? data.systems : [],
    commonActions: options.includeApps ? data.commonActions : [],
  };
  const names = new Map(data.agents.map((agent, index) => [agent.name, `Agent ${index + 1}`]));
  const name = (value: string) => options.includeNames ? value : names.get(value) ?? "Other agents";
  return {
    ...data,
    topAgent: data.activeAgents ? name(data.topAgent) : "No activity yet",
    topSystem: options.includeApps ? data.topSystem : "",
    agents: data.agents.map((agent) => ({ ...agent, name: name(agent.name) })),
    days: data.days.map((day) => ({ ...day, agents: day.agents.map((agent) => ({ ...agent, name: name(agent.name) })) })),
  };
}

export function shareSummary(data: ShareCardData) {
  const summary = data.kind === "recap"
    ? `My AI crew reported ${data.totalChanges} completed actions from ${data.periodLabel}. ${data.activeAgents} agents were active.${data.activeAgents ? ` Most active: ${data.topAgent}.` : ""}`
    : `${data.agentName} has ${data.totalActions} recorded actions since ${data.activeSince}.`;
  return `${summary} Start your own agent feed: ${PUBLIC_SITE_URL}/integrations`;
}
