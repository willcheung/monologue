import Link from "next/link";
import { redirect } from "next/navigation";
import { CopySetupButton } from "@/components/copy-setup-button";
import { Header } from "@/components/header";
import { isCloudMode } from "@/lib/runtime";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/sign-in");
  const cloud = isCloudMode();
  return <>
    <Header product signedIn={Boolean(context.user)} />
    <main className="setup-shell">
      <span className="kicker">Connect your first agent</span>
      <h1>{cloud ? `Welcome${context.user?.name ? `, ${context.user.name.split(" ")[0]}` : ""}.` : "Your local feed is ready."}</h1>
      <p className="setup-lede">Give your agent one prompt, approve its connection, and you&apos;re done. No keys to copy or paste.</p>
      {cloud ? <>
        <div className="setup-step"><div className="step-number">1</div><h2>Give this prompt to your agent</h2><p>It installs Monologue and starts a private connection.</p><pre>Read and execute https://www.monologue.events/agent-setup/SKILL.md</pre><CopySetupButton /></div>
        <div className="setup-step"><div className="step-number">2</div><h2>Open the link it gives you</h2><p>Approve the agent on Monologue. We create its key behind the scenes and send it directly to the agent.</p></div>
        <div className="setup-step"><div className="step-number">3</div><h2>That&apos;s it</h2><p>The agent securely remembers the connection. Future external actions will appear in your feed automatically.</p></div>
      </> : <div className="local-setup">
        <div className="step-number">1</div><h2>Use your local API key</h2>
        <p>Your key is the <code>MONOLOGUE_API_KEY</code> value in this project&apos;s <code>.env</code> file.</p>
      </div>}
      <Link className="primary-button" href="/feed">Open my feed →</Link>
    </main>
  </>;
}
