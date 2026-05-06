import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClarityScript } from "@/components/clarity-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Two Man",
  description:
    "Mobile-first tournament operating system for The Two Man.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/apple-touch-icon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sand text-ink antialiased">
        <div className="relative isolate min-h-screen overflow-hidden">
          {children}
        </div>
        <ClarityScript />
        <SpeedInsights />
      </body>
    </html>
  );
}
