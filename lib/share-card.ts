import { PUBLIC_SITE_URL } from "./distribution-content";
import type { ActivitySnapshot } from "./activity";

export const SHARE_SITE_LABEL = "monologue.events";
export const SHARE_SETUP_URL = `${PUBLIC_SITE_URL}/integrations`;

type Count = { name: string; count: number; emoji?: string; key?: number };
export type ShareCardData =
  | ({ kind: "activity" } & ActivitySnapshot)
  | { kind: "recap"; periodLabel: string; snapshotLabel: string; totalChanges: number; activeAgents: number; topAgent: string; topSystem: string; agents: Count[]; days: Array<{ weekday: string; count: number; agents: Count[] }> }
  | { kind: "profile"; snapshotLabel: string; agentName: string; platform: string; totalActions: number; activeSince: string; systems: string[]; commonActions: Count[] };

export function shareCardSnapshot(data: ShareCardData, options: { includeNames: boolean; includeApps: boolean }): ShareCardData {
  // An allowlist keeps IDs and private fields out even if a caller passes an
  // object with additional properties. Activity cards share totals only.
  if (data.kind === "activity") return {
    kind: "activity", periodLabel: data.periodLabel, snapshotLabel: data.snapshotLabel,
    capturedAt: data.capturedAt, timeZone: data.timeZone,
    totalActions: data.totalActions, activeAgents: data.activeAgents, activeDays: data.activeDays,
    currentStreak: data.currentStreak,
    days: data.days.map(({ key, dateLabel, count }) => ({ key, dateLabel, count })),
  };
  if (data.kind === "profile") return {
    ...data,
    agentName: options.includeNames ? data.agentName : "My AI agent",
    systems: options.includeApps ? data.systems : [],
    commonActions: options.includeApps ? data.commonActions : [],
  };
  const names = new Map(data.agents.map((agent, index) => [agent.key ?? agent.name, `Agent ${index + 1}`]));
  const name = (agent: Pick<Count, "name" | "key">) => options.includeNames ? agent.name : names.get(agent.key ?? agent.name) ?? "Other agents";
  return {
    ...data,
    topAgent: data.activeAgents ? name(data.agents.find(agent => agent.name === data.topAgent) ?? { name: data.topAgent }) : "No activity yet",
    topSystem: options.includeApps ? data.topSystem : "",
    agents: data.agents.map((agent) => ({ ...agent, name: name(agent) })),
    days: data.days.map((day) => ({ ...day, agents: day.agents.map((agent) => ({ ...agent, name: name(agent) })) })),
  };
}

export function shareSummary(data: ShareCardData) {
  const summary = data.kind === "activity"
    ? `My AI crew this month. ${data.totalActions} reported completed actions · ${data.activeAgents} active agents · ${data.currentStreak}-day current streak. ${data.periodLabel} (${data.timeZone}), 28 calendar days. Recorded activity may be incomplete.`
    : data.kind === "recap"
    ? `My AI crew reported ${data.totalChanges} completed actions from ${data.periodLabel}. ${data.activeAgents} agents were active.${data.activeAgents ? ` Most active: ${data.topAgent}.` : ""}`
    : `${data.agentName} has ${data.totalActions} recorded actions since ${data.activeSince}.`;
  return `${summary} Start your own agent feed: ${SHARE_SETUP_URL}`;
}
