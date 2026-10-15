import { dayKey, keyDate, shiftDayKey, validatedTimeZone, type LedgerAction } from "./ledger";

export const ACTIVITY_DAYS = 28;
// Fixed bands, shared by the interactive matrix and exported image. Sage is the
// existing positive accent; lighter bands mix it with the existing paper color.
export const ACTIVITY_BANDS = [
  { min: 0, label: "0", color: "#e8e5dd" },
  { min: 1, label: "1–4", color: "#d5dad2" },
  { min: 5, label: "5–9", color: "#b6c0b6" },
  { min: 10, label: "10–19", color: "#8fa293" },
  { min: 20, label: "20+", color: "#617a67" },
] as const;

export type ActivityDay = { key: string; dateLabel: string; count: number };
export type ActivitySnapshot = {
  periodLabel: string;
  snapshotLabel: string;
  capturedAt: string;
  timeZone: string;
  totalActions: number;
  activeAgents: number;
  activeDays: number;
  currentStreak: number;
  days: ActivityDay[];
};
export type ActivityAction = Pick<LedgerAction, "occurredAt" | "status" | "agentId" | "agentName"> & { reportedByKeyId?: string | null };

export function activityBand(count: number) {
  return ACTIVITY_BANDS.findLastIndex(band => count >= band.min);
}

export function activityWeeks(days: ActivityDay[]): Array<Array<ActivityDay | null>> {
  if (!days.length) return [];
  const padding = keyDate(days[0].key).getUTCDay();
  const cells: Array<ActivityDay | null> = [...Array.from({ length: padding }, () => null), ...days];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function activityWindow(now: Date, requestedTimeZone: string) {
  const timeZone = validatedTimeZone(requestedTimeZone);
  const endKey = dayKey(now, timeZone);
  const startKey = shiftDayKey(endKey, 1 - ACTIVITY_DAYS);
  return { timeZone, startKey, endKey };
}

export function activityAccumulator(now = new Date(), requestedTimeZone = "UTC") {
  const { timeZone, startKey, endKey } = activityWindow(now, requestedTimeZone);
  const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const key = shiftDayKey(startKey, i);
    return { key, dateLabel: dateFormat.format(keyDate(key)), count: 0 };
  });
  const byDate = new Map(days.map(day => [day.key, day]));
  const agents = new Set<string>();
  const activeDates = new Set<string>();
  return {
    add(actions: ActivityAction[]) {
      for (const action of actions) {
        if (action.status !== "completed" || action.occurredAt > now || !Number.isFinite(action.occurredAt.getTime())) continue;
        const key = dayKey(action.occurredAt, timeZone);
        activeDates.add(key);
        const day = byDate.get(key);
        if (!day) continue;
        day.count++;
        // Stable Agent identity wins. Older records fall back to reporting key,
        // then exact legacy name, within this workspace. Prefixes avoid collisions.
        const identity = action.agentId ? `agent:${action.agentId}` : action.reportedByKeyId ? `key:${action.reportedByKeyId}` : `legacy:${action.agentName}`;
        agents.add(identity);
      }
    },
    snapshot(): ActivitySnapshot {
      // Today stays open: yesterday's run survives until a whole local day is missed.
      let key = activeDates.has(endKey) ? endKey : shiftDayKey(endKey, -1);
      let currentStreak = 0;
      while (activeDates.has(key)) {
        currentStreak++;
        key = shiftDayKey(key, -1);
      }
      return {
        periodLabel: `${dateFormat.format(keyDate(startKey))} – ${dateFormat.format(keyDate(endKey))}`,
        snapshotLabel: dateFormat.format(keyDate(endKey)),
        capturedAt: now.toISOString(), timeZone,
        totalActions: days.reduce((total, day) => total + day.count, 0),
        activeAgents: agents.size,
        activeDays: days.filter(day => day.count > 0).length,
        currentStreak,
        days: days.map(day => ({ ...day })),
      };
    },
  };
}

export function buildActivitySnapshot(actions: ActivityAction[], now = new Date(), timeZone = "UTC") {
  const accumulator = activityAccumulator(now, timeZone);
  accumulator.add(actions);
  return accumulator.snapshot();
}
