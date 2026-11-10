import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/simulation",
  retries: 0,
  timeout: 120000,
  workers: 2,
  outputDir: `simulation-results/${process.env.SIMULATION_STAGE}`,
  use: { baseURL: "http://127.0.0.1:3042", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command:
      "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3042",
    url: "http://127.0.0.1:3042",
    reuseExistingServer: false,
  },
});
