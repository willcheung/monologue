import { PrismaClient } from "@prisma/client";
import { resolve } from "node:path";
const expected = `file:${resolve("prisma/workspace-dev.db")}`;
if (process.env.MONOLOGUE_WORKSPACE_DEV !== "1" || process.env.DATABASE_URL !== expected || process.env.TURSO_DATABASE_URL || process.env.TURSO_AUTH_TOKEN) throw new Error("Workspace development seed requires its isolated local database.");
const db = new PrismaClient({ datasourceUrl: expected });
try {
  const people = [{ id: "dev-owner", name: "Alex", email: "alex@example.test" }, { id: "dev-maya", name: "Maya", email: "maya@example.test" }, { id: "dev-leo", name: "Leo", email: "leo@example.test" }, { id: "dev-sam", name: "Sam", email: "sam@example.test" }];
  for (const person of people) {
    await db.user.upsert({ where: { id: person.id }, update: {}, create: { ...person, emailVerified: true } });
    await db.workspace.upsert({ where: { id: `${person.id}-personal` }, update: {}, create: { id: `${person.id}-personal`, name: "Personal", ownerId: person.id, personalOwnerId: person.id, members: { create: { userId: person.id, role: "owner" } } } });
  }
  await db.workspace.upsert({ where: { id: "dev-studio" }, update: { plan: "free" }, create: { id: "dev-studio", name: "Studio team", kind: "shared", ownerId: "dev-owner", members: { create: [{ userId: "dev-owner", role: "owner" }, { userId: "dev-maya", role: "member" }] } } });
  const agents = [{ id: "dev-personal-agent", workspaceId: "dev-owner-personal", connectedByUserId: "dev-owner" }, { id: "dev-alex-agent", workspaceId: "dev-studio", connectedByUserId: "dev-owner" }, { id: "dev-maya-agent", workspaceId: "dev-studio", connectedByUserId: "dev-maya" }];
  for (const agent of agents) await db.agent.upsert({ where: { id: agent.id }, update: {}, create: { ...agent, name: "Codex", platform: "Codex" } });
  const examples = [
    { id: "dev-action-personal", agentId: "dev-personal-agent", workspaceId: "dev-owner-personal", reportedByUserId: "dev-owner", verb: "Booked", summary: "Booked a table for Saturday dinner.", category: "reservation", system: "Restaurant", status: "completed" },
    { id: "dev-action-alex", agentId: "dev-alex-agent", workspaceId: "dev-studio", reportedByUserId: "dev-owner", verb: "Sent", summary: "Sent the approved proposal to the client.", category: "communication", system: "Email", status: "completed" },
    { id: "dev-action-maya", agentId: "dev-maya-agent", workspaceId: "dev-studio", reportedByUserId: "dev-maya", verb: "Published", summary: "Published the new collection on the live store.", category: "other", system: "Shopify", status: "completed" },
    { id: "dev-action-pending", agentId: "dev-maya-agent", workspaceId: "dev-studio", reportedByUserId: "dev-maya", verb: "Submitted", summary: "Submitted the customer refund; settlement is pending.", category: "finance", system: "Stripe", status: "pending" },
  ];
  for (const [index, example] of examples.entries()) {
    const activity = { occurredAt: new Date(Date.now()-(index+1)*3600000), project: example.workspaceId === "dev-studio" ? "Autumn launch" : null };
    await db.action.upsert({ where: { id: example.id }, update: activity, create: { ...example, ...activity, agentName: "Codex", source: "self_reported" } });
  }
  console.log("Local sample accounts and workspaces ready. No production data loaded.");
} finally { await db.$disconnect(); }
