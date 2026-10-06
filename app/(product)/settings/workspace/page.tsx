import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { WorkspaceManager } from "@/components/workspace-manager";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
export const dynamic = "force-dynamic";
export default async function WorkspaceSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const context = await getWorkspaceContext(typeof params.workspaceId === "string" ? params.workspaceId : undefined);
  if (!context?.user) redirect("/sign-in?next=%2Fsettings%2Fworkspace");
  if (context.workspace.kind === "personal") redirect("/workspaces");
  const [members, invitations, invitationCount] = await Promise.all([
    db.workspaceMember.findMany({ where: { workspaceId: context.workspace.id }, include: { user: { select: { name: true, email: true } } }, orderBy: [{ role: "desc" }, { joinedAt: "asc" }] }),
    context.role === "owner" ? db.workspaceInvitation.findMany({ where: { workspaceId: context.workspace.id, acceptedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true } }) : [],
    db.workspaceInvitation.count({ where: { workspaceId: context.workspace.id, acceptedAt: null, cancelledAt: null, expiresAt: { gt: new Date() } } }),
  ]);
  return <><Header product signedIn workspaceContext={context} /><main className="workspace-shell workspace-settings-shell"><section className="workspace-intro workspace-page-heading"><span className="kicker">Shared workspace</span><h1>{context.workspace.name + "."}</h1><p>One feed for the things your team’s assistants did.</p></section><WorkspaceManager key={context.workspace.id} workspace={context.workspace} owner={context.role === "owner"} members={members.map(member => ({ userId: member.userId, role: member.role, ...member.user }))} invitations={invitations} reservedSeats={members.length + invitationCount} /></main></>;
}
