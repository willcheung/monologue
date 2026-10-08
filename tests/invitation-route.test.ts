import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceError } from "@/lib/workspace-access";
const fixtures = vi.hoisted(() => ({ context: vi.fn(), invite: vi.fn(), email: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: fixtures.context }));
vi.mock("@/lib/workspace-service", () => ({ inviteWorkspaceMember: fixtures.invite, removeWorkspaceMember: vi.fn() }));
vi.mock("@/lib/invitation-email", () => ({ sendInvitationEmail: fixtures.email }));
import { POST } from "@/app/api/workspaces/members/route";
const request = (body: object) => new Request("https://example.test/api/workspaces/members", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.test", "x-monologue-workspace": "selected-team" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("BETTER_AUTH_URL", "https://configured.example.test");
  fixtures.context.mockResolvedValue({ user: { id: "owner", name: "Taylor" }, workspace: { id: "selected-team", name: "Studio" } });
  fixtures.invite.mockResolvedValue({ invitation: { id: "invite", email: "recipient@example.test" }, token: "a".repeat(43) });
  fixtures.email.mockResolvedValue("sent");
});
afterEach(() => vi.unstubAllEnvs());
describe("invitation creation and sending", () => {
  it("uses the checked workspace, actual inviter and configured origin rather than request-host or name inputs", async () => {
    const response = await POST(request({ email: "recipient@example.test" })); expect(response.status).toBe(201);
    const body = await response.json(); expect(body.emailStatus).toBe("sent"); expect(body.inviteUrl).toContain("https://configured.example.test/join?");
    expect(fixtures.context).toHaveBeenCalledWith("selected-team");
    expect(fixtures.invite).toHaveBeenCalledWith("selected-team", "owner", "recipient@example.test");
    expect(fixtures.email).toHaveBeenCalledWith({ invitationId: "invite", to: "recipient@example.test", inviterName: "Taylor", workspaceName: "Studio", inviteUrl: body.inviteUrl });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("preserves the valid invite and copy link if sending is unavailable or unconfirmed", async () => {
    for (const status of ["not_configured", "unconfirmed"]) {
      fixtures.email.mockResolvedValue(status);
      const response = await POST(request({ email: "recipient@example.test" }));
      expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ emailStatus: status, invitation: { id: "invite" } });
    }
  });
  it("never sends for unsigned, forged or full-workspace requests", async () => {
    fixtures.context.mockResolvedValueOnce(null); expect((await POST(request({ email: "recipient@example.test" }))).status).toBe(401);
    expect((await POST(request({ email: "recipient@example.test", inviterName: "Spoofed" }))).status).toBe(400);
    fixtures.invite.mockRejectedValue(new WorkspaceError("All places reserved", 409));
    expect((await POST(request({ email: "recipient@example.test" }))).status).toBe(409);
    expect(fixtures.email).not.toHaveBeenCalled();
  });
});
