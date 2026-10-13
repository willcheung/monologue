import "server-only";
import { mcpEnabled, mcpIssuer } from "./mcp-oauth";
import { isCloudMode } from "./runtime";
import { buildSetupPrompt } from "./setup-prompt";
import { getWorkspaceContext } from "./workspace";

// Public setup pages and authenticated product pages use the same prompt factory.
export async function getSetupContext(verifiedContext?: Awaited<ReturnType<typeof getWorkspaceContext>>) {
  const context = verifiedContext === undefined ? (isCloudMode() ? await getWorkspaceContext() : null) : verifiedContext;
  const origin = mcpIssuer();
  const mcpAvailable = isCloudMode() && mcpEnabled();
  const workspace = context ? { id: context.workspace.id, name: context.workspace.kind === "personal" ? "Personal" : context.workspace.name } : undefined;
  return { origin, mcpAvailable, mcpUrl: `${origin}/mcp`, prompt: buildSetupPrompt({ origin, workspace, mcpEnabled: mcpAvailable }) };
}
