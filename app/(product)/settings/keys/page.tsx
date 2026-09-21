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
  if (!context) redirect("/sign-in");
  const keys = await db.apiKey.findMany({
    where: { workspaceId: context.workspace.id },
    select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  });
  const initialKeys = keys.map((key) => ({ ...key, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null, revokedAt: key.revokedAt?.toISOString() ?? null }));
  return <><Header product signedIn /><main className="settings-shell"><span className="kicker">Settings</span><h1>Connect your agents.</h1><ApiKeyManager initialKeys={initialKeys} /></main></>;
}
