"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

type Workspace = { id: string; name: string; kind: string };
const workspaceName = (workspace: Workspace) => workspace.kind === "personal" ? "Personal" : workspace.name;

export function WorkspaceMenu({ workspace, workspaces, email, dev, userId }: { workspace: Workspace; workspaces: Workspace[]; email?: string; dev: boolean; userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const workspacePath = ["/agents", "/recap", "/settings/keys"].includes(pathname) ? pathname : "/feed";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  async function change(url: string, body: object, destination: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not switch workspace.");
      setOpen(false);
      router.push(destination);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not switch workspace.");
    } finally { setBusy(false); }
  }

  return <div className="workspace-menu" ref={container} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }}>
    <button ref={trigger} className="workspace-menu-trigger" type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
      Workspaces <ChevronDown size={14} aria-hidden="true" />
    </button>
    {open && <section className="workspace-menu-panel" id={panelId} aria-label="Workspace chooser">
      <div className="workspace-menu-current">
        <span className="workspace-menu-avatar" aria-hidden="true">{workspaceName(workspace).slice(0, 1).toUpperCase()}</span>
        <div><strong>{workspaceName(workspace)}</strong><span>{workspace.kind === "personal" ? "Private · Just for you" : "Shared workspace"}</span></div>
      </div>
      {email && <p className="workspace-menu-email">{email}</p>}
      <ul className="workspace-menu-list" aria-label="Switch workspace" aria-busy={busy}>
        {workspaces.map(item => <li key={item.id}>
          <button type="button" disabled={busy} aria-current={item.id === workspace.id ? "true" : undefined} onClick={() => void change("/api/workspaces/select", { workspaceId: item.id }, `${workspacePath}?workspaceId=${encodeURIComponent(item.id)}`)}>
            <span className="workspace-menu-avatar" aria-hidden="true">{workspaceName(item).slice(0, 1).toUpperCase()}</span>
            <span className="workspace-menu-name">{workspaceName(item)}<small>{item.kind === "personal" ? "Private" : "Shared"}</small></span>
            {item.id === workspace.id && <Check size={18} className="workspace-menu-check" aria-label="Selected" />}
          </button>
        </li>)}
      </ul>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="workspace-menu-actions">
        <Link href="/workspaces#workspace-create" onClick={() => setOpen(false)}><Plus size={18} aria-hidden="true" /> Create workspace</Link>
        <Link href="/workspaces" onClick={() => setOpen(false)}>View all workspaces <span aria-hidden="true">→</span></Link>
      </div>
      {!dev && <div className="workspace-menu-footer"><SignOutButton /></div>}
      {dev && <div className="workspace-menu-preview"><small>Local preview · sample data</small><label>Try as <select aria-label="Sample account" value={userId} disabled={busy} onChange={event => void change("/api/workspaces/dev", { userId: event.target.value }, "/feed")}><option value="dev-owner">Alex (owner)</option><option value="dev-maya">Maya (member)</option><option value="dev-leo">Leo (invitee)</option><option value="dev-sam">Sam (outside the team)</option></select></label></div>}
    </section>}
  </div>;
}
