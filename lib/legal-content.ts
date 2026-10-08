import "server-only";
import { z } from "zod";

export type LegalKind = "terms" | "privacy";
export type LegalNode = string | {
  tag: "p" | "section" | "h2" | "h3" | "a" | "strong" | "em" | "ul" | "li";
  href?: string;
  children: LegalNode[];
};

const safeLink = (value: string) => {
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
};
const nodeSchema: z.ZodType<LegalNode> = z.lazy(() => z.union([
  z.string().max(20_000),
  z.object({
    tag: z.enum(["p", "section", "h2", "h3", "a", "strong", "em", "ul", "li"]),
    href: z.string().max(2048).refine(safeLink).optional(),
    children: z.array(nodeSchema).max(200),
  }).strict().refine(node => node.tag === "a" || node.href === undefined),
]));
const documentSchema = z.object({ updated: z.string().min(1).max(80), nodes: z.array(nodeSchema).min(1).max(100) }).strict();

export function getLegalDocument(kind: LegalKind, environment: Record<string, string | undefined> = process.env) {
  const key = kind === "terms" ? "MONOLOGUE_TERMS_DOCUMENT" : "MONOLOGUE_PRIVACY_DOCUMENT";
  const raw = environment[key];
  if (!raw) return null;
  if (Buffer.byteLength(raw) > 32_768) throw new Error(`${key} exceeds the document size limit`);
  try { return documentSchema.parse(JSON.parse(raw)); }
  catch { throw new Error(`${key} must contain a valid legal document`); }
}

export function legalDocumentsConfigured() {
  return Boolean(getLegalDocument("terms") && getLegalDocument("privacy"));
}
