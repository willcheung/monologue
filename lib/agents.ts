import "server-only";
import { db } from "./db";

export function agentDisplayName(agent: { name: string; displayName: string | null }) {
  return agent.displayName?.trim() || agent.name;
}

export async function ensureReportingAgent({
  workspaceId,
  agentId,
  agentName,
  keyId,
}: {
  workspaceId: string;
  agentId?: string | null;
  agentName: string;
  keyId?: string | null;
}) {
  if (agentId) {
    const existing = await db.agent.findFirst({ where: { id: agentId, workspaceId } });
    if (existing) return existing;
  }

  const normalizedName = agentName.trim() || "My agent";
  const existing = await db.agent.findFirst({
    where: { workspaceId, name: normalizedName },
    orderBy: { createdAt: "asc" },
  });
  const agent = existing ?? await db.agent.create({ data: { workspaceId, name: normalizedName } });

  if (keyId) {
    await db.apiKey.updateMany({
      where: { id: keyId, workspaceId, agentId: null },
      data: { agentId: agent.id },
    });
  }
  return agent;
}

export async function listAgentSummaries(workspaceId: string) {
  const [agents, systems] = await Promise.all([
    db.agent.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        platform: true,
        createdAt: true,
        _count: { select: { actions: true } },
        actions: { select: { occurredAt: true }, orderBy: { occurredAt: "desc" }, take: 1 },
        apiKeys: { where: { revokedAt: null }, select: { id: true }, take: 1 },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
    db.action.groupBy({
      where: { workspaceId, agentId: { not: null } },
      by: ["agentId", "system"],
      _count: { _all:true },
    }),
  ]);

  const systemsByAgent = new Map<string, Array<{ name:string; count:number }>>();
  for (const item of systems) {
    if (!item.agentId) continue;
    const values = systemsByAgent.get(item.agentId) ?? [];
    values.push({ name:item.system, count:item._count._all });
    systemsByAgent.set(item.agentId, values);
  }
  for (const values of systemsByAgent.values()) values.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  return agents.map((agent) => ({
    id: agent.id,
    name: agentDisplayName(agent),
    platform: agent.platform,
    description: agent.description,
    actionCount: agent._count.actions,
    lastActive: agent.actions[0]?.occurredAt ?? null,
    systems: (systemsByAgent.get(agent.id) ?? []).map((system) => system.name),
    mostLikely: systemsByAgent.get(agent.id)?.[0]?.name
      ? `Most likely to be changing things in ${systemsByAgent.get(agent.id)![0].name}.`
      : "Waiting for its first recorded action.",
    connectedToMonologue: agent.apiKeys.length > 0,
  })).sort((left, right) => {
    const leftTime = left.lastActive?.getTime() ?? 0;
    const rightTime = right.lastActive?.getTime() ?? 0;
    return rightTime - leftTime;
  });
}

export async function getAgentProfile(workspaceId: string, agentId: string) {
  const agent = await db.agent.findFirst({
    where: { id: agentId, workspaceId },
    select: {
      id: true,
      name: true,
      displayName: true,
      description: true,
      platform: true,
      createdAt: true,
      apiKeys: { where: { revokedAt: null }, select: { id: true }, take: 1 },
    },
  });
  if (!agent) return null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const where = { workspaceId, agentId };
  const [totalActions, actionsLastSevenDays, firstAction, lastAction, systemGroups, categoryGroups, verbGroups, recentActions] = await Promise.all([
    db.action.count({ where }),
    db.action.count({ where: { ...where, occurredAt: { gte: sevenDaysAgo } } }),
    db.action.findFirst({ where, select: { occurredAt: true }, orderBy: { occurredAt: "asc" } }),
    db.action.findFirst({ where, select: { occurredAt: true }, orderBy: { occurredAt: "desc" } }),
    db.action.groupBy({ by: ["system"], where, _count: { _all: true } }),
    db.action.groupBy({ by: ["category"], where, _count: { _all: true } }),
    db.action.groupBy({ by: ["verb"], where, _count: { _all: true } }),
    db.action.findMany({ where, orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }], take: 12 }),
  ]);

  const byCount = <T extends { count: number }>(left: T, right: T) => right.count - left.count;
  return {
    id: agent.id,
    name: agentDisplayName(agent),
    canonicalName: agent.name,
    platform: agent.platform,
    description: agent.description,
    connectedToMonologue: agent.apiKeys.length > 0,
    totalActions,
    actionsLastSevenDays,
    firstSeen: firstAction?.occurredAt ?? agent.createdAt,
    lastActive: lastAction?.occurredAt ?? null,
    systems: systemGroups.map((item) => ({ name: item.system, count: item._count._all })).sort(byCount),
    categories: categoryGroups.map((item) => ({ name: item.category, count: item._count._all })).sort(byCount),
    commonActions: verbGroups.map((item) => ({ name: item.verb, count: item._count._all })).sort(byCount).slice(0, 6),
    recentActions,
  };
}
