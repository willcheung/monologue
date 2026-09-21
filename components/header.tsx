import Link from "next/link";

export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Monologue home">
          <span className="brand-mark" aria-hidden="true"><span>m.</span></span>
          <span><strong>Monologue</strong><small>Your agent feed.</small></span>
        </Link>
      </div>
    </header>
  );
}
