import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthCompletion } from "@/components/oauth-completion";
import { isNativeCallback, openOAuthCallbackWindow, type OAuthConnectionStatus } from "@/lib/oauth-completion";
const mocks = vi.hoisted(() => ({ context: vi.fn(), status: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ getWorkspaceContext: mocks.context }));
vi.mock("@/lib/mcp-oauth", () => ({ getOAuthConnectionStatus: mocks.status, mcpEnabled: () => true }));
vi.mock("@/components/header", () => ({ Header: () => null }));
import CompletePage from "@/app/(product)/oauth/complete/page";
import { GET } from "@/app/api/connect/oauth-status/route";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
const status: OAuthConnectionStatus = { state: "connected", agentName: "Codex", workspaceId: "chosen-workspace", workspaceName: "Personal", canRead: true, canWrite: true, verified: false };
describe("OAuth completion", () => {
  it("keeps consent available when popup creation is blocked or throws", () => {
    const open = vi.fn().mockReturnValueOnce(null).mockImplementationOnce(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.stubGlobal("window", { open });
    expect(openOAuthCallbackWindow()).toBeNull();
    expect(openOAuthCallbackWindow()).toBeNull();
  });
  it("clears the opener before the native callback and closes unusable windows", () => {
    const close = vi.fn();
    const popup = { opener: {}, document: { title: "", body: { textContent: "" } }, close };
    const open = vi.fn().mockReturnValue(popup);
    vi.stubGlobal("window", { open });
    expect(openOAuthCallbackWindow()).toBe(popup);
    expect(popup.opener).toBeNull();
    expect(popup.document.body.textContent).toContain("Return to Monologue");
    Object.defineProperty(popup, "document", { get() { throw new DOMException("Unavailable", "SecurityError"); } });
    expect(openOAuthCallbackWindow()).toBeNull();
    expect(close).toHaveBeenCalledOnce();
  });
  it("shows success with the chosen feed only after exchange", () => {
    const success = renderToStaticMarkup(<OAuthCompletion connectionId="receipt" initial={status} />);
    expect(success).toContain("Codex is connected.");
    expect(success).toContain("/feed?workspaceId=chosen-workspace");
    expect(success).toContain("next reported action");
    for (const state of ["pending", "expired", "revoked"] as const) {
      const html = renderToStaticMarkup(<OAuthCompletion connectionId="receipt" initial={{ ...status, state }} />);
      expect(html).not.toContain("Codex is connected.");
      expect(html).not.toContain("Open your feed");
    }
  });
  it("does not promise write access for a limited read-only grant", () => {
    const html = renderToStaticMarkup(<OAuthCompletion connectionId="receipt" initial={{ ...status, canWrite: false }} />);
    expect(html).toContain("can read this feed");
    expect(html).not.toContain("add reports");
    expect(html).not.toContain("next reported action");
  });
  it("limits the native completion flow to loopback HTTP callbacks", () => {
    expect(isNativeCallback("http://127.0.0.1:1234/callback")).toBe(true);
    expect(isNativeCallback("http://localhost:1234/callback")).toBe(true);
    for (const url of ["https://example.test/callback", "http://127.0.0.1.evil.test/callback", "http://user@localhost/callback", "javascript:alert(1)"]) expect(isNativeCallback(url)).toBe(false);
  });
  it("requires a browser session and returns only the owned receipt without caching", async () => {
    vi.stubEnv("MONOLOGUE_MODE", "cloud");
    const request = new Request("http://localhost/api/connect/oauth-status?connection=receipt");
    mocks.context.mockResolvedValue(null);
    expect((await GET(request)).status).toBe(401); expect(mocks.status).not.toHaveBeenCalled();
    mocks.context.mockResolvedValue({ user: { id: "owner" } }); mocks.status.mockResolvedValue(null);
    expect((await GET(request)).status).toBe(404);
    expect(mocks.status).toHaveBeenCalledWith("receipt", "owner");
    mocks.status.mockResolvedValue(status);
    const response = await GET(request);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual(status);
    vi.stubEnv("MONOLOGUE_MODE", "single-user");
    expect((await GET(request)).status).toBe(404);
  });
  it("binds the receipt navigation to the approved workspace, not another tab’s selection", async () => {
    vi.stubEnv("MONOLOGUE_MODE", "cloud");
    mocks.context.mockResolvedValue({ user: { id: "owner" }, workspace: { id: "another-workspace" } });
    mocks.status.mockResolvedValue(status);
    const html = renderToStaticMarkup(await CompletePage({ searchParams: Promise.resolve({ connection: "receipt" }) }));
    expect(mocks.context).toHaveBeenCalledWith("chosen-workspace");
    expect(html).toContain("/feed?workspaceId=chosen-workspace");
  });

});
