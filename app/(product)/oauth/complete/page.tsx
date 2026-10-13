import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { OAuthCompletion } from "@/components/oauth-completion";
import { getWorkspaceContext } from "@/lib/workspace";
import { getOAuthConnectionStatus, mcpEnabled } from "@/lib/mcp-oauth";
import { isCloudMode } from "@/lib/runtime";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agent connection · Monologue", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function OAuthCompletePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const id = typeof params.connection === "string" ? params.connection : "";
  const context = await getWorkspaceContext();
  if (!context?.user) redirect(`/sign-in?next=${encodeURIComponent(`/oauth/complete?connection=${encodeURIComponent(id)}`)}`);
  let status = mcpEnabled() && isCloudMode() ? await getOAuthConnectionStatus(id, context.user.id) : null;
  const destinationContext = status ? await getWorkspaceContext(status.workspaceId) : context;
  if (!destinationContext) status = null;
  return <><Header product signedIn workspaceContext={destinationContext ?? context} /><main className="connection-shell"><div className="connection-card">
    {status ? <OAuthCompletion connectionId={id} initial={status} /> : <><h1>This connection is unavailable.</h1><p>Return to your agent and start the connection again.</p><Link className="primary-button" href="/settings/keys">Back to Add agent</Link></>}
  </div></main></>;
}
