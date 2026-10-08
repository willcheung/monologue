"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WorkspaceInvitation({ token }: { token: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <><button className="primary-button" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { const response = await fetch("/api/workspaces/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); router.push(`/feed?workspaceId=${encodeURIComponent(body.workspaceId)}`); router.refresh(); } catch (error) { setError(error instanceof Error ? error.message : "Could not join this workspace."); setBusy(false); } }}>{busy ? "Joining…" : "Join workspace"}</button>{error && <p className="form-error" role="alert">{error}</p>}</>;
}
