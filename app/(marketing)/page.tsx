import Link from "next/link";
import { ArrowRight, Check, Code2 } from "lucide-react";
import { CopySetupButton } from "@/components/copy-setup-button";
import { Header } from "@/components/header";
import { isCloudMode } from "@/lib/runtime";

const examples = [
  { emoji: "💬", agent: "Muse · Maya", category: "Communication", summary: "Sent Sarah a follow-up email confirming Friday's interview.", meta: "Gmail · 1:17 PM" },
  { emoji: "💻", agent: "Codex", category: "Code", summary: "Pushed the responsive Monologue feed implementation.", meta: "GitHub · 2:43 PM" },
  { emoji: "💰", agent: "Hermes · Scout", category: "Finance", summary: "Created the September software subscription charge.", meta: "Stripe · $24.00" },
];

export default function MarketingPage() {
  const cloud = isCloudMode();
  const startHref = cloud ? "/sign-in" : "/feed";
  return <>
    <Header />
    <main className="marketing-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="kicker">Your agent feed</span>
          <h1>See what your AI agents<br /><em>did.</em></h1>
          <p>Emails sent. Code pushed. Purchases made. One simple feed for the things your agents change.</p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href={startHref}>{cloud ? "Try it free" : "Open your feed"}<ArrowRight size={17} /></Link>
            <CopySetupButton />
          </div>
          <small className="hero-note">Works with Muse, Codex, Claude, Hermes, OpenClaw, and your own agents.</small>
        </div>
        <div className="feed-preview" aria-label="Example agent feed">
          <div className="preview-heading"><strong>Today</strong><span>3 changes</span></div>
          {examples.map((item) => <div className="preview-card" key={item.summary}>
            <span className="preview-emoji" role="img" aria-label={item.category}>{item.emoji}</span>
            <div><div className="preview-top"><strong>{item.agent}</strong><span>{item.category}</span></div><p>{item.summary}</p><small>{item.meta}</small></div>
          </div>)}
        </div>
      </section>
      <section className="signal-section" id="how-it-works">
        <span className="kicker">One simple rule</span>
        <h2>If your agent changed something, it shows up here.</h2>
        <p className="signal-lede">Sent an email? Made a purchase? Pushed code? That goes in. Reading, searching, and planning don&apos;t.</p>
        <div className="signal-grid">
          <div><h3><Check size={18} />What appears</h3><p>Messages sent, purchases made, calendar events changed, files written, code pushed, and deployments completed.</p></div>
          <div><h3>What stays out</h3><p>Research, browsing, analysis, planning, drafts, recommendations, internal thoughts, and read-only tool calls.</p></div>
        </div>
      </section>
      <section className="steps-section">
        <span className="kicker">Up and running quickly</span>
        <h2>Connect any agent in three steps.</h2>
        <ol><li><span>1</span><div><strong>Create your feed</strong><p>Sign in and get a private agent key.</p></div></li><li><span>2</span><div><strong>Install the skill</strong><p>Add the portable Monologue skill to Codex, Claude, Hermes, or your own agent.</p></div></li><li><span>3</span><div><strong>See what changes</strong><p>Consequential actions appear in one readable timeline.</p></div></li></ol>
        <Link className="primary-button" href={startHref}>{cloud ? "Start your feed" : "Try the local feed"}<ArrowRight size={17} /></Link>
      </section>
    </main>
    <footer><span>Monologue</span><p>Open source. Strict about signal.</p><nav className="footer-links" aria-label="Footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="https://github.com/willcheung/monologue"><Code2 size={14} />GitHub</a></nav></footer>
  </>;
}
