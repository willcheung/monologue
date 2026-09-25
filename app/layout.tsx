import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const gaegu = localFont({
  src: [
    { path: "../public/fonts/gaegu-latin-regular.woff2", weight: "400" },
    { path: "../public/fonts/gaegu-latin-bold.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--font-gaegu",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.monologue.events"),
  title: "Monologue — Your agent feed",
  description: "See what your AI agents did for you. Emails sent, purchases made, code pushed—all in one private feed.",
  openGraph: {
    type: "website",
    url: "https://www.monologue.events",
    siteName: "Monologue",
    title: "Monologue — Your agent feed",
    description: "See what your AI agents did for you. Emails sent, purchases made, code pushed—all in one private feed.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monologue — Your agent feed",
    description: "See what your AI agents did for you. Emails sent, purchases made, code pushed—all in one private feed.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={gaegu.variable}>
      <body>{children}<SiteFooter /></body>
    </html>
  );
}
