import { buildSetupPrompt } from "./setup-prompt";
import { getIntegration } from "./distribution-content";

export const AGENT_IDS = ["claude-code", "codex", "cursor", "hermes", "openclaw", "muse", "other"] as const;
export type AgentId = typeof AGENT_IDS[number];
export type SetupOptions = { instanceUrl: string; mcpUrl?: string; basePrompt?: string };
export const AGENT_OPTIONS = AGENT_IDS.map(id => ({ id, name: id === "other" ? "Another agent" : getIntegration(id)!.name }));

export function isAgentId(value: string): value is AgentId {
  return (AGENT_IDS as readonly string[]).includes(value);
}

// Only public deployment URLs enter the generated instructions. Never credentials.
export function setupOrigin(value: string) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("Use a deployment origin without credentials");
  }
  return url.origin;
}
const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";

export function agentSetup(id: AgentId, options: SetupOptions) {
  const origin = setupOrigin(options.instanceUrl);
  const endpoint = options.mcpUrl;
  if (endpoint && endpoint !== `${origin}/mcp`) throw new Error("MCP must use this Monologue instance");
  const name = AGENT_OPTIONS.find(agent => agent.id === id)!.name;
  const portableInstall = getIntegration(id)?.commands[0];
  const install = portableInstall && ["claude-code", "codex"].includes(id) ? `${portableInstall} --global --yes` : portableInstall;
  let native = "Use this agent's documented native connection settings. If it cannot configure itself, give me one exact next step.";
  let commands: string[] = [];
  if (endpoint) {
    switch (id) {
      case "claude-code":
        commands = [`claude mcp add --transport http --scope user monologue ${quote(endpoint)}`, "claude mcp login monologue"];
        native = "First check for an existing authenticated Monologue connection, including a connector inherited from my Claude account. Reuse it. If absent, use Claude Code's native MCP commands below. Use the permission policy in the shared setup instructions and preserve existing limited grants until explicitly reapproved. If login requires an interactive terminal, give me one step: run claude mcp login monologue in my terminal, then return here. Do not retry it in a non-interactive tool.";
        break;
      case "codex":
        commands = [`codex mcp add monologue --url ${quote(endpoint)}`, "codex mcp login monologue --scopes actions:read,actions:write"];
        native = "Check Codex's configured MCP servers and active tools first. Reuse a connection to this instance. If absent, use Codex's native commands below. The add command may already start OAuth: do not start a second login if authentication is complete. In the desktop app, if the current conversation has not loaded the new tools, give one step to reload MCP servers in Settings, then verify in a new conversation. A successful CLI login alone does not prove tools are available in this desktop conversation.";
        break;
      case "cursor":
        commands = [JSON.stringify({ mcpServers: { monologue: { url: endpoint } } }, null, 2)];
        native = "Use Cursor's supported MCP setup. Reuse a matching server first. If you can safely update the user's MCP configuration, merge this entry into ~/.cursor/mcp.json without overwriting unrelated entries or printing stored secrets. Otherwise give one short instruction to add this URL in Cursor's Customize / MCP settings. Authenticate using Cursor's native OAuth flow.";
        break;
      case "hermes":
        commands = [`hermes mcp add monologue --url ${quote(endpoint)} --auth oauth`, "hermes mcp login monologue"];
        native = "Reuse a Monologue connection in the current Hermes profile. Use Hermes' documented native connection tools or safely merge the entry below into that profile's config.yaml; preserve unrelated configuration. Start hermes mcp login monologue outside a short auto-reload timeout when needed. Never import another agent's credentials. Check tools in the actual session or gateway that will run the agent.";
        break;
      case "openclaw":
        commands = [JSON.stringify({ url: endpoint, transport: "streamable-http", auth: "oauth", oauth: { scope: "actions:read actions:write" } }, null, 2), "openclaw mcp login monologue"];
        native = "Check the active OpenClaw agent and runtime first. Reuse its existing Monologue connection. On versions with native MCP, inspect openclaw mcp set --help and use it to add the remote definition below under mcp.servers.monologue; then use openclaw mcp login monologue. Verify this runtime exposes the tools and the agent can discover the skill. Do not broaden a skill allowlist or share an operator credential with other senders. If the runtime lacks MCP, use the existing secure API approval flow from the canonical guide.";
        break;
    }
  }
  const prompt = [
    `Set up Monologue for ${name === "Another agent" ? "this agent" : name}. Use my Monologue instance at ${origin}.`,
    options.basePrompt ?? buildSetupPrompt({ origin, mcpEnabled: Boolean(endpoint) }),
    `Install the canonical monologue skill using your supported skill manager so the reporting instructions persist in later sessions. Do not duplicate the skill into several rule files.`,
    ["claude-code", "codex"].includes(id) ? "Install for this user across projects, not just the current project, unless I explicitly request project-only setup. Keep one canonical skill installation and use the skill manager’s supported links." : "",
    "Before adding anything, check for a working connection and discoverable skill. Reuse them. Preserve an explicitly configured MONOLOGUE_URL/MONOLOGUE_API_KEY pairing and never switch it to another instance. Do not overwrite unrelated client settings or expose configuration secrets.",
    install ? `The existing portable skill installation option is: ${install}. Check the appropriate install scope for my agent; configuration/skill file creation alone does not prove discovery.` : "If your client supports persistent skills or instructions, use its native mechanism. If instructions apply only to this conversation, tell me clearly.",
    endpoint ? `${native} The MCP endpoint is ${endpoint}.` : "MCP is not enabled for this instance. Follow the canonical guide's API setup using persistent secure credential storage. If credentials are already configured, reuse them. If secure storage is unavailable, explain the required secure setup; never ask for a key in chat or redirect me to hosted Monologue.",
    commands.length ? `Only if this connection is missing, the supported configuration/authentication references are:\n${commands.join("\n\n")}` : "",
    "Follow the shared permission policy above: the standard connection requests reading and reporting together in one approval. Older limited grants must not gain access silently. Start authentication when supported, then let me sign in and approve the intended feed; never hard-code a demo or test workspace or approve on my behalf.",
    "Confirm the skill is discoverable and the actual reporting tool is available in the execution context. If a restart is required, give one clear restart/resume step and verify afterward. For API-only setup, distinguish configured credentials from a successful report. Do not invent a test action or write a synthetic event to my feed.",
    "Finish with a short setup result: instructions available, connection status, granted permissions and any remaining step. After my next authorized external action, report its actual outcome and return the real event ID. Research, drafts, local development and Monologue tool calls stay out.",
  ].filter(Boolean).join("\n\n");
  return { id, name, prompt, commands,
    note: id === "openclaw" ? "Use the agent profile that will run your tasks. Setup in another profile may not reach it." :
      id === "hermes" ? "Use your active Hermes profile. A remote gateway may need its own browser sign-in step." :
      id === "muse" ? "Muse’s available connection tools can vary. The instructions ask it to use a supported connection and explain any step you need to complete." :
      id === "other" ? "Your agent needs supported tools and a secure place to keep its connection. It should explain any missing capability." :
      "Already connected? Your agent should reuse its connection and check the reporting instructions.",
  };
}
