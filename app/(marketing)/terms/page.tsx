import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = { title: "Terms of Service", description: "Terms of Service published by this installation’s operator." };

export default async function Page() {
  await connection();
  return <LegalDocument kind="terms" />;
}
