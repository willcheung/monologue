import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

export function Header({ product = false, signedIn = false }: { product?: boolean; signedIn?: boolean }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={product ? "/feed" : "/"} className="brand" aria-label="Monologue home">
          <span className="brand-mark" aria-hidden="true"><span>m.</span></span>
          <span><strong>Monologue</strong><small>Your agent feed.</small></span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          {product ? <>
            <Link href="/feed">Feed</Link>
            {signedIn && <Link href="/settings/keys">Agent keys</Link>}
            {signedIn && <SignOutButton />}
          </> : <>
            <a href="#how-it-works">How it works</a>
            <a href="https://github.com/willcheung/monologue">GitHub</a>
            <Link className="nav-cta" href="/feed">Open feed</Link>
          </>}
        </nav>
      </div>
    </header>
  );
}
