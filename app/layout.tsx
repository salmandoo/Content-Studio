import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Studio",
  description:
    "Turn one brief into ready-to-publish content across LinkedIn, Instagram, Facebook, and Blog.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-grouped text-label antialiased">
        {children}
      </body>
    </html>
  );
}
