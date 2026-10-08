import { z } from "zod";
import { db } from "./db";
import { requireWorkspaceAccess, WorkspaceError } from "./workspace-access";
export const reportSettingsSchema = z.object({
  emailEnabled: z.boolean(), slackEnabled: z.boolean(), slackChannel: z.string().trim().max(80).nullable(),
  hour: z.number().int().min(0).max(23),
  timeZone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }),
}).strict().refine(value => !value.slackEnabled || Boolean(value.slackChannel), { message: "Choose a Slack channel." });
export async function saveReportSettings(workspaceId: string, userId: string, input: unknown) {
  const parsed = reportSettingsSchema.safeParse(input);
  if (!parsed.success) throw new WorkspaceError("Choose a valid time, timezone, and destination.");
  return db.$transaction(async tx => {
    const { workspace } = await requireWorkspaceAccess(tx, workspaceId, userId, true);
    if (workspace.kind !== "shared" || workspace.plan !== "plus") throw new WorkspaceError("Scheduled email and Slack reports are included in Workspace Plus.", 403);
    return tx.workspaceReportSettings.upsert({ where: { workspaceId }, update: parsed.data, create: { workspaceId, ...parsed.data } });
  });
}
export async function dailyWorkspaceReport(workspaceId: string, now = new Date()) {
  const actions = await db.action.findMany({ where: { workspaceId, occurredAt: { gte: new Date(now.getTime()-86400000), lt: now } },
    include: { reportedByUser: { select: { name: true } } }, orderBy: { occurredAt: "desc" } });
  return { actions, completed: actions.filter(action => action.status === "completed").length,
    attention: actions.filter(action => action.status !== "completed").length,
    people: new Set(actions.map(action => action.reportedByUserId).filter(Boolean)).size };
}
