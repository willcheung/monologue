import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiKeyManager } from "@/components/api-key-manager";
import { Header } from "@/components/header";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  const cloud = isCloudMode();
  const initialKeys = cloud ? await db.apiKey.findMany({
    where: { workspaceId: context.workspace.id },
    select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    orderBy: { createdAt: "desc" },
  }) : [];
  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="setup-shell">
      <span className="kicker">Connect your first agent</span>
      <h1>{cloud ? `Welcome${context.user?.name ? `, ${context.user.name.split(" ")[0]}` : ""}.` : "Your local feed is ready."}</h1>
      <p className="setup-lede">Connect each agent once. It will securely remember its key and report future actions automatically.</p>
      {cloud ? <ApiKeyManager onboarding initialKeys={initialKeys.map((key) => ({ ...key, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null, revokedAt: key.revokedAt?.toISOString() ?? null }))} /> : <div className="local-setup">
        <div className="step-number">1</div><h2>Use your local API key</h2>
        <p>Your key is the <code>MONOLOGUE_API_KEY</code> value in this project&apos;s <code>.env</code> file.</p>
      </div>}
      <div className="setup-step"><div className="step-number">2</div><h2>Connect securely—once</h2><p>Add the key as <code>MONOLOGUE_API_KEY</code> through your agent&apos;s Connect or secrets screen. The agent should remember it until you revoke the key. Never paste it into regular chat.</p></div>
      <div className="setup-step"><div className="step-number">3</div><h2>Let the first action arrive</h2><p>The skill reports only external state changes. Research, browsing, drafts, and internal work stay out of your feed.</p></div>
      <Link className="primary-button" href="/feed">Open my feed →</Link>
    </main>
  </>;
}
