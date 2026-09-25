import { redirect } from "next/navigation";
import { ApiKeyManager } from "@/components/api-key-manager";
import { Header } from "@/components/header";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AgentKeysPage() {
  if (!isCloudMode()) redirect("/welcome");
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in?next=%2Fsettings%2Fkeys");
  const keys = await db.apiKey.findMany({
    where: { workspaceId: context.workspace.id },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });
  const initialKeys = keys.map((key) => ({ ...key, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null, revokedAt: key.revokedAt?.toISOString() ?? null }));
  const hasActiveKey = keys.some((key) => !key.revokedAt);
  return <><Header product signedIn /><main className="settings-shell"><span className="kicker">Add agent</span><h1>{hasActiveKey ? "Connected agents." : "Add an agent."}</h1><p className="setup-lede">{hasActiveKey ? "See which agents can add actions to your feed and revoke access anytime." : "Give your agent one prompt to connect it to your private feed."}</p><ApiKeyManager initialKeys={initialKeys} /></main></>;
}
