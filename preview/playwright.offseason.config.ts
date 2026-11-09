import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/offseason",
  fullyParallel: true,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3038", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "PORT=3038 npm start",
    url: "http://127.0.0.1:3038",
    reuseExistingServer: false,
  },
});
