import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { WorkspaceInvitation } from "@/components/workspace-invitation";
import { InvitationAccountSwitch } from "@/components/invitation-account-switch";
import { getWorkspaceContext } from "@/lib/workspace";
import { getWorkspaceInvitationInfo, invitationToken } from "@/lib/workspace-invitation-info";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join a workspace", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const token = invitationToken(params.token);
  const invitation = await getWorkspaceInvitationInfo(token);
  const context = await getWorkspaceContext();
  if (!context?.user && invitation && !invitation.acceptedAt) redirect(`/sign-in?next=${encodeURIComponent(`/join?token=${token}`)}`);
  const matches = Boolean(context?.user && invitation && context.user.email.toLowerCase() === invitation.email.toLowerCase());
  if (matches && invitation?.acceptedAt && context?.workspaces.some(workspace => workspace.id === invitation.workspace.id)) redirect(`/feed?workspaceId=${encodeURIComponent(invitation.workspace.id)}`);
  const valid = invitation && !invitation.acceptedAt && token;
  return <><Header product={Boolean(context?.user)} signedIn={Boolean(context?.user)} workspaceContext={context ?? undefined} /><main className="connection-shell"><div className="connection-card">{valid && context?.user ? <>
    <span className="kicker">You’re invited</span>
    <h1>{invitation.invitedByUser.name || "Your teammate"} invited you to {invitation.workspace.name}.</h1>
    <p>See what your team’s AI assistants changed, in one shared feed. Your personal feed stays private.</p>
    {matches ? <><p>You’re joining as <strong>{context.user.email}</strong>.</p><WorkspaceInvitation token={token} /></> : <>
      <p role="alert">This invitation is for <strong>{invitation.email}</strong>. You’re signed in as <strong>{context.user.email}</strong>.</p>
      <InvitationAccountSwitch token={token} />
    </>}
  </> : <><h1>This invitation is unavailable.</h1><p>It may have expired, been cancelled, or already been used. Ask the person who invited you for a new link.</p></>}
    <Link className="connection-cancel" href={context?.user ? "/feed" : "/"}>{context?.user ? "Back to your feed" : "Back home"}</Link>
  </div></main></>;
}
