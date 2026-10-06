import React, { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({ context: vi.fn(), validate: vi.fn(), approve: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: fixtures.context }));
vi.mock("@/components/header", () => ({ Header: () => null }));
vi.mock("@/lib/mcp-oauth", async (original) => ({ ...await original<object>(), validateAuthorization: fixtures.validate, approveOAuthConnection: fixtures.approve }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import AuthorizePage from "@/app/(product)/oauth/authorize/page";

const params = { response_type: "code", client_id: "registered-client", redirect_uri: "https://example.test/callback", code_challenge: "x".repeat(43), code_challenge_method: "S256", resource: "http://localhost:3001/mcp", scope: "actions:write", state: "preserve-me" };
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3001"); vi.stubEnv("MONOLOGUE_MODE", "cloud"); vi.stubEnv("MONOLOGUE_MCP_ENABLED", "1");
  vi.clearAllMocks();
  fixtures.validate.mockResolvedValue({ params, client: { name: "Test agent" } });
  fixtures.context.mockResolvedValue({ workspace: { id: "owner-workspace", name: "My feed", kind: "personal" }, workspaces: [{ id: "owner-workspace", name: "My feed", kind: "personal" }], user: { id: "owner-user" } });
  fixtures.approve.mockResolvedValue("https://example.test/callback?code=test-only-code");
});
afterAll(() => vi.unstubAllEnvs());
function findForm(element: ReactElement): ReactElement<{ action: (data: FormData) => Promise<void> }> | undefined {
  if (element.type === "form") return element as ReactElement<{ action: (data: FormData) => Promise<void> }>;
  const children = React.Children.toArray((element.props as { children?: React.ReactNode }).children);
  for (const child of children) { if (React.isValidElement(child)) { const form = findForm(child); if (form) return form; } }
}
const page = () => AuthorizePage({ searchParams: Promise.resolve(params) });
describe("MCP consent", () => {
  it("shows the write-only scope and callback trust boundary, not a secret", async () => {
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("Connect Test agent?"); expect(html).toContain("cannot read your feed");
    expect(html).toContain("not verified by Monologue"); expect(html).toContain("example.test");
    expect(html).toContain("revoke access anytime"); expect(html).not.toContain("mlg_mcp_");
  });
  it("makes cross-agent read permission explicit for read-only and read/write approvals", async () => {
    fixtures.validate.mockResolvedValue({ params: { ...params, scope: "actions:read" }, client: { name: "Test agent" } });
    const readOnly = renderToStaticMarkup(await page());
    expect(readOnly).toContain("read the selected workspace’s entire timeline"); expect(readOnly).toContain("its members’ agents");
    expect(readOnly).toContain("cannot add actions");
    fixtures.validate.mockResolvedValue({ params: { ...params, scope: "actions:write actions:read" }, client: { name: "Test agent" } });
    const both = renderToStaticMarkup(await page());
    expect(both).toContain("read the selected workspace’s entire timeline"); expect(both).toContain("also add actions");
    const action = findForm(await page())!.props.action, approved = new FormData(); approved.set("decision", "approve"); approved.set("workspaceId", "owner-workspace");
    await expect(action(approved)).rejects.toThrow("redirect:");
    expect(fixtures.approve).toHaveBeenCalledWith({ ...params, scope: "actions:write actions:read" }, "owner-workspace", "owner-user");
  });
  it("preserves authorization through sign-in and rejects unsafe links without redirecting", async () => {
    fixtures.context.mockResolvedValue(null);
    await expect(page()).rejects.toThrow("redirect:/sign-in?next=%2Foauth%2Fauthorize%3F");
    fixtures.validate.mockRejectedValue(new Error("unregistered callback"));
    expect(renderToStaticMarkup(await page())).toContain("This connection link is unavailable");
    expect(fixtures.context).toHaveBeenCalledTimes(1);
  });
  it("rechecks the session and grants only after an explicit approval", async () => {
    const action = findForm(await page())!.props.action;
    const denied = new FormData(); denied.set("decision", "deny");
    await expect(action(denied)).rejects.toThrow("error=access_denied"); expect(fixtures.approve).not.toHaveBeenCalled();
    const approved = new FormData(); approved.set("decision", "approve"); approved.set("workspaceId", "attacker-workspace");
    await expect(action(approved)).rejects.toThrow("Workspace unavailable");
    expect(fixtures.approve).not.toHaveBeenCalled();
    approved.set("workspaceId", "owner-workspace");
    await expect(action(approved)).rejects.toThrow("redirect:https://example.test/callback?code=test-only-code");
    expect(fixtures.approve).toHaveBeenCalledWith(params, "owner-workspace", "owner-user");
    fixtures.context.mockResolvedValue(null);
    await expect(action(approved)).rejects.toThrow("redirect:/sign-in");
  });
});
