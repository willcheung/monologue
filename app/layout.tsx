import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monologue — Your agent feed",
  description: "One place to see what your AI agents did.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
