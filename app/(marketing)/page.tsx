import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Share2 } from "lucide-react";
import { ActionIcon } from "@/components/action-icon";
import { AgentAvatar } from "@/components/agent-avatar";
import { CopySetupButton } from "@/components/copy-setup-button";
import { Header } from "@/components/header";
import { RotatingActionHeadline } from "@/components/rotating-action-headline";
import { isCloudMode } from "@/lib/runtime";

const examples = [
  { time: "2:43 PM", agent: "Codex", category: "code", label: "Code", verb: "Pushed", detail: "the responsive Monologue feed implementation.", system: "GitHub", context: "Monologue" },
  { time: "1:17 PM", agent: "Muse · Maya", category: "communication", label: "Communication", verb: "Sent", detail: "Sarah a follow-up email confirming Friday's interview.", system: "Gmail", context: "Job Search" },
  { time: "11:04 AM", agent: "Claude · Cal", category: "calendar", label: "Calendar", verb: "Rescheduled", detail: "the dentist appointment.", system: "Google Calendar", before: "Tuesday · 3:00 PM", after: "Thursday · 11:00 AM" },
];

const crew = [
  { name: "Codex", role: "Coding agent", systems: "GitHub · Vercel", actions: 184 },
  { name: "Muse · Maya", role: "Personal agent", systems: "Gmail · Calendar", actions: 76 },
  { name: "Hermes · Scout", role: "General agent", systems: "Notion · Stripe", actions: 41 },
];

const recapDays = [
  { day: "Thu", segments: [12] },
  { day: "Fri", segments: [18, 22] },
  { day: "Sat", segments: [14, 12] },
  { day: "Sun", segments: [12, 18, 10] },
  { day: "Mon", segments: [20, 16, 24] },
  { day: "Tue", segments: [22, 20, 28] },
  { day: "Wed", segments: [9] },
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
          <p>Emails sent, purchases made, code pushed—all in one private feed.</p>
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
      <section className="signal-section">
        <span className="kicker">One simple rule</span>
        <h2>If your agent changed something, it shows up here.</h2>
        <p className="signal-lede">Sent an email? Made a purchase? Pushed code? That goes in. Reading, searching, and planning don&apos;t.</p>
        <div className="signal-grid">
          <div><h3><Check size={18} />What appears</h3><p>Emails sent, purchases made, calendar events changed, files written, code pushed, and deployments completed.</p></div>
          <div><h3>What stays out</h3><p>Research, browsing, analysis, planning, drafts, recommendations, internal thoughts, and read-only tool calls.</p></div>
        </div>
      </section>
      <section className="feature-section" id="features" aria-label="Agent profiles">
        <div className="feature-copy">
          <span className="kicker">Your AI crew</span>
          <h2>Know who did what.</h2>
          <p>See what your agents did and check their work anytime.</p>
          <Link href={cloud ? "/sign-in?next=%2Fagents" : "/agents"}>Meet your agents <ArrowRight size={15} /></Link>
        </div>
        <div className="crew-preview" aria-label="Example agent profiles">
          <div className="crew-preview-heading"><strong>My agents</strong><span>3 connected</span></div>
          {crew.map((agent) => <div className="crew-preview-row" key={agent.name}>
            <AgentAvatar name={agent.name} />
            <div><strong>{agent.name}</strong><span>{agent.role}</span><small>Has worked with {agent.systems}</small></div>
            <b>{agent.actions}<small> actions</small></b>
          </div>)}
        </div>
      </section>
      <section className="feature-section feature-section-reverse" aria-label="Seven-day recap">
        <div className="feature-copy">
          <span className="kicker">Your 7-day recap</span>
          <h2>Your week, without the scroll.</h2>
          <p>See what your agents got done, then share a static snapshot without sharing access to your feed.</p>
          <Link href={cloud ? "/sign-in?next=%2Frecap" : "/recap"}>See your recap <ArrowRight size={15} /></Link>
        </div>
        <div className="recap-preview" aria-label="Example seven-day recap">
          <div className="recap-preview-total"><span>This week</span><strong>23</strong><small>actions completed</small></div>
          <div className="recap-preview-chart">
            <div className="recap-preview-bars">{recapDays.map((item) => <div key={item.day}><span>{item.segments.map((height, index) => <i key={index} style={{ height }} />)}</span><b>{item.day}</b></div>)}</div>
            <div className="recap-preview-note"><Share2 size={14} /><span>Static image. Your feed stays private.</span></div>
          </div>
        </div>
      </section>
      <section className="why-section">
        <span className="kicker">Why we made it</span>
        <div><h2>A human record for an automated world.</h2><p>We built Monologue so we could see what our agents did without digging through every chat window. The handwritten, slightly retro look comes from an old habit worth keeping: write things down so you can go back and check.</p></div>
      </section>
      <section className="steps-section" id="how-it-works">
        <span className="kicker">Up and running quickly</span>
        <h2>Connect any agent in three steps.</h2>
        <ol><li><span>1</span><div><strong>Give your agent one prompt</strong><p>It installs Monologue and gives you a secure connection link.</p></div></li><li><span>2</span><div><strong>Approve the connection</strong><p>Sign in once. There are no keys to copy or paste.</p></div></li><li><span>3</span><div><strong>See what changes</strong><p>Consequential actions appear in one readable timeline.</p></div></li></ol>
        <Link className="primary-button" href={startHref}>{cloud ? "Start your feed" : "Try the local feed"}<ArrowRight size={17} /></Link>
      </section>
    </main>
  </>;
}
