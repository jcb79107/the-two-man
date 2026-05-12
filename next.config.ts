import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd())
};

export default withSentryConfig(nextConfig, {
  org: "jason-baer",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN
  },
  tunnelRoute: "/monitoring",
  webpack: {
    treeshake: {
      removeDebugLogging: true
    }
  },
  silent: !process.env.CI
});
