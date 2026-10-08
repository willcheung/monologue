import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/components/header", () => ({ Header: () => null }));
vi.mock("server-only", () => ({}));
import { getLegalDocument, legalDocumentsConfigured } from "@/lib/legal-content";
import { LegalDocument } from "@/components/legal-document";
const document = { updated: "January 1, 2026", nodes: [{ tag: "p", children: ["Operator-owned text <script>example</script>", { tag: "a", href: "mailto:operator@example.test", children: ["Contact"] }] }] };
afterEach(() => vi.unstubAllEnvs());
describe("operator-owned legal content", () => {
  it("works without private files or hosted policy configuration", () => {
    vi.stubEnv("MONOLOGUE_TERMS_DOCUMENT", ""); vi.stubEnv("MONOLOGUE_PRIVACY_DOCUMENT", "");
    expect(getLegalDocument("terms")).toBeNull(); expect(legalDocumentsConfigured()).toBe(false);
    const html = renderToStaticMarkup(<LegalDocument kind="terms" />);
    expect(html).toContain("operator has not published"); expect(html).not.toContain("Updated");
  });
  it("renders configured documents as escaped text and requires both for agreement notice", () => {
    vi.stubEnv("MONOLOGUE_TERMS_DOCUMENT", JSON.stringify(document)); vi.stubEnv("MONOLOGUE_PRIVACY_DOCUMENT", "");
    const html = renderToStaticMarkup(<LegalDocument kind="terms" />);
    expect(html).toContain("&lt;script&gt;example&lt;/script&gt;"); expect(html).not.toContain("<script>");
    expect(html).toContain('href="mailto:operator@example.test"'); expect(legalDocumentsConfigured()).toBe(false);
    vi.stubEnv("MONOLOGUE_PRIVACY_DOCUMENT", JSON.stringify(document)); expect(legalDocumentsConfigured()).toBe(true);
  });
  it("rejects executable tags, unsafe URLs and unapproved attributes", () => {
    for (const node of [{ tag: "script", children: ["example"] }, { tag: "a", href: "javascript:alert(1)", children: [] }, { tag: "a", href: "//example.test", children: [] }, { tag: "p", onClick: "example", children: [] }]) {
      expect(() => getLegalDocument("privacy", { MONOLOGUE_PRIVACY_DOCUMENT: JSON.stringify({ updated: "January 1, 2026", nodes: [node] }) })).toThrow("valid legal document");
    }
  });
  it("rejects malformed and oversized configuration without printing its contents", () => {
    expect(() => getLegalDocument("terms", { MONOLOGUE_TERMS_DOCUMENT: "private-invalid-value" })).toThrow("valid legal document");
    expect(() => getLegalDocument("terms", { MONOLOGUE_TERMS_DOCUMENT: "x".repeat(32769) })).toThrow("size limit");
  });
});
