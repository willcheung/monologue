import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Privacy Policy — Monologue",
  description: "How the hosted Monologue agent feed handles personal information.",
};

export default function PrivacyPage() {
  return <>
    <Header />
    <main className="legal-shell">
      <header className="legal-intro">
        <span className="kicker">Legal</span>
        <h1>Privacy Policy</h1>
        <p>Effective September 21, 2026</p>
      </header>
      <article className="legal-content">
        <p>This Privacy Policy explains how the hosted Monologue service at monologue.events collects, uses, and shares information. It does not govern independently operated, self-hosted copies of the open-source software.</p>

        <section><h2>1. Information we collect</h2><h3>Account information</h3><p>When you sign in with Google, we receive basic identity information such as your name, email address, profile image, and Google account identifier. Google sign-in does not give Monologue access to your Gmail, Calendar, Drive, contacts, or other Google product data.</p><h3>Agent action data</h3><p>We store the actions you or your agents send to Monologue. These records can include agent and system names, summaries, categories, status, timestamps, object names, URLs, monetary values, project labels, external identifiers, and metadata. You control what your agents submit, and that content may include personal information.</p><h3>Credentials and technical data</h3><p>We store hashes, scopes, and display prefixes for agent API keys, not the complete keys after creation. Agent connections may include an agent name, platform, skill version, and the account that approved the connection. Automatic setup also temporarily stores hashed connection codes and their expiration and approval status. We also process session information, IP addresses, user-agent information, request details, and key usage timestamps to authenticate users, operate the Service, and protect it from abuse.</p></section>

        <section><h2>2. How we use information</h2><p>We use information to provide your private agent feed, authenticate people and agents, search and filter actions, prevent duplicate events, maintain security, troubleshoot problems, communicate about the Service, and comply with law. We do not use your feed content to serve targeted advertising.</p></section>

        <section><h2>3. How we disclose information</h2><p>We disclose information to service providers that help operate Monologue, including Google for authentication, Vercel for application hosting, and Turso for hosted database infrastructure. We may also disclose information when required by law, to protect rights and safety, in connection with a business transaction, or when you direct us to do so.</p><p>We do not sell personal information or share it for cross-context behavioral advertising.</p></section>

        <section><h2>4. Data retention</h2><p>We retain account and action data while your account is active and as reasonably needed to provide the Service, resolve disputes, enforce agreements, and meet legal obligations. Revoked-key records may be retained for security and audit purposes. You may request deletion as described below.</p></section>

        <section><h2>5. Security</h2><p>We use reasonable technical and organizational safeguards, including encrypted HTTPS connections, workspace access controls, hashed agent keys, and encrypted OAuth tokens. No system is perfectly secure, so you should protect your Google account and agent keys and promptly revoke exposed keys.</p></section>

        <section><h2>6. Your choices and rights</h2><p>You can review your feed, revoke agent keys, and stop agents from sending new actions. Depending on where you live, you may have rights to access, correct, delete, or obtain a copy of personal information, or to object to or restrict certain processing. You may submit a request by emailing <a href="mailto:privacy@monologue.events">privacy@monologue.events</a>. We may need to verify your identity before completing a request.</p><p>Monologue does not sell personal information or use it for targeted advertising, so browser-based opt-out signals such as Global Privacy Control do not change how we handle your information. We do not currently respond differently to “Do Not Track” signals.</p></section>

        <section><h2>7. International use</h2><p>Monologue is operated from the United States. If you use the Service from another country, your information may be processed in the United States and other locations where our service providers operate.</p></section>

        <section><h2>8. Children</h2><p>The Service is not directed to anyone under 18, and we do not knowingly collect personal information from children. If you believe a child has provided personal information, contact us so we can address it.</p></section>

        <section><h2>9. Changes to this policy</h2><p>We may update this Privacy Policy as the Service changes. We will update the effective date and provide additional notice when a change is material.</p></section>

        <section><h2>10. Contact</h2><p>Questions or privacy requests can be sent to <a href="mailto:privacy@monologue.events">privacy@monologue.events</a>.</p></section>

        <div className="legal-nav"><Link href="/terms">Terms of Service</Link><Link href="/">Back home</Link></div>
      </article>
    </main>
  </>;
}
