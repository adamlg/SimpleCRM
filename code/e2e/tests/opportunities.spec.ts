import { test, expect } from "./fixtures";
import {
    createLeadViaUi,
    createOpportunityViaUi,
    fillOpportunityForm,
    leadRow,
    showOpportunities,
} from "./helpers";

test.describe("Opportunities on leads", () => {
    test("views opportunities for a lead", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const opportunity = {
            name: "E2E View Opp",
            value: "15000",
        };

        await createOpportunityViaUi(page, lead, opportunity);
        await showOpportunities(page, lead);

        await expect(page.getByText(opportunity.name)).toBeVisible();
        await expect(page.getByText("$15,000.00")).toBeVisible();
    });

    test("adds an opportunity to a lead", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const opportunity = {
            name: "E2E New Deal",
            value: "25000",
            region: "NA",
        };

        await createOpportunityViaUi(page, lead, opportunity);
        await showOpportunities(page, lead);

        await expect(page.getByText(opportunity.name)).toBeVisible();
        await expect(page.getByText("$25,000.00")).toBeVisible();
    });

    test("edits an opportunity from the lead row", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const original = {
            name: "E2E Original Deal",
            value: "12000",
        };
        const updatedName = "E2E Updated Deal";

        await createOpportunityViaUi(page, lead, original);
        await showOpportunities(page, lead);

        await page
            .locator("div.border.rounded")
            .filter({ hasText: original.name })
            .getByRole("button", { name: "Edit" })
            .click();
        await fillOpportunityForm(page, "Edit Opportunity", {
            name: updatedName,
            value: original.value,
        });
        await page.getByRole("dialog", { name: "Edit Opportunity" }).getByRole("button", { name: "Save" }).click();
        await expect(page.getByRole("dialog", { name: "Edit Opportunity" })).not.toBeVisible();

        await expect(page.getByText(updatedName)).toBeVisible();
        await expect(page.getByText(original.name)).not.toBeVisible();
    });
});
