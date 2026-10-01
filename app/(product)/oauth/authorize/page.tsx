import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getWorkspaceContext } from "@/lib/workspace";
import { isCloudMode } from "@/lib/runtime";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, hasApiScope } from "@/lib/api-keys";
import { approveOAuthConnection, authorizationRedirect, mcpEnabled, validateAuthorization } from "@/lib/mcp-oauth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connect Monologue", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function OAuthAuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const input = await searchParams;
  let validated;
  try { if (!mcpEnabled() || !isCloudMode()) throw new Error(); validated = await validateAuthorization(input); }
  catch { return <><Header /><main className="connection-shell"><div className="connection-card"><h1>This connection link is unavailable.</h1><p>Start the connection again from your agent.</p><Link href="/">Back to Monologue</Link></div></main></>; }
  const { params, client } = validated;
  const canRead = hasApiScope({ scopes: params.scope }, ACTION_READ_SCOPE);
  const canWrite = hasApiScope({ scopes: params.scope }, ACTION_WRITE_SCOPE);
  const context = await getWorkspaceContext();
  if (!context?.user) {
    const next = `/oauth/authorize?${new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string")).toString()}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  async function consent(form: FormData) {
    "use server";
    if (!mcpEnabled()) throw new Error("Connection unavailable");
    const session = await getWorkspaceContext();
    if (!session?.user) redirect("/sign-in");
    const checked = await validateAuthorization(params);
    if (form.get("decision") !== "approve") redirect(authorizationRedirect(checked.params, { error: "access_denied" }));
    redirect(await approveOAuthConnection(checked.params, session.workspace.id, session.user.id));
  }
  return <><Header product signedIn /><main className="connection-shell"><div className="connection-card">
    <span className="kicker">Connect your agent</span><h1>Connect {client.name}?</h1>
    {canRead ? <p>This connection can <strong>read your entire private timeline</strong>, including actions reported by your other agents.{canWrite ? " It can also add actions to your feed." : " It cannot add actions."} It cannot act in your other apps.</p>
      : <p>This connection can add actions to your private feed. It cannot read your feed or act in your other apps.</p>}
    <p>Connecting to <strong>{context.workspace.name}</strong>.</p>
    <p>Client name supplied by the app; not verified by Monologue. After approval, you’ll return to <strong>{new URL(params.redirect_uri).host}</strong>.</p>
    <p>You can revoke access anytime in Connected agents.</p>
    <form action={consent} className="secret-actions"><button className="primary-button" name="decision" value="approve">Connect agent</button><button className="quiet-button" name="decision" value="deny">Cancel</button></form>
  </div></main></>;
}
