export const AGENT_COLORS = ["#f1764b", "#75917c", "#7c8fb8", "#b37f60", "#8d79aa", "#c4a052", "#78a0a7"] as const;

export function agentColor(index: number) {
  return AGENT_COLORS[((index % AGENT_COLORS.length) + AGENT_COLORS.length) % AGENT_COLORS.length];
}
