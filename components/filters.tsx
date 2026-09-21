import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { CATEGORIES, STATUSES } from "@/lib/constants";

type Options = { agents: string[]; systems: string[]; projects: string[] };
type Params = Record<string, string | undefined>;

export function Filters({ options, params }: { options: Options; params: Params }) {
  const activeCount = ["agent", "category", "status", "system", "project", "from", "to"].filter((key) => params[key]).length;
  return (
    <form className="filters" method="get">
      <div className="search-box">
        <Search size={18} />
        <input name="search" defaultValue={params.search} placeholder="Search actions, agents, projects…" aria-label="Search actions" />
        {params.search && <Link href="/" aria-label="Clear search"><X size={16} /></Link>}
      </div>
      <details className="filter-menu" open={activeCount > 0}>
        <summary><SlidersHorizontal size={17} /> Filters {activeCount > 0 && <b>{activeCount}</b>}</summary>
        <div className="filter-grid">
          <label>Agent<select name="agent" defaultValue={params.agent ?? ""}><option value="">All agents</option>{options.agents.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Category<select name="category" defaultValue={params.category ?? ""}><option value="">All categories</option>{CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>System<select name="system" defaultValue={params.system ?? ""}><option value="">All systems</option>{options.systems.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Status<select name="status" defaultValue={params.status ?? ""}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Project<select name="project" defaultValue={params.project ?? ""}><option value="">All projects</option>{options.projects.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>From<input type="date" name="from" defaultValue={params.from} /></label>
          <label>To<input type="date" name="to" defaultValue={params.to} /></label>
          <div className="filter-actions"><button type="submit">Apply filters</button><Link href="/">Clear</Link></div>
        </div>
      </details>
    </form>
  );
}
