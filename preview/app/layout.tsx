import type { Metadata } from "next";
import { PreviewProvider } from "../src/store";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "The Two-Man • Season 02", template: "%s • The Two-Man" },
  description:
    "An independent Season 2 preview with fictional tournament data.",
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
