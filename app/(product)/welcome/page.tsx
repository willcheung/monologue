import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentSetupPanel } from "@/components/agent-setup-panel";
import { Header } from "@/components/header";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";
import { getSetupContext } from "@/lib/setup-context";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  const cloud = isCloudMode();
  const setup = await getSetupContext();
  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="setup-shell">
      <span className="kicker">Connect your first agent</span>
      <h1>{cloud ? `Welcome${context.user?.name ? `, ${context.user.name.split(" ")[0]}` : ""}.` : "Your local feed is ready."}</h1>
      <p className="setup-lede">Choose your agent and follow its connection steps. You approve access and keep control.</p>
      <AgentSetupPanel setup={setup} />
      {!cloud && <p className="local-setup">Keep your local URL and API key together in your agent’s secure configuration. This instance does not require a hosted Monologue account.</p>}
      <Link className="primary-button" href="/feed">Open my feed →</Link>
    </main>
  </>;
}
