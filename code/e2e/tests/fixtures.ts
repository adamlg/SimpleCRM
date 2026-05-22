import { test as base, expect } from "@playwright/test";
import { resetE2eDb } from "./helpers";

export const test = base;

test.beforeEach(async ({ request }) => {
    await resetE2eDb(request);
});

export { expect };
