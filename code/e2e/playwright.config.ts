import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "../..");
const testDbPath = path.join(e2eDir, ".test-db.sqlite");

const e2eApiPort = "3001";
const e2eClientPort = "5174";

const serverEnv = {
    E2E: "1",
    DATABASE_PATH: testDbPath,
    PORT: e2eApiPort,
};

const clientEnv = {
    VITE_API_PORT: e2eApiPort,
    VITE_DEV_PORT: e2eClientPort,
};

export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "list",
    use: {
        baseURL: `http://localhost:${e2eClientPort}`,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "chromium-watch",
            use: {
                ...devices["Desktop Chrome"],
                headless: false,
                launchOptions: { slowMo: 400 },
            },
        },
    ],
    webServer: [
        {
            command: "npm run start:e2e -w @simple-crm/server",
            cwd: repoRoot,
            url: `http://localhost:${e2eApiPort}/leads`,
            reuseExistingServer: false,
            env: serverEnv,
            timeout: 120_000,
        },
        {
            command: "npm run dev -w @simple-crm/client",
            cwd: repoRoot,
            url: `http://localhost:${e2eClientPort}`,
            reuseExistingServer: false,
            env: clientEnv,
            timeout: 120_000,
        },
    ],
});
