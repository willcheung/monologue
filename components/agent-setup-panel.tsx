import { AgentSetupChooser } from "./agent-setup-chooser";
import type { AgentId } from "@/lib/agent-onboarding";

type SetupContext = { origin: string; mcpUrl: string; prompt: string; mcpAvailable?: boolean };
export function AgentSetupPanel({ setup, initialAgent, taskPrompt }: { setup: SetupContext; initialAgent?: AgentId; taskPrompt?: string }) {
  return <AgentSetupChooser instanceUrl={setup.origin} mcpUrl={setup.mcpAvailable ? setup.mcpUrl : undefined} basePrompt={setup.prompt} initialAgent={initialAgent} taskPrompt={taskPrompt} />;
}
