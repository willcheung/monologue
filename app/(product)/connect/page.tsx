import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentConnectionApproval } from "@/components/agent-connection-approval";
import { Header } from "@/components/header";
import { getAgentConnectionForApproval } from "@/lib/agent-connections";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function ConnectPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isCloudMode()) redirect("/feed");
  const params = await searchParams;
  const requestId = valueOf(params.request);
  const approvalCode = valueOf(params.code);
  const connection = requestId && approvalCode
    ? await getAgentConnectionForApproval(requestId, approvalCode)
    : null;

  if (!connection || connection.expiresAt <= new Date()) {
    return <><Header /><main className="connection-shell"><div className="connection-card"><span className="kicker">Connection link</span><h1>This link is no longer valid.</h1><p>Ask your agent to start the Monologue connection again. New links expire after ten minutes.</p><Link className="primary-button" href="/">Back to Monologue</Link></div></main></>;
  }

  const context = await getWorkspaceContext();
  if (!context) {
    const next = `/connect?request=${encodeURIComponent(requestId)}&code=${encodeURIComponent(approvalCode)}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (connection.workspaceId && connection.workspaceId !== context.workspace.id) {
    return <><Header product signedIn /><main className="connection-shell"><div className="connection-card"><span className="kicker">Connection link</span><h1>This link is no longer valid.</h1><p>Ask your agent to start the Monologue connection again.</p><Link className="primary-button" href="/feed">Open your feed</Link></div></main></>;
  }

  if (connection.status === "claimed") {
    return <><Header product signedIn /><main className="connection-shell"><div className="connection-card connection-success"><span className="connection-icon" aria-hidden="true">✓</span><h1>{connection.agentName} is already connected.</h1><p>The agent has securely received its connection key.</p><Link className="primary-button" href="/feed">Open your feed</Link></div></main></>;
  }

  return <><Header product signedIn /><main className="connection-shell"><AgentConnectionApproval requestId={requestId} approvalCode={approvalCode} agentName={connection.agentName} /></main></>;
}
