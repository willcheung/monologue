"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceActivityButton({ workspaceId, agentId }: { workspaceId: string; agentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workspaces/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open this workspace.");
      router.push(`/feed?workspaceId=${encodeURIComponent(workspaceId)}&agentId=${encodeURIComponent(agentId)}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not open this workspace.");
    } finally {
      setBusy(false);
    }
  }
  return <div><button className="workspace-activity-button" disabled={busy} onClick={() => void open()}>View all activity</button>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
