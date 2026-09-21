import Link from "next/link";
import { Code2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer>
      <span>Monologue</span>
      <p>Your agent feed.</p>
      <nav className="footer-links" aria-label="Legal and project links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <a href="https://github.com/willcheung/monologue"><Code2 size={14} />GitHub</a>
      </nav>
    </footer>
  );
}
