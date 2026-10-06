import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { WorkspaceList } from "@/components/workspace-list";
import { db } from "@/lib/db";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  if (!isCloudMode()) redirect("/feed");
  const context = await getWorkspaceContext();
  if (!context?.user) redirect("/sign-in?next=%2Fworkspaces");
  const userId = context.user.id;
  const counts = await db.workspaceMember.groupBy({
    by: ["workspaceId"],
    where: { workspaceId: { in: context.workspaces.map(workspace => workspace.id) } },
    _count: { _all: true },
  });
  const memberCounts = new Map(counts.map(count => [count.workspaceId, count._count._all]));
  const workspaces = context.workspaces.map(workspace => ({
    id: workspace.id,
    name: workspace.name,
    kind: workspace.kind,
    plan: workspace.plan,
    role: workspace.ownerId === userId ? "owner" : "member",
    memberCount: memberCounts.get(workspace.id) ?? 0,
  }));

  return <>
    <Header product signedIn />
    <main className="workspace-shell workspace-settings-shell">
      <header className="workspace-intro workspace-page-heading">
        <h1>Workspaces.</h1>
        <p>Your personal space and every team you belong to.</p>
      </header>
      <WorkspaceList workspaces={workspaces} />
    </main>
  </>;
}
