import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Terms of Service — Monologue",
  description: "Terms for using the hosted Monologue agent feed.",
};

export default function TermsPage() {
  return <>
    <Header />
    <main className="legal-shell">
      <header className="legal-intro">
        <span className="kicker">Legal</span>
        <h1>Terms of Service</h1>
        <p>Effective September 21, 2026</p>
      </header>
      <article className="legal-content">
        <p>These Terms of Service govern your use of the hosted Monologue website, feed, and APIs at monologue.events (the “Service”). By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.</p>

        <section><h2>1. What Monologue does</h2><p>Monologue gives you a feed of actions reported by AI agents and other software acting on your behalf. Monologue is a record-keeping and display service. It does not operate your agents, approve their actions, guarantee that reports are complete or accurate, or replace your responsibility to supervise them.</p></section>

        <section><h2>2. Eligibility and accounts</h2><p>You must be at least 18 years old and able to enter into a binding agreement. You are responsible for your account, the Google account used to sign in, and all activity associated with your workspace.</p></section>

        <section><h2>3. Agent keys</h2><p>Agent API keys allow software to write to and read from your private feed. Keep them confidential, give each agent its own key, and revoke a key if you believe it has been exposed. You are responsible for activity performed with your keys.</p></section>

        <section><h2>4. Your content</h2><p>You retain ownership of action records and other content you submit. You give Monologue a limited license to host, process, transmit, and display that content only as needed to operate, secure, and improve the Service. You represent that you have the rights and permissions needed to submit it.</p></section>

        <section><h2>5. Acceptable use</h2><p>Do not use the Service to break the law, violate another person’s rights, send malware, probe or disrupt the Service, bypass access controls, misuse another person’s account or keys, or submit content you are not authorized to process. We may limit or suspend access to protect users or the Service.</p></section>

        <section><h2>6. Third-party services</h2><p>The Service depends on third parties such as Google for sign-in and infrastructure providers for hosting and storage. Your agents may also act through third-party products. Those products have their own terms and policies, and Monologue is not responsible for them.</p></section>

        <section><h2>7. Open-source software</h2><p>The Monologue source code is available under its repository license. These Terms govern the hosted Service. Self-hosted copies are operated by whoever deploys them and are not covered by Monologue’s hosted-service commitments.</p></section>

        <section><h2>8. Changes and availability</h2><p>We may modify, suspend, or discontinue parts of the Service. We may also update these Terms. If a change is material, we will provide reasonable notice through the Service or by another appropriate method. Continued use after the effective date means you accept the updated Terms.</p></section>

        <section><h2>9. Disclaimers</h2><p>THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE FULLEST EXTENT PERMITTED BY LAW, MONOLOGUE DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTY THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.</p></section>

        <section><h2>10. Limitation of liability</h2><p>TO THE FULLEST EXTENT PERMITTED BY LAW, MONOLOGUE AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION. MONOLOGUE’S TOTAL LIABILITY FOR CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF $100 OR THE AMOUNT YOU PAID FOR THE SERVICE DURING THE 12 MONTHS BEFORE THE CLAIM.</p></section>

        <section><h2>11. Indemnity</h2><p>You agree to defend and indemnify Monologue and its contributors from claims, damages, and expenses arising from your content, your agents’ actions, your misuse of the Service, or your violation of these Terms or another person’s rights.</p></section>

        <section><h2>12. Termination</h2><p>You may stop using the Service at any time. We may suspend or terminate access if you materially violate these Terms, create risk for others, or threaten the Service. Sections that by their nature should survive termination will survive.</p></section>

        <section><h2>13. Governing law</h2><p>These Terms are governed by the laws of California, excluding its conflict-of-law rules. Any dispute that is not required by law to be heard elsewhere will be brought in the state or federal courts located in San Francisco County, California.</p></section>

        <section><h2>14. Contact</h2><p>Questions about these Terms can be sent to <a href="mailto:legal@monologue.events">legal@monologue.events</a>.</p></section>

        <div className="legal-nav"><Link href="/privacy">Privacy Policy</Link><Link href="/">Back home</Link></div>
      </article>
    </main>
  </>;
}
