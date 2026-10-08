import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildInvitationEmail, sendInvitationEmail } from "@/lib/invitation-email";
const input = { invitationId: "fixture-invitation", to: "teammate@example.test", inviterName: "Taylor", workspaceName: "Studio", inviteUrl: `https://example.test/join?token=${"a".repeat(43)}` };
beforeEach(() => { vi.stubEnv("MONOLOGUE_WORKSPACE_DEV", "0"); vi.stubEnv("RESEND_API_KEY", "test-only-key"); vi.stubEnv("MONOLOGUE_EMAIL_FROM", "Monologue <support@example.test>"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("workspace invitation email", () => {
  it("identifies the inviter and workspace, escapes user text and has the same join destination", () => {
    const email = buildInvitationEmail({ ...input, inviterName: 'Taylor <script>\nExample', workspaceName: 'Studio & "team"' });
    expect(email.subject).toContain('Taylor <script> Example invited you');
    expect(email.html).not.toContain("<script>"); expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Studio &amp; &quot;team&quot;"); expect(email.text).toContain(input.inviteUrl);
    expect(email.html).toContain(`href="${input.inviteUrl}"`); expect(email.text).toContain("personal feed stays private");
    expect(email.text).toContain("seven days");
    expect(() => buildInvitationEmail({ ...input, inviteUrl: "http://example.test/join?token=fixture" })).toThrow("secure");
    expect(() => buildInvitationEmail({ ...input, inviteUrl: "https://secret@example.test/join?token=fixture" })).toThrow("secure");
  });
  it("uses one stable idempotency key and confirms only an accepted provider receipt", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: "provider-email-id" })); vi.stubGlobal("fetch", fetch);
    expect(await sendInvitationEmail(input)).toBe("sent");
    const [url, request] = fetch.mock.calls[0]; expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers["Idempotency-Key"]).toBe("workspace-invitation/fixture-invitation");
    expect(JSON.parse(request.body)).toMatchObject({ to: [input.to], from: "Monologue <support@example.test>", subject: "Taylor invited you to Studio on Monologue" });
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });
  it("never sends without configuration or from the isolated local sample environment", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendInvitationEmail(input)).toBe("not_configured");
    vi.stubEnv("RESEND_API_KEY", "test-only-key"); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("MONOLOGUE_WORKSPACE_DEV", "1");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3100"); vi.stubEnv("DATABASE_URL", "file:fixture.db"); vi.stubEnv("TURSO_DATABASE_URL", ""); vi.stubEnv("TURSO_AUTH_TOKEN", ""); vi.stubEnv("VERCEL", "");
    expect(await sendInvitationEmail(input)).toBe("not_configured"); expect(fetch).not.toHaveBeenCalled();
  });
  it("does not claim success for rejection, an incomplete receipt or a timeout", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ message: "private provider detail" }, { status: 429 })).mockResolvedValueOnce(Response.json({})).mockRejectedValueOnce(new Error("timeout")); vi.stubGlobal("fetch", fetch);
    for (let i = 0; i < 3; i++) expect(await sendInvitationEmail(input)).toBe("unconfirmed");
  });
});
