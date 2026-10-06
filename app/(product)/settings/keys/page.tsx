import { notFound, redirect } from "next/navigation";
import { ApiKeyManager } from "@/components/api-key-manager";
import { Header } from "@/components/header";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";
import { db } from "@/lib/db";
import { mcpEnabled, mcpIssuer } from "@/lib/mcp-oauth";
import { workspaceSetupPrompt } from "@/lib/setup-prompt";

export const dynamic = "force-dynamic";

export default async function AgentKeysPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isCloudMode()) redirect("/welcome");
  const params = await searchParams;
  let context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Fsettings%2Fkeys");
  if (typeof params.workspaceId === "string" && params.workspaceId !== context.workspace.id) {
    context = await getWorkspaceContext(params.workspaceId);
    if (!context) notFound();
  }
  const keys = await db.apiKey.findMany({
    where: { workspaceId: context.workspace.id, ...(context.role !== "owner" && { createdByUserId: context.user?.id }) },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });
  const initialKeys = keys.map((key) => ({ ...key, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null, revokedAt: key.revokedAt?.toISOString() ?? null }));
  const workspaceName = context.workspace.kind === "personal" ? "Personal" : context.workspace.name;
  const setupPrompt = workspaceSetupPrompt({ origin: mcpIssuer(), workspace: { id: context.workspace.id, name: workspaceName }, mcpEnabled: mcpEnabled() });
  return <><Header product signedIn workspaceContext={context} /><main className="settings-shell"><span className="kicker">{workspaceName}</span><h1>Add an agent.</h1><p className="setup-lede">Connect your agent to <strong>{workspaceName}</strong>. Choose this workspace when you approve.</p><ApiKeyManager key={context.workspace.id} workspaceId={context.workspace.id} initialKeys={initialKeys} setupPrompt={setupPrompt} /></main></>;
}
