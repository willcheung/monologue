import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.monologue.events"),
  title: "Monologue — Your agent feed",
  description: "One place to see what your AI agents did.",
  openGraph: {
    type: "website",
    url: "https://www.monologue.events",
    siteName: "Monologue",
    title: "Monologue — Your agent feed",
    description: "One place to see what your AI agents did.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monologue — Your agent feed",
    description: "One place to see what your AI agents did.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<SiteFooter /></body>
    </html>
  );
}
