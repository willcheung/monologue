"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ListedWorkspace = {
  id: string;
  name: string;
  kind: string;
  plan: string;
  role: string;
  memberCount: number;
};

export function WorkspaceList({ workspaces }: { workspaces: ListedWorkspace[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(url: string, body: object, destination: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update your workspaces.");
      router.push(destination);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update your workspaces.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <form id="workspace-create" className="workspace-inline-form workspace-create-form" onSubmit={event => {
      event.preventDefault();
      void change("/api/workspaces", { name }, "/settings/workspace");
    }}>
      <label className="workspace-field">Workspace name
        <input required maxLength={80} placeholder="e.g. Studio team" value={name} onChange={event => setName(event.target.value)} disabled={busy} />
      </label>
      <button className="primary-button" disabled={busy}>Create workspace</button>
    </form>
    <p className="workspace-feature-note">Create as many as you need. Each shared workspace starts free for up to three people.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <ul className="workspace-list" aria-label="Your workspaces">
      {workspaces.map(workspace => <li key={workspace.id} className="workspace-list-row">
        <div>
          <div className="workspace-list-title"><h2>{workspace.kind === "personal" ? "Personal" : workspace.name}</h2><span className="workspace-plan">{workspace.kind === "personal" ? "Private" : "Shared"}</span></div>
          <p>{workspace.kind === "personal" ? "Just for you" : `${workspace.memberCount} ${workspace.memberCount === 1 ? "person" : "people"} · ${workspace.role === "owner" ? "Owner" : "Member"}`}</p>
        </div>
        <div className="workspace-list-actions"><button className="quiet-button" disabled={busy} aria-label={`Open ${workspace.kind === "personal" ? "Personal" : workspace.name}`} onClick={() => void change("/api/workspaces/select", { workspaceId: workspace.id }, `/feed?workspaceId=${encodeURIComponent(workspace.id)}`)}>Open workspace <span aria-hidden="true">→</span></button>{workspace.kind === "shared" && <Link href={`/settings/workspace?workspaceId=${encodeURIComponent(workspace.id)}`} aria-label={`Settings for ${workspace.name}`}>Settings</Link>}</div>
      </li>)}
    </ul>
  </>;
}
