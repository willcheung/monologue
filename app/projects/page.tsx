import { Header } from "@/components/header";
import { ActionIcon } from "@/components/action-icon";
import { db } from "@/lib/db";
import { ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const actions = await db.action.findMany({ where: { project: { not: null } }, orderBy: { occurredAt: "desc" } });
  const projects = actions.reduce<Record<string, typeof actions>>((all, action) => { if (action.project) (all[action.project] ??= []).push(action); return all; }, {});
  return <>
    <Header current="projects" />
    <main className="page-shell projects-page">
      <section className="projects-intro"><span className="kicker">Shared context</span><h1>Projects</h1><p>See the changes your agents made together, grouped by what they were working on.</p></section>
      <div className="project-grid">
        {Object.entries(projects).map(([name, items]) => <article className="project-card" key={name}>
          <div className="project-heading"><span><FolderKanban size={19} /></span><div><h2>{name}</h2><p>{items.length} {items.length === 1 ? "action" : "actions"}</p></div><Link href={`/?project=${encodeURIComponent(name)}`} aria-label={`View ${name}`}><ArrowRight size={18} /></Link></div>
          <ul>{items.slice(0, 4).map((action) => <li key={action.id}><ActionIcon category={action.category} /><p><strong>{action.agentName}</strong> {action.summary.charAt(0).toLowerCase() + action.summary.slice(1)}</p><time>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(action.occurredAt)}</time></li>)}</ul>
          {items.length > 4 && <Link className="all-actions" href={`/?project=${encodeURIComponent(name)}`}>View all {items.length} actions <ArrowRight size={15} /></Link>}
        </article>)}
      </div>
    </main>
  </>;
}
