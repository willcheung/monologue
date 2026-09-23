import Link from "next/link";
import { isCloudMode } from "@/lib/runtime";
import { BrandMark } from "./brand-mark";
import { SignOutButton } from "./sign-out-button";

export function Header({ product = false, signedIn = false }: { product?: boolean; signedIn?: boolean }) {
  const cloud = isCloudMode();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href={product ? "/feed" : "/"} className="brand" aria-label="Monologue home">
          <BrandMark />
          <span><strong>Monologue</strong><small>Your agent feed.</small></span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          {product ? <>
            <Link href="/feed">Agent feed</Link>
            <Link href="/agents">Agents</Link>
            <Link className="nav-add-agent" href={cloud ? "/settings/keys" : "/welcome"}>Add agent</Link>
            {signedIn && <SignOutButton />}
          </> : <>
            <Link href="/#how-it-works">How it works</Link>
            <a href="https://github.com/willcheung/monologue">GitHub</a>
            <Link className="nav-cta" href={cloud ? "/sign-in" : "/feed"}>{cloud ? "Try free" : "Open feed"}</Link>
          </>}
        </nav>
      </div>
    </header>
  );
}
