import "server-only";
import { db } from "./db";
import { activityAccumulator, activityWindow } from "./activity";
import { dayKey, shiftDayKey } from "./ledger";

// The Recap server route authorizes workspaceId before calling this function.
// Each batch is workspace-scoped; one read transaction freezes the persisted
// records across batches. Only aggregates cross the server/client boundary.
export async function getWorkspaceActivity(workspaceId: string, now = new Date(), timeZone = "UTC") {
  const { startKey, endKey, timeZone: zone } = activityWindow(now, timeZone);
  return db.$transaction(async transaction => {
    const accumulator = activityAccumulator(now, timeZone);
    let before: { id: string; occurredAt: Date } | undefined;
    for (;;) {
      const actions = await transaction.action.findMany({
        where: { workspaceId, status: "completed", occurredAt: { lte: now }, ...(before && { OR: [
          { occurredAt: { lt: before.occurredAt } },
          { occurredAt: before.occurredAt, id: { lt: before.id } },
        ] }) },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 500,
        select: {
          id: true, occurredAt: true, agentId: true, agentName: true, reportedByKeyId: true,
        },
      });
      accumulator.add(actions.map(action => ({
        occurredAt: action.occurredAt, status: "completed", agentId: action.agentId,
        reportedByKeyId: action.reportedByKeyId,
        agentName: action.agentName,
      })));
      const snapshot = accumulator.snapshot();
      if (actions.length < 500) return snapshot;
      before = actions[actions.length - 1];
      // Walk back only until both the chart window and the first streak gap are
      // resolved. The timestamp + ID cursor also handles 500+ records at one time.
      const gapKey = shiftDayKey(endKey, -snapshot.currentStreak - (snapshot.days.at(-1)!.count ? 0 : 1));
      const requiredKey = startKey < gapKey ? startKey : gapKey;
      if (dayKey(before.occurredAt, zone) < requiredKey) return snapshot;
    }
  }, { timeout: 15_000 });
}
