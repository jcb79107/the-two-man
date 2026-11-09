import { offseason } from "../src/site-mode";
import type { Metadata } from "next";
import { PreviewProvider } from "../src/store";
import "@fontsource/anton/latin-400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: offseason ? "The Two-Man" : "The Two-Man • Season 02",
    template: "%s • The Two-Man",
  },
  description: offseason
    ? "The Two-Man golf tournament. Explore the 2026 results, champions and playoff bracket. Season 2 details coming this winter."
    : "Season 2 preview with an official, read-only Season 1 archive.",
  metadataBase: new URL("https://www.thetwoman.site"),
  openGraph: {
    title: "The Two-Man",
    description:
      "Season 1 in the books. Explore the results and championship bracket.",
    images: ["/two-man-mark.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  robots: { index: offseason, follow: offseason },
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
