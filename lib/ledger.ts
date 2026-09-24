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

function dayKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year:"numeric",
    month:"2-digit",
    day:"2-digit",
    timeZone,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDayKey(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Date(date.getTime() + days * DAY).toISOString().slice(0, 10);
}

function keyDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
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

export function buildWeeklyLedger(actions: LedgerAction[], now = new Date(), timeZone = "UTC"): WeeklyLedger {
  const endKey = dayKey(now, timeZone);
  const startKey = shiftDayKey(endKey, -6);
  const inRange = actions.filter((action) => {
    const actionKey = dayKey(action.occurredAt, timeZone);
    return actionKey >= startKey && actionKey <= endKey;
  });
  const completed = inRange.filter((action) => action.status === "completed");
  const dayCounts = new Map<string, number>();
  for (const action of completed) {
    const actionKey = dayKey(action.occurredAt, timeZone);
    dayCounts.set(actionKey, (dayCounts.get(actionKey) ?? 0) + 1);
  }

  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
  const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const periodDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const topAgents = rankedAgents(completed);
  const topSystems = ranked(completed.map((action) => action.system));
  const days = Array.from({ length: 7 }, (_, index) => {
    const currentKey = shiftDayKey(startKey, index);
    const date = keyDate(currentKey);
    return {
      key:currentKey,
      weekday:weekday.format(date),
      dateLabel:dateLabel.format(date),
      count:dayCounts.get(currentKey) ?? 0,
      agents:rankedAgents(completed.filter((action) => dayKey(action.occurredAt, timeZone) === currentKey)),
    };
  });
  const busiest = [...days].sort((left, right) => right.count - left.count)[0];

  return {
    periodLabel: `${periodDate.format(keyDate(startKey))}–${periodDate.format(keyDate(endKey))}`,
    snapshotLabel: periodDate.format(keyDate(endKey)),
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
