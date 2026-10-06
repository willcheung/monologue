import type { Metadata } from "next";
import { connection } from "next/server";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = { title: "Privacy Policy", description: "Privacy Policy published by this installation’s operator." };

export default async function Page() {
  await connection();
  return <LegalDocument kind="privacy" />;
}
