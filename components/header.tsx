import Link from "next/link";
import { AudioLines, FolderKanban } from "lucide-react";

export function Header({ current = "feed" }: { current?: "feed" | "projects" }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Monologue home">
          <span className="brand-mark"><AudioLines size={19} strokeWidth={2.5} /></span>
          <span><strong>Monologue</strong><small>Your agent feed.</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/" className={current === "feed" ? "active" : ""}>Feed</Link>
          <Link href="/projects" className={current === "projects" ? "active" : ""}>
            <FolderKanban size={16} /> Projects
          </Link>
        </nav>
      </div>
    </header>
  );
}
