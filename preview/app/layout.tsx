import type { Metadata } from "next";
import { PreviewProvider } from "../src/store";
import "@fontsource/anton/latin-400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "The Two-Man • Season 02", template: "%s • The Two-Man" },
  description: "Season 2 preview with an official, read-only Season 1 archive.",
  icons: { icon: "/two-man-mark.png" },
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PreviewProvider>{children}</PreviewProvider>
      </body>
    </html>
  );
}
