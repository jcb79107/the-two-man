import type { Metadata } from "next";
import { getAppUrl } from "@/lib/server/app-url";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Two Man",
  description:
    "Mobile-first tournament operating system for The Two Man.",
  metadataBase: new URL(getAppUrl()),
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png"
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
          <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(31,107,79,0.28),transparent_62%)]" />
          <div className="absolute inset-x-0 top-16 -z-10 h-[22rem] bg-[linear-gradient(135deg,rgba(217,184,108,0.25),transparent_72%)]" />
          <div className="absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(17,32,23,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(17,32,23,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
          {children}
        </div>
      </body>
    </html>
  );
}
