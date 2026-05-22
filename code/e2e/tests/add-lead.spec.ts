import { test, expect } from "./fixtures";
import { createLeadViaUi, leadRow } from "./helpers";

test.describe("Add lead", () => {
    test("creates a lead and shows it in the leads table", async ({ page }) => {
        const lead = await createLeadViaUi(page, {
            firstName: "E2E",
            lastName: "TestLead",
            age: "42",
            phoneNumber: "555-0199",
        });

        const row = leadRow(page, lead);
        await expect(row).toBeVisible();
        await expect(row).toContainText(lead.age);
        await expect(row).toContainText(lead.phoneNumber);
    });
});
