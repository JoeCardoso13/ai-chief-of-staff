import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Allow Playwright and its webServer to pick up local secrets without manual exports.
const envLoader = (process as typeof process & {
  loadEnvFile?: (path?: string) => void;
}).loadEnvFile;

if (envLoader && existsSync(".env")) {
  envLoader(".env");
}

if (envLoader && existsSync(".env.local")) {
  envLoader(".env.local");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
