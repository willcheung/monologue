"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace-limits";
type Member = { userId: string; role: string; name: string; email: string };
type Invitation = { id: string; email: string };
export function WorkspaceManager({ workspace, members, invitations, owner, reservedSeats }: { workspace: { id: string; name: string; kind: string; plan: string }; members: Member[]; invitations: Invitation[]; owner: boolean; reservedSeats: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState(""); const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  async function mutate(url: string, body: object, method = "POST") {
    setBusy(true); setError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json", "x-monologue-workspace": workspace.id }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this change.");
      router.refresh(); return data;
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save this change."); return null; }
    finally { setBusy(false); }
  }
  const limit = WORKSPACE_MEMBER_LIMIT;
  return <div className="workspace-settings">
    {error && <p className="form-error" role="alert">{error}</p>}
    <>
      <section className="workspace-section"><div className="workspace-section-heading"><div><h2>Your people.</h2><p>Everyone here can see this workspace&apos;s reported activity.</p></div><span className="workspace-seat-count">{reservedSeats} / {limit} seats reserved</span></div>
        <div className="workspace-members">{members.map(member => <div key={member.userId} className="workspace-member"><span className="workspace-person-avatar" aria-hidden="true">{member.name.slice(0,1)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div><span className="workspace-member-role">{member.role === "owner" ? "Owner" : "Member"}</span>{owner && member.role !== "owner" && (removing === member.userId ? <div className="workspace-remove-confirm"><span>Remove access and disconnect their agents?</span><button className="quiet-button" disabled={busy} onClick={async () => { if (await mutate("/api/workspaces/members", { userId: member.userId }, "DELETE")) setRemoving(null); }}>Remove</button><button className="quiet-button" onClick={() => setRemoving(null)}>Cancel</button></div> : <button className="workspace-text-button" aria-label={`Remove ${member.name}`} disabled={busy} onClick={() => setRemoving(member.userId)}>Remove</button>)}</div>)}</div>
        {invitations.length > 0 && <div className="workspace-invitations"><h3>Waiting to join</h3>{invitations.map(invitation => <div className="workspace-pending" key={invitation.id}><span>{invitation.email}</span><small>Invited · seat reserved</small>{owner && <button className="workspace-text-button" disabled={busy} onClick={async () => { if (await mutate("/api/workspaces/invitations", { id: invitation.id }, "DELETE")) setInviteUrl(""); }}>Cancel invitation</button>}</div>)}</div>}
        {owner && <form className="workspace-inline-form" onSubmit={async event => { event.preventDefault(); const result = await mutate("/api/workspaces/members", { email }); if (result) { setInviteUrl(result.inviteUrl); setCopied(false); setEmail(""); } }}><label className="workspace-field">Invite by email<input type="email" required placeholder="teammate@example.com" value={email} onChange={event => setEmail(event.target.value)} /></label><button className="primary-button" disabled={busy || reservedSeats >= limit}>Create invite link</button></form>}
        {owner && reservedSeats >= limit && <p className="workspace-feature-note" role="status">All three places are reserved. Cancel an invitation or remove a member to invite someone else.</p>}
        {inviteUrl && <div className="workspace-invite-receipt"><p>Share this link with your teammate. It works only for their invited email and expires in seven days.</p><input aria-label="Invitation link" readOnly value={inviteUrl} /><button className="quiet-button" onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); } catch { setError("Select and copy the invitation link above."); } }}>{copied ? "Copied" : "Copy link"}</button><Link href={inviteUrl}>Open invitation</Link></div>}
      </section>
      <section className="workspace-section"><span className="kicker">Free workspace</span><h2>A small team, on us.</h2><p>Up to three people, including the owner. Pending invitations reserve a place.</p><Link className="quiet-button" href={`/recap?workspaceId=${encodeURIComponent(workspace.id)}&briefing=weekly`}>Get my weekly briefing →</Link></section>
    </>
  </div>;
}
