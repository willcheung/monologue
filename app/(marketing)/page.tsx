import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { CopySetupButton } from "@/components/copy-setup-button";
import { Header } from "@/components/header";
import { RotatingActionHeadline } from "@/components/rotating-action-headline";
import { isCloudMode } from "@/lib/runtime";

const examples = [
  { time: "2:43 PM", agent: "Codex", category: "code", label: "Code", verb: "Pushed", detail: "the responsive Monologue feed implementation.", system: "GitHub", context: "Monologue" },
  { time: "1:17 PM", agent: "Muse · Maya", category: "communication", label: "Communication", verb: "Sent", detail: "Sarah a follow-up email confirming Friday's interview.", system: "Gmail", context: "Job Search" },
  { time: "11:04 AM", agent: "Claude · Cal", category: "calendar", label: "Calendar", verb: "Rescheduled", detail: "the dentist appointment.", system: "Google Calendar", before: "Tuesday · 3:00 PM", after: "Thursday · 11:00 AM" },
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
          <RotatingActionHeadline />
          <p>One simple feed for the things your agents change.</p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href={startHref}>{cloud ? "Try it free" : "Open your feed"}<ArrowRight size={17} /></Link>
            <CopySetupButton />
          </div>
          <small className="hero-note">Works with Muse, Codex, Claude, Hermes, OpenClaw, and your own agents.</small>
        </div>
        <div className="feed-preview" aria-label="Example agent feed">
          <div className="preview-heading"><strong>Latest changes</strong><span>3 actions</span></div>
          <div className="preview-day-group">
            <div className="preview-calendar-day" aria-label="September 22, yesterday"><span>SEP</span><strong>22</strong><small>YESTERDAY</small></div>
            <div className="preview-action-list">
              {examples.map((item) => <article className="preview-timeline-event" key={`${item.agent}-${item.verb}`}>
                <time className="preview-timeline-time">{item.time}</time>
                <span className="preview-timeline-node"><ActionIcon category={item.category} /></span>
                <div className={`preview-timeline-surface${item.before ? " has-change" : ""}`}>
                  <div className="timeline-main">
                    <div className="timeline-topline"><strong>{item.agent}</strong><span className="category-label">{item.label}</span></div>
                    <p><strong>{item.verb}</strong> {item.detail}</p>
                    {item.before && <div className="inline-action-change"><del>{item.before}</del><i>→</i><b>{item.after}</b></div>}
                    <div className="timeline-meta"><span>{item.system}</span>{item.context && <><i>·</i><span>{item.context}</span></>}</div>
                  </div>
                  <ArrowUpRight className="timeline-arrow" size={17} aria-hidden="true" />
                </div>
              </article>)}
            </div>
          </div>
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
        <ol><li><span>1</span><div><strong>Give your agent one prompt</strong><p>It installs Monologue and gives you a secure connection link.</p></div></li><li><span>2</span><div><strong>Approve the connection</strong><p>Sign in once. There are no keys to copy or paste.</p></div></li><li><span>3</span><div><strong>See what changes</strong><p>Consequential actions appear in one readable timeline.</p></div></li></ol>
        <Link className="primary-button" href={startHref}>{cloud ? "Start your feed" : "Try the local feed"}<ArrowRight size={17} /></Link>
      </section>
    </main>
  </>;
}
