import { test, expect } from "./fixtures";
import { createLeadViaUi, leadRow } from "./helpers";

test.describe("Edit lead", () => {
    test("updates lead details in the leads table", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const updatedFirstName = `${lead.firstName}-edited`;
        const updatedAge = "99";

        await leadRow(page, lead).getByRole("button", { name: "Edit" }).click();
        const dialog = page.getByRole("dialog", { name: "Edit Lead" });

        await dialog.locator('input[type="text"]').nth(0).fill(updatedFirstName);
        await dialog.locator('input[type="text"]').nth(2).fill(updatedAge);
        await dialog.getByRole("button", { name: "Save" }).click();

        await expect(dialog).not.toBeVisible();

        const updatedRow = leadRow(page, { firstName: updatedFirstName, lastName: lead.lastName });
        await expect(updatedRow).toBeVisible();
        await expect(updatedRow).toContainText(updatedAge);
        await expect(updatedRow).toContainText(lead.phoneNumber);
    });
});
