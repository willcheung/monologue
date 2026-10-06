import Link from "next/link";
import { isCloudMode, isWorkspaceDev } from "@/lib/runtime";
import { BrandMark } from "./brand-mark";
import { SignOutButton } from "./sign-out-button";
import { WorkspaceMenu } from "./workspace-menu";
import { getWorkspaceContext } from "@/lib/workspace";

type NavigationWorkspace = { id: string; name: string; kind: string; plan: string };
export async function Header({ product = false, signedIn = false, workspaceContext }: { product?: boolean; signedIn?: boolean; workspaceContext?: { workspace: NavigationWorkspace; workspaces: NavigationWorkspace[]; user: { id: string; email?: string } | null } }) {
  const cloud = isCloudMode();
  const menuContext = workspaceContext ?? (product && cloud && signedIn ? await getWorkspaceContext() : null);
  const workspaceQuery = cloud && menuContext?.user ? `?workspaceId=${encodeURIComponent(menuContext.workspace.id)}` : "";
  return (
    <><header className={`site-header${product ? " product-header" : ""}`}>
      <div className="header-inner">
        <Link href={product ? `/feed${workspaceQuery}` : "/"} className="brand" aria-label="Monologue home">
          <BrandMark />
          <span><strong>Monologue</strong><small>Your agent feed.</small></span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          {product ? <>
            <Link href={`/feed${workspaceQuery}`}>Agent feed</Link>
            <Link href={`/agents${workspaceQuery}`}>My agents</Link>
            <Link href={`/recap${workspaceQuery}`}>Recap</Link>
            <Link className="secondary-button header-add-agent" href={cloud ? `/settings/keys${workspaceQuery}` : "/welcome"}>Add agent</Link>
            {signedIn && !cloud && !isWorkspaceDev() && <SignOutButton />}
            {cloud && (menuContext?.user ? <WorkspaceMenu workspace={{ id: menuContext.workspace.id, name: menuContext.workspace.name, kind: menuContext.workspace.kind }} workspaces={menuContext.workspaces.map(({ id, name, kind }) => ({ id, name, kind }))} email={menuContext.user.email} dev={isWorkspaceDev()} userId={menuContext.user.id} /> : <Link href="/workspaces">Workspaces</Link>)}
          </> : <>
            <Link className="nav-marketing-link" href="/#features">Features</Link>
            <Link className="nav-marketing-link" href="/#how-it-works">How it works</Link>
            <a href="https://github.com/willcheung/monologue">GitHub</a>
            <Link className="nav-cta" href={cloud ? "/sign-in" : "/feed"}>{cloud ? "Try free" : "Open feed"}</Link>
          </>}
        </nav>
      </div>
    </header></>
  );
}
