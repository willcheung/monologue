import { z } from "zod";
import { CATEGORIES, SOURCES, STATUSES } from "./constants";

const optionalTrimmed = z.string().trim().min(1).max(500).optional();

export const actionInputSchema = z.object({
  agentName: z.string().trim().min(1).max(100),
  agentId: optionalTrimmed,
  verb: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(1000),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES),
  system: z.string().trim().min(1).max(100),
  objectType: optionalTrimmed,
  objectName: optionalTrimmed,
  project: optionalTrimmed,
  externalId: optionalTrimmed,
  value: z.number().finite().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
  url: z.string().url().max(2048).optional(),
  source: z.enum(SOURCES).default("self_reported"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
}).strict();

export type ActionInput = z.infer<typeof actionInputSchema>;

export function attributeSelfReportedAction(input: ActionInput, agent: { id: string; name: string }): ActionInput {
  return { ...input, agentId: agent.id, agentName: agent.name, source: "self_reported" };
}
