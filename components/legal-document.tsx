import { createElement, type ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { getLegalDocument, type LegalKind, type LegalNode } from "@/lib/legal-content";

function renderNode(node: LegalNode, key: number): ReactNode {
  if (typeof node === "string") return node;
  return createElement(node.tag, { key, ...(node.href && { href: node.href }) }, node.children.map(renderNode));
}

export function LegalDocument({ kind }: { kind: LegalKind }) {
  const document = getLegalDocument(kind);
  const title = kind === "terms" ? "Terms of Service" : "Privacy Policy";
  return <>
    <Header />
    <main className="legal-shell">
      <header className="legal-intro">
        <span className="kicker">Legal</span>
        <h1>{title}</h1>
        {document && <p>Updated {document.updated}</p>}
      </header>
      <article className="legal-content">
        {document ? document.nodes.map(renderNode) : <p>This installation’s operator has not published a {kind === "terms" ? "Terms of Service document" : "Privacy Policy"}. Contact the operator for its policies. The software license covers the code; it does not supply terms or privacy commitments for independently operated services.</p>}
        <div className="legal-nav"><Link href={kind === "terms" ? "/privacy" : "/terms"}>{kind === "terms" ? "Privacy Policy" : "Terms of Service"}</Link><Link href="/">Back home</Link></div>
      </article>
    </main>
  </>;
}
