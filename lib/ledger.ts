export type LedgerAction = {
  occurredAt: Date;
  status: string;
  category: string;
  system: string;
  agentId?: string | null;
  agentName: string;
};

export type LedgerCount = { name: string; count: number };
export type LedgerAgent = LedgerCount & { id: string | null };

export type WeeklyLedger = {
  periodLabel: string;
  snapshotLabel: string;
  totalChanges: number;
  failedAttempts: number;
  activeAgents: number;
  topAgent: LedgerCount | null;
  topSystem: LedgerCount | null;
  busiestDay: { name: string; count: number } | null;
  agents: LedgerAgent[];
  categories: LedgerCount[];
  days: Array<{ key: string; weekday: string; dateLabel: string; count: number; agents: LedgerAgent[] }>;
};

const DAY = 24 * 60 * 60 * 1000;

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function key(date: Date) {
  return date.toISOString().slice(0, 10);
}

function ranked(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function rankedAgents(actions: LedgerAction[]) {
  const counts = new Map<string, LedgerAgent>();
  for (const action of actions) {
    const id = action.agentId ?? null;
    const mapKey = id ?? action.agentName;
    const current = counts.get(mapKey);
    counts.set(mapKey, { id, name:action.agentName, count:(current?.count ?? 0) + 1 });
  }
  return Array.from(counts.values()).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function buildWeeklyLedger(actions: LedgerAction[], now = new Date()): WeeklyLedger {
  const end = utcDay(now);
  const start = new Date(end.getTime() - 6 * DAY);
  const afterEnd = new Date(end.getTime() + DAY);
  const inRange = actions.filter((action) => action.occurredAt >= start && action.occurredAt < afterEnd);
  const completed = inRange.filter((action) => action.status === "completed");
  const dayCounts = new Map<string, number>();
  for (const action of completed) dayCounts.set(key(action.occurredAt), (dayCounts.get(key(action.occurredAt)) ?? 0) + 1);

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
  const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const periodDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const topAgents = rankedAgents(completed);
  const topSystems = ranked(completed.map((action) => action.system));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY);
    return {
      key:key(date),
      weekday:weekday.format(date),
      dateLabel:dateLabel.format(date),
      count:dayCounts.get(key(date)) ?? 0,
      agents:rankedAgents(completed.filter((action) => key(action.occurredAt) === key(date))),
    };
  });
  const busiest = [...days].sort((left, right) => right.count - left.count)[0];

  return {
    periodLabel: `${periodDate.format(start)}–${periodDate.format(end)}`,
    snapshotLabel: periodDate.format(now),
    totalChanges: completed.length,
    failedAttempts: inRange.filter((action) => action.status === "failed").length,
    activeAgents: topAgents.length,
    topAgent: topAgents[0] ?? null,
    topSystem: topSystems[0] ?? null,
    busiestDay: busiest?.count ? { name:`${busiest.weekday} · ${busiest.dateLabel}`, count:busiest.count } : null,
    agents: topAgents,
    categories: ranked(completed.map((action) => action.category)),
    days,
  };
}
