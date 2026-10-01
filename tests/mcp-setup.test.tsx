import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyManager } from "@/components/api-key-manager";
import { MCP_URL, SETUP_PROMPT } from "@/lib/setup-prompt";

vi.mock("@/components/header", () => ({ Header: () => null }));
import DevelopersPage from "@/app/(marketing)/developers/page";

describe("MCP setup guidance", () => {
  it("keeps the shared prompt and clearly labels connection permissions without exposing credentials", () => {
    const html = renderToStaticMarkup(<ApiKeyManager mcpUrl={MCP_URL} initialKeys={[
      { id: "test-write", name: "Writer", prefix: "OAuth connection", scopes: "actions:write", createdAt: "2026-10-01", lastUsedAt: null, revokedAt: null },
      { id: "test-read", name: "Reader", prefix: "OAuth connection", scopes: "actions:read", createdAt: "2026-10-01", lastUsedAt: null, revokedAt: null },
      { id: "test-both", name: "Both", prefix: "OAuth connection", scopes: "actions:write actions:read", createdAt: "2026-10-01", lastUsedAt: null, revokedAt: null },
    ]} />);
    expect(html).toContain(MCP_URL);
    expect(html).toContain(SETUP_PROMPT);
    expect(html).toContain("Add actions only");
    expect(html).toContain("Read timeline only");
    expect(html).toContain("Read and add actions");
    expect(html).not.toContain("OAuth connection••••");
    expect(html).not.toContain("mlg_mcp_");
    expect(renderToStaticMarkup(<ApiKeyManager />)).not.toContain("Copy MCP URL");
  });

  it("documents both tools, explicit read approval and the existing REST fallback", () => {
    const html = renderToStaticMarkup(<DevelopersPage />);
    for (const value of [MCP_URL, SETUP_PROMPT, "report_action", "read_timeline", "actions:write", "actions:read", "nextCursor", "/api/actions"]) expect(html).toContain(value);
    expect(html).toContain("including other agents");
    expect(html).toContain("separately approved");
  });
});
