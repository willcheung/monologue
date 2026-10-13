import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { agentSetup, AGENT_IDS, setupOrigin } from "@/lib/agent-onboarding";
import { buildSetupPrompt } from "@/lib/setup-prompt";
import { AgentSetupChooser } from "@/components/agent-setup-chooser";

const instanceUrl = "https://example.test";
const mcpUrl = `${instanceUrl}/mcp`;
describe("client-specific onboarding", () => {
  it("keeps every selected client on the intended instance and workspace", () => {
    const basePrompt = buildSetupPrompt({ origin: instanceUrl, workspace: { id: "fixture-team", name: "Studio team" } });
    for (const id of AGENT_IDS) {
      const setup = agentSetup(id, { instanceUrl, mcpUrl, basePrompt });
      expect(setup.prompt).toContain(basePrompt);
      expect(setup.prompt).toContain(instanceUrl);
      expect(setup.prompt).toContain("Do not overwrite unrelated client settings");
      expect(setup.prompt).toContain("Do not invent a test action");
      expect(setup.prompt).not.toContain("Production release test");
      expect(setup.prompt).not.toContain("https://www.monologue.events/mcp");
      expect(setup.prompt).not.toMatch(/mlg_live_|Bearer [A-Za-z0-9_-]{12}/);
    }
  });
  it("uses native client commands and preserves standard scope approval", () => {
    const claude = agentSetup("claude-code", { instanceUrl, mcpUrl });
    expect(claude.commands[0]).toContain("--scope user");
    expect(claude.commands[1]).toBe("claude mcp login monologue");
    const codex = agentSetup("codex", { instanceUrl, mcpUrl });
    expect(codex.commands[0]).toContain("codex mcp add");
    expect(codex.commands[1]).toContain("--scopes actions:read,actions:write");
    expect(codex.prompt).toContain("never silently broaden");
    for (const setup of [claude, codex]) {
      expect(setup.prompt).toContain("--global --yes");
      expect(setup.prompt).toContain("across projects");
    }
    expect(claude.prompt).toContain("Do not retry it in a non-interactive tool");
  });
  it("does not offer hosted MCP or connector actions for an API-only instance", () => {
    for (const id of AGENT_IDS) {
      const setup = agentSetup(id, { instanceUrl });
      expect(setup.commands).toEqual([]);
      expect(setup.prompt).toContain("MCP is not enabled for this instance");
      expect(setup.prompt).not.toContain("example.test/mcp");
      const html = renderToStaticMarkup(<AgentSetupChooser instanceUrl={instanceUrl} initialAgent={id} />);
      expect(html).not.toContain("https://claude.ai/customize");
      expect(html).not.toContain("https://chatgpt.com/plugins");
    }
  });
  it("rejects unsafe origins and cross-instance endpoints before generating commands", () => {
    for (const value of ["https://user:secret@example.test", "https://example.test/path", "https://example.test/?key=secret", "http://public.example.test"]) expect(() => setupOrigin(value)).toThrow();
    expect(() => agentSetup("codex", { instanceUrl, mcpUrl: "https://another.test/mcp" })).toThrow();
  });
  it("defaults to Claude Code without generic copy or false connected claims", () => {
    const html = renderToStaticMarkup(<AgentSetupChooser instanceUrl={instanceUrl} mcpUrl={mcpUrl} />);
    expect(html).toContain("Choose your agent");
    expect(html.match(/aria-pressed=/g)).toHaveLength(AGENT_IDS.length);
    expect(html).not.toContain('value="claude"');
    expect(html).not.toContain('value="chatgpt"');
    expect(html).not.toContain("Copy setup prompt");
    expect(html).not.toContain("Connected successfully");
    expect(html).toContain("Copy setup instructions");
    expect(html).toContain("For Claude Code");
    expect(html).toContain(`${instanceUrl}/agent-setup/SKILL.md`);
  });
  it("selects the matching guide and explains persistence without a fake ready state", () => {
    const html = renderToStaticMarkup(<AgentSetupChooser instanceUrl={instanceUrl} mcpUrl={mcpUrl} initialAgent="openclaw" />);
    expect(html).toContain("For OpenClaw");
    expect(html).toContain("Use the agent profile");
    expect(html).toContain("Confirm it’s ready");
    expect(html).not.toContain("Connected successfully");
  });
});
