import { SETUP_PROMPT } from "./setup-prompt";

export const PUBLIC_SITE_URL = "https://www.monologue.events";

export const INTEGRATIONS = [
  {
    slug: "muse", name: "Muse", method: "Setup prompt",
    description: "Keep a record of emails sent, meetings changed, and purchases made by Muse.",
    example: "Sent the counteroffer to the dealer.",
    note: "Paste the prompt into Muse. If it offers a secure connector instead of an approval link, use the API key fallback below. Monologue does not give Muse access to your email or shopping accounts.",
    commands: [],
  },
  {
    slug: "claude-code", name: "Claude Code", method: "Plugin or setup prompt",
    description: "Keep GitHub pushes, pull requests, and deployments from Claude Code in one feed.",
    example: "Opened the pull request for the checkout fix.",
    note: "Install the plugin below, then paste the setup prompt to connect your account. Confirm the Monologue skill is available in your session. Local edits and tests stay out of the feed.",
    commands: ["claude plugin marketplace add willcheung/monologue", "claude plugin install monologue@monologue"],
  },
  {
    slug: "openclaw", name: "OpenClaw", method: "Portable skill",
    description: "Keep a record of the messages, bookings, and other changes your OpenClaw agent reports.",
    example: "Booked the appointment and received a confirmation.",
    note: "Paste the prompt into your agent, or use the Skills CLI below. Confirm the skill is discoverable in any worker or scheduled agent run that needs it. A ClawHub listing is a separate publication step, not required for this setup.",
    commands: ["npx skills add willcheung/monologue --skill monologue --agent openclaw"],
  },
  {
    slug: "codex", name: "Codex", method: "Portable skill",
    description: "Find the code your Codex agent pushed and the releases it deployed, without digging through chats.",
    example: "Pushed the fix to GitHub and deployed the release to Vercel.",
    note: "Paste the setup prompt into Codex, or install the skill with the command below. Confirm Monologue appears in the available skills; reload skills or start a new session if needed. A push and a deployment are separate actions. Local builds and dev-server restarts are not logged.",
    commands: ["npx skills add willcheung/monologue --skill monologue --agent codex"],
  },
  {
    slug: "hermes", name: "Hermes", method: "Portable skill",
    description: "Give your Hermes agent a private place to report the things it changes for you.",
    example: "Published the listing and saved its URL.",
    note: "Paste the prompt into Hermes. Check that Monologue appears in the agent's available-skills list, including any delegated workers. Installing a file alone is not enough if the session cannot discover it.",
    commands: ["npx skills add willcheung/monologue --skill monologue --agent hermes-agent"],
  },
] as const;

export function getIntegration(slug: string) {
  return INTEGRATIONS.find((integration) => integration.slug === slug);
}

const STARTER_BOUNDARY = "Keep your existing permissions and approval rules. Ask before any new access or commitment. Research and drafts stay in our chat. After an authorized external action or meaningful attempt, report its actual outcome to Monologue and include a result or receipt URL when available. Never invent an action, receipt, or successful outcome.";

export const AGENT_STARTERS = [
  {
    slug: "personal-assistant", name: "Personal assistant", description: "Help with emails and calendar changes, with a record you can revisit.",
    prompt: `${SETUP_PROMPT}\n\nHelp me with emails and scheduling. First, tell me which apps you can already use, then ask what I want help with. Draft replies and proposed calendar changes for me to review. ${STARTER_BOUNDARY}`,
  },
  {
    slug: "shopping-helper", name: "Shopping helper", description: "Compare options first. Keep order and booking receipts after you approve a purchase.",
    prompt: `${SETUP_PROMPT}\n\nHelp me compare products, prices, and booking options. Ask what I need and my budget first. Do not buy, book, or start a subscription until I approve the specific item and total cost. ${STARTER_BOUNDARY}`,
  },
  {
    slug: "coding-agent", name: "Coding agent", description: "Keep pushes, pull requests, and shared deployments separate from local development.",
    prompt: `${SETUP_PROMPT}\n\nHelp me work on my software project. Ask which repository and task to work on. Local edits, commits, tests, builds, and dev-server restarts do not belong in the feed. Report a remote push, pull request change, or shared deployment as its own action, with the commit, pull request, or deployment URL when available. ${STARTER_BOUNDARY}`,
  },
] as const;
