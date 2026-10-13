import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyManager } from "@/components/api-key-manager";
import { MCP_URL } from "@/lib/setup-prompt";

vi.mock("@/components/header", () => ({ Header: () => null }));
vi.mock("@/lib/setup-context", async () => {
  const { SETUP_PROMPT, MCP_URL, PUBLIC_MONOLOGUE_ORIGIN } = await import("@/lib/setup-prompt");
  return { getSetupContext: async () => ({ prompt: SETUP_PROMPT, mcpUrl: MCP_URL, origin: PUBLIC_MONOLOGUE_ORIGIN }) };
});
import DevelopersPage from "@/app/(marketing)/developers/page";

describe("MCP setup guidance", () => {
  it("keeps the shared prompt and clearly labels connection permissions without exposing credentials", () => {
    const html = renderToStaticMarkup(<ApiKeyManager initialKeys={[
      { id: "test-write", name: "Writer", prefix: "OAuth connection", scopes: "actions:write", createdAt: "2026-10-01", lastUsedAt: null, revokedAt: null },
      { id: "test-read", name: "Reader", prefix: "OAuth connection", scopes: "actions:read", createdAt: "2026-10-01", lastUsedAt: null, revokedAt: null },
      { id: "test-both", name: "Both", prefix: "OAuth connection", scopes: "actions:write actions:read", createdAt: "2026-10-01", lastUsedAt: null, revokedAt: null },
    ]} />);
    expect(html).toContain("Copy setup instructions");
    expect(html).not.toContain("Copy setup prompt");
    expect(html).toContain("Claude Code");
    expect(html).toContain("OpenClaw");
    expect(html).not.toContain("Copy MCP URL");
    expect(html).not.toContain(MCP_URL);
    expect(html).toContain('<details class="api-key-fallback"><summary>Connect an agent with an API key</summary>');
    expect(html).not.toContain('<details open');
    expect(html).toContain("Add actions only");
    expect(html).toContain("Read timeline only");
    expect(html).toContain("Read and add actions");
    expect(html).not.toContain("OAuth connection••••");
    expect(html).not.toContain("mlg_mcp_");
    expect(renderToStaticMarkup(<ApiKeyManager />)).toContain("Copy setup instructions");
  });

  it("documents both tools, one combined connection approval and the existing REST fallback", async () => {
    const html = renderToStaticMarkup(await DevelopersPage());
    for (const value of [MCP_URL, "report_action", "read_timeline", "actions:write", "actions:read", "nextCursor", "/api/actions"]) expect(html).toContain(value);
    expect(html).toContain("including other agents");
    expect(html).toContain("standard connection approval");
    expect(html).toContain("Older limited connections keep their approved scopes");
  });
});
