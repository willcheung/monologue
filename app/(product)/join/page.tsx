import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { WorkspaceInvitation } from "@/components/workspace-invitation";
import { getWorkspaceContext } from "@/lib/workspace";
import { hashInvitation } from "@/lib/workspace-service";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join a workspace", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams; const token = typeof params.token === "string" && params.token.length <= 128 ? params.token : "";
  const context = await getWorkspaceContext();
  if (!context?.user) redirect(`/sign-in?next=${encodeURIComponent(`/join?token=${token}`)}`);
  const invitation = token ? await db.workspaceInvitation.findUnique({ where: { tokenHash: hashInvitation(token) }, include: { workspace: true } }) : null;
  const valid = invitation && !invitation.cancelledAt && invitation.expiresAt > new Date();
  return <><Header product signedIn workspaceContext={context} /><main className="connection-shell"><div className="connection-card">{valid ? <><span className="kicker">You&apos;re invited</span><h1>Join {invitation.workspace.name}?</h1><p>You&apos;ll see this workspace&apos;s reported activity. Your personal feed stays private.</p><p>Invitation for <strong>{invitation.email}</strong>. You&apos;re trying as <strong>{context.user.email}</strong>.</p><WorkspaceInvitation token={token} /></> : <><h1>This invitation is unavailable.</h1><p>Ask the workspace owner for a new link.</p></>}<Link className="connection-cancel" href="/feed">Back to your feed</Link></div></main></>;
}
