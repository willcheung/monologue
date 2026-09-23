import "server-only";
import { db } from "./db";
import { buildWeeklyLedger } from "./ledger";

export async function getWeeklyLedger(workspaceId: string, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 6 * 24 * 60 * 60 * 1000);
  const actions = await db.action.findMany({
    where: { workspaceId, occurredAt: { gte:start } },
    select: {
      occurredAt: true,
      status: true,
      category: true,
      system: true,
      agentName: true,
      agent: { select: { id:true, name:true, displayName:true } },
    },
  });

  return buildWeeklyLedger(actions.map((action) => ({
    occurredAt: action.occurredAt,
    status: action.status,
    category: action.category,
    system: action.system,
    agentId: action.agent?.id ?? null,
    agentName: action.agent?.displayName?.trim() || action.agent?.name || action.agentName,
  })), now);
}
