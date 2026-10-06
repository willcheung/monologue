export const SETUP_PROMPT = "Read and execute https://www.monologue.events/agent-setup";
export const MCP_URL = "https://www.monologue.events/mcp";

export function workspaceSetupPrompt({ origin, workspace, mcpEnabled }: { origin: string; workspace: { id: string; name: string }; mcpEnabled: boolean }) {
  const base = new URL(origin).origin;
  return [
    `Read and follow ${base}/agent-setup.`,
    `Use ${base} as MONOLOGUE_URL for this setup, including approval links and manual-key fallback. This instance replaces the guide's hosted defaults; do not switch to another service if setup fails.`,
    `Intended workspace: ${JSON.stringify(workspace.name)} (ID: ${JSON.stringify(workspace.id)}). Ask me to choose this workspace during approval. If it is unavailable, stop and ask rather than choosing another.`,
    mcpEnabled ? `If your client supports secure MCP setup, use ${base}/mcp; otherwise use this instance's approval-link flow.` : "Use this instance's approval-link flow; MCP is not enabled here.",
    "Reuse an existing connection only if it is for this instance and workspace. Preserve any existing URL/credential pairing; ask before replacing or changing it. Request reporting access only. Reading needs separate approval, and this prompt grants no access by itself.",
  ].join("\n\n");
}
