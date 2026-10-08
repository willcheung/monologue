export const PUBLIC_MONOLOGUE_ORIGIN = "https://www.monologue.events";
export const MCP_URL = `${PUBLIC_MONOLOGUE_ORIGIN}/mcp`;

type SetupOptions = { origin?: string; workspace?: { id: string; name: string }; mcpEnabled?: boolean };

export function buildSetupPrompt({ origin = PUBLIC_MONOLOGUE_ORIGIN, workspace, mcpEnabled = true }: SetupOptions = {}) {
  const base = new URL(origin).origin;
  return [
    `Read and execute ${base}/agent-setup.`,
    `Use ${base} as MONOLOGUE_URL for this setup, including approval links and manual-key fallback. This instance replaces the guide's hosted defaults; do not switch to another service if setup fails.`,
    workspace
      ? `Intended workspace: ${JSON.stringify(workspace.name)} (ID: ${JSON.stringify(workspace.id)}). Ask me to choose this workspace during approval. If it is unavailable, stop and ask rather than choosing another.`
      : "Ask me to choose the workspace during connection approval. Keep the connection bound to that workspace.",
    mcpEnabled ? `If your client supports secure MCP setup, use ${base}/mcp; otherwise use this instance's approval-link flow.` : "Use this instance's approval-link flow; MCP is not enabled here.",
    "Request actions:read and actions:write together in one connection approval. Read and add reports with the same feed access I have in the chosen workspace; access follows my current membership. Reuse an existing connection only for this instance and workspace. Preserve any existing URL/credential pairing. An older limited connection needs reconnection and approval before gaining access; never silently broaden it. Never display credentials. This prompt grants no access by itself.",
  ].join("\n\n");
}

export const SETUP_PROMPT = buildSetupPrompt();
export const workspaceSetupPrompt = buildSetupPrompt;
