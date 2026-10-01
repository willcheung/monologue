import { z } from "zod";
import { db } from "./db";
import { buildActionWhere } from "./actions";
import { CATEGORIES, STATUSES } from "./constants";

const optionalFilter = z.string().trim().min(1).max(100).optional();
export const readTimelineSchema = z.object({
  search: z.string().trim().min(1).max(300).optional(),
  agentName: optionalFilter, agentId: optionalFilter,
  system: optionalFilter, project: optionalFilter,
  category: z.enum(CATEGORIES).optional(), status: z.enum(STATUSES).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(1500).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict().refine(input => !input.from || !input.to || new Date(input.from) <= new Date(input.to), { message: "from must not be later than to" });

export const readTimelineOutputSchema = z.object({
  actions: z.array(z.object({
    id: z.string(), agentId: z.string().nullable(), agentName: z.string(),
    verb: z.string(), summary: z.string(), category: z.string(), status: z.string(), system: z.string(),
    objectType: z.string().nullable(), objectName: z.string().nullable(), project: z.string().nullable(),
    externalId: z.string().nullable(), value: z.number().nullable(), currency: z.string().nullable(),
    url: z.string().nullable(), source: z.string(), occurredAt: z.string(),
  })),
  nextCursor: z.string().nullable(),
});
const cursorSchema = z.object({ occurredAt: z.string().datetime(), id: z.string().min(1).max(200) }).strict();

export async function readTimeline(input: z.infer<typeof readTimelineSchema>, workspaceId: string) {
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (input.cursor) {
    try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(input.cursor, "base64url").toString("utf8"))); }
    catch { throw new Error("Invalid timeline cursor. Start again without a cursor."); }
  }
  const actions = await db.action.findMany({
    where: { AND: [buildActionWhere({ ...input, agent: input.agentName }, workspaceId), ...(cursor ? [{ OR: [
      { occurredAt: { lt: new Date(cursor.occurredAt) } },
      { occurredAt: new Date(cursor.occurredAt), id: { lt: cursor.id } },
    ] }] : [])] },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: input.limit + 1,
    select: { id: true, agentId: true, agentName: true, verb: true, summary: true, category: true, status: true,
      system: true, objectType: true, objectName: true, project: true, externalId: true, value: true, currency: true,
      url: true, source: true, occurredAt: true },
  }).catch(() => { throw new Error("Could not read your timeline. Please try again."); });
  const page = actions.slice(0, input.limit), last = page.at(-1);
  return {
    actions: page.map(action => ({ ...action, occurredAt: action.occurredAt.toISOString() })),
    nextCursor: actions.length > input.limit && last
      ? Buffer.from(JSON.stringify({ occurredAt: last.occurredAt.toISOString(), id: last.id })).toString("base64url") : null,
  };
}
