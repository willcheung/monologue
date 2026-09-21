import { Prisma } from "@prisma/client";
import { db } from "./db";
import type { ActionInput } from "./action-schema";
import { CATEGORIES, STATUSES } from "./constants";
import { LOCAL_WORKSPACE_ID } from "./runtime";

export type ActionFilters = {
  agent?: string;
  category?: string;
  status?: string;
  system?: string;
  project?: string;
  from?: string;
  to?: string;
  search?: string;
};

function validDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildActionWhere(filters: ActionFilters, workspaceId = LOCAL_WORKSPACE_ID): Prisma.ActionWhereInput {
  const search = filters.search?.trim();
  const from = validDate(filters.from);
  const to = validDate(filters.to);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? "")) to.setHours(23, 59, 59, 999);

  return {
    workspaceId,
    ...(filters.agent && { agentName: filters.agent }),
    ...(filters.category && CATEGORIES.includes(filters.category as (typeof CATEGORIES)[number]) && { category: filters.category }),
    ...(filters.status && STATUSES.includes(filters.status as (typeof STATUSES)[number]) && { status: filters.status }),
    ...(filters.system && { system: filters.system }),
    ...(filters.project && { project: filters.project }),
    ...((from || to) && { occurredAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    ...(search && {
      OR: ["summary", "objectName", "system", "project", "agentName"].map((field) => ({
        [field]: { contains: search },
      })),
    }),
  };
}

export async function listActions(filters: ActionFilters = {}, workspaceId = LOCAL_WORKSPACE_ID) {
  return db.action.findMany({ where: buildActionWhere(filters, workspaceId), orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }] });
}

export async function createAction(input: ActionInput, workspaceId = LOCAL_WORKSPACE_ID) {
  if (input.externalId) {
    const existing = await db.action.findUnique({
      where: { workspaceId_agentName_system_externalId: { workspaceId, agentName: input.agentName, system: input.system, externalId: input.externalId } },
    });
    if (existing) return { action: existing, duplicate: true };
  }

  try {
    const action = await db.action.create({
      data: {
        ...input,
        workspaceId,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return { action, duplicate: false };
  } catch (error) {
    if (input.externalId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const action = await db.action.findUniqueOrThrow({
        where: { workspaceId_agentName_system_externalId: { workspaceId, agentName: input.agentName, system: input.system, externalId: input.externalId } },
      });
      return { action, duplicate: true };
    }
    throw error;
  }
}
