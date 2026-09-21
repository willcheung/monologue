"use client";

import Link from "next/link";
import { useState } from "react";

export function AgentConnectionApproval({
  requestId,
  approvalCode,
  agentName,
  platform,
}: {
  requestId: string;
  approvalCode: string;
  agentName: string;
  platform?: string | null;
}) {
  const [state, setState] = useState<"ready" | "working" | "connected">("ready");
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setState("working");
    setError(null);
    const response = await fetch("/api/connect/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, approvalCode }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Could not connect this agent");
      setState("ready");
      return;
    }
    window.history.replaceState({}, "", "/connect?connected=1");
    setState("connected");
  }

  if (state === "connected") {
    return <div className="connection-card connection-success">
      <span className="connection-icon" aria-hidden="true">✓</span>
      <h1>{agentName} is connected.</h1>
      <p>You&apos;re done. The key was sent securely to your agent and was never shown here.</p>
      <Link className="primary-button" href="/feed">Open your feed</Link>
    </div>;
  }

  return <div className="connection-card">
    <span className="kicker">Connect an agent</span>
    <h1>Connect {agentName} to your feed?</h1>
    <p>Monologue will create a private connection key and send it directly to this agent. You won&apos;t need to copy or paste anything.</p>
    <div className="connection-note"><strong>{agentName}{platform ? ` · ${platform}` : ""} will be able to:</strong><span>Add actions to your private Monologue feed. It cannot read the feed.</span></div>
    {error && <p className="form-error">{error}</p>}
    <button className="primary-button connection-approve" type="button" onClick={approve} disabled={state === "working"}>
      {state === "working" ? "Connecting…" : `Connect ${agentName}`}
    </button>
    <Link className="connection-cancel" href="/feed">Cancel</Link>
  </div>;
}
