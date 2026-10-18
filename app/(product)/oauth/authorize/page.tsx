import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";
import { getWorkspaceContext } from "@/lib/workspace";
import { isCloudMode } from "@/lib/runtime";
import { ACTION_READ_SCOPE, ACTION_WRITE_SCOPE, hasApiScope } from "@/lib/api-keys";
import { createOAuthConnectionApproval, authorizationRedirect, mcpEnabled, validateAuthorization } from "@/lib/mcp-oauth";

import { OAuthConsent } from "@/components/oauth-consent";
import { isNativeCallback, type OAuthConsentResult } from "@/lib/oauth-completion";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connect Monologue", robots: { index: false, follow: false }, referrer: "same-origin" };
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
  async function consent(_previous: OAuthConsentResult, form: FormData): Promise<OAuthConsentResult> {
    "use server";
    if (!mcpEnabled() || !isCloudMode()) return { error: "This connection is unavailable. Start again from your agent." };
    const session = await getWorkspaceContext();
    if (!session?.user) return { error: "Your sign-in expired. Sign in again, then reconnect from your agent." };
    let destination: string;
    try {
      const checked = await validateAuthorization(params);
      if (form.get("decision") === "deny") destination = authorizationRedirect(checked.params, { error: "access_denied" });
      else {
        if (form.get("decision") !== "approve") return { error: "Choose Connect agent to approve this connection." };
        const workspaceId = form.get("workspaceId");
        if (typeof workspaceId !== "string" || !session.workspaces.some(workspace => workspace.id === workspaceId))
          return { error: "That workspace is unavailable. Choose a workspace you belong to." };
        const result = await createOAuthConnectionApproval(checked.params, workspaceId, session.user.id);
        if (isNativeCallback(checked.params.redirect_uri)) return result;
        destination = result.redirectUrl;
      }
    } catch {
      return { error: "We couldn’t finish this connection. Please try again. If it keeps happening, start a new connection from your agent." };
    }
    redirect(destination);
  }
  return <><Header product signedIn workspaceContext={context} /><main className="connection-shell"><div className="connection-card">
    <OAuthConsent action={consent} nativeCallback={isNativeCallback(params.redirect_uri)}
      workspaceId={context.workspace.id} workspaces={context.workspaces}>
    <span className="kicker">Connect your agent</span><h1>Connect {client.name}?</h1>
    {canRead ? <p>This agent can <strong>read this workspace’s full feed</strong>{canWrite ? " and add reports." : "."}</p>
      : <p>This agent can <strong>add reports to this workspace</strong>.</p>}
    <p>You can revoke access anytime.</p>
    </OAuthConsent>
  </div></main></>;
}
