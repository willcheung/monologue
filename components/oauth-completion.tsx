"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import type { OAuthConnectionStatus } from "@/lib/oauth-completion";

export function OAuthCompletion({ connectionId, initial, callbackUrl, callbackWindow }: {
  connectionId: string; initial?: OAuthConnectionStatus;
  callbackUrl?: string; callbackWindow?: RefObject<Window | null>;
}) {
  const [status, setStatus] = useState(initial);
  const [problem, setProblem] = useState(false);
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [handoffNeeded, setHandoffNeeded] = useState(false);
  const connectionState = status?.state;
  useEffect(() => {
    if (connectionState && connectionState !== "pending") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const started = Date.now();
    async function check() {
      // Callback recovery must work even while the receipt service is unavailable.
      setHandoffNeeded(!callbackWindow?.current || callbackWindow.current.closed);
      try {
        const response = await fetch(`/api/connect/oauth-status?connection=${encodeURIComponent(connectionId)}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error("Unavailable");
        const next: OAuthConnectionStatus = await response.json();
        if (stopped) return;
        setStatus(next); setProblem(false);
        if (next.state !== "pending") {
          if (next.state === "connected") {
            callbackWindow?.current?.close();
            window.focus();
            // Next handles history updates as navigation. Do this only AFTER
            // closing our callback window, before that reference is unmounted.
            window.history.replaceState(null, "", `/oauth/complete?connection=${encodeURIComponent(connectionId)}`);
          }
          return;
        }
      } catch { if (!stopped) setProblem(true); }
      if (stopped) return;
      if (Date.now() - started > 15_000) setSlow(true);
      // Bound background traffic. Reloading the receipt checks again without
      // issuing another grant or replaying a single-use authorization code.
      if (Date.now() - started < 300_000) timer = setTimeout(check, 1500);
      else setSlow(true);
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [connectionId, connectionState, callbackWindow, retry]);
  const connected = status?.state === "connected";
  const ended = status?.state === "expired" || status?.state === "revoked";
  const feed = `/feed?workspaceId=${encodeURIComponent(status?.workspaceId ?? "")}`;
  return <section className={`oauth-completion${connected ? " connection-success" : ""}`} aria-live="polite" aria-atomic="true">
    {connected && <span className="connection-icon" aria-hidden="true">✓</span>}
    <h1>{connected ? `${status.agentName} is connected.` : ended ? "Let’s reconnect your agent." : "Finishing your connection…"}</h1>
    {connected ? <>
      <p>Connected to <strong>{status.workspaceName}</strong>. You can return to your agent.</p>
      <p>{status.canRead && status.canWrite ? "Your agent can read this feed and add reports." : status.canRead ? "Your agent can read this feed." : "Your agent can add reports to this feed."}
        {status.canWrite && " Its next reported action will appear here."}</p>
      <Link className="primary-button" href={feed}>Open your feed</Link>
      <p className="connection-next">You can revoke access anytime in Agent connections.</p>
    </> : ended ? <>
      <p>{status.state === "revoked" ? "This connection’s access was revoked." : "The connection wasn’t completed before the link expired."} Return to your agent and start the connection again.</p>
      <Link className="primary-button" href={`/settings/keys?workspaceId=${encodeURIComponent(status.workspaceId)}`}>Back to Add agent</Link>
    </> : <>
      <p>{problem ? "We couldn’t check the connection just now. We’ll keep trying." : "Your approval is saved. We’re waiting for your agent to finish signing in."}</p>
      {callbackUrl && handoffNeeded && <a className="primary-button" href={callbackUrl} target="_blank" rel="noopener noreferrer">Finish connecting</a>}
      {slow && <p>Still waiting? Return to your agent and check that sign-in is still open. If it has stopped, start a new connection there.</p>}
      {(slow || problem) && <button className="quiet-button" onClick={() => { setSlow(false); setRetry(value => value + 1); }}>Check again</button>}
      <p className="connection-next">This page will confirm when the connection is ready.</p>
      {callbackUrl && <Link className="connection-cancel" href={`/oauth/complete?connection=${encodeURIComponent(connectionId)}`}>View connection status</Link>}
    </>}
  </section>;
}
