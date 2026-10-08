import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { inviteWorkspaceMember, removeWorkspaceMember } from "@/lib/workspace-service";
import { requireSameOrigin, workspaceFailure, workspaceJson } from "@/lib/workspace-http";
import { sendInvitationEmail } from "@/lib/invitation-email";
import { mcpIssuer } from "@/lib/mcp-oauth";
const invite = z.object({ email: z.email().max(254) }).strict();
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext(request.headers.get("x-monologue-workspace") ?? undefined);
    if (!context?.user) return workspaceJson({ error: "Sign in to invite someone." }, 401);
    const parsed = invite.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return workspaceJson({ error: "Enter a valid email address." }, 400);
    const origin = mcpIssuer();
    const { invitation, token } = await inviteWorkspaceMember(context.workspace.id, context.user.id, parsed.data.email);
    const inviteUrl = new URL(`/join?token=${token}`, origin).toString();
    const emailStatus = await sendInvitationEmail({ invitationId: invitation.id, to: invitation.email, inviterName: context.user.name, workspaceName: context.workspace.name, inviteUrl });
    return workspaceJson({ invitation: { id: invitation.id, email: invitation.email }, inviteUrl, emailStatus }, 201);
  } catch (error) { return workspaceFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const context = await getWorkspaceContext(request.headers.get("x-monologue-workspace") ?? undefined);
    if (!context?.user) return workspaceJson({ error: "Sign in to manage members." }, 401);
    const body = await request.json().catch(() => null);
    if (typeof body?.userId !== "string") return workspaceJson({ error: "Choose a member." }, 400);
    await removeWorkspaceMember(context.workspace.id, context.user.id, body.userId);
    return workspaceJson({ success: true });
  } catch (error) { return workspaceFailure(error); }
}
