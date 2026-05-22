import { test, expect } from "@playwright/test";
import {
    createLeadViaUi,
    createOpportunityViaUi,
    currentMonthLabel,
    forecastMonthButton,
    goToForecast,
    isoCloseDateInForecastMonth,
} from "./helpers";

test.describe("Close forecast", () => {
    test("shows opportunities in the month bucket for their expected close date", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const closeDate = isoCloseDateInForecastMonth();
        const monthLabel = currentMonthLabel();
        const dealName = "E2E Forecast Deal";

        await createOpportunityViaUi(page, lead, {
            name: dealName,
            value: "50000",
            expectedCloseDate: closeDate,
        });

        await goToForecast(page);

        const monthRow = forecastMonthButton(page, monthLabel);
        await expect(monthRow).toBeVisible();
        await monthRow.click();

        const flyout = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: monthLabel }) });
        await expect(flyout).toBeVisible();
        const oppCard = flyout.locator("div.border").filter({ hasText: dealName });
        await expect(oppCard).toBeVisible();
        await expect(oppCard.getByText(`${lead.firstName} ${lead.lastName}`)).toBeVisible();
        await expect(oppCard.getByText(`Close: ${closeDate}`)).toBeVisible();
    });

    test("groups forecast rows by opportunity custom field", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const closeDate = isoCloseDateInForecastMonth();
        const monthLabel = currentMonthLabel();
        const naDeal = "E2E NA Deal";
        const emeaDeal = "E2E EMEA Deal";

        await createOpportunityViaUi(page, lead, {
            name: naDeal,
            value: "10000",
            expectedCloseDate: closeDate,
            region: "NA",
        });
        await createOpportunityViaUi(page, lead, {
            name: emeaDeal,
            value: "20000",
            expectedCloseDate: closeDate,
            region: "EMEA",
        });

        await goToForecast(page);
        await page.getByLabel("Group by").selectOption({ label: "Region" });
        await expect(page.getByText(`Grouped by Region`)).toBeVisible();

        const naGroupRow = page.getByRole("button", { name: /View 1 opportunity for NA/i });
        const emeaGroupRow = page.getByRole("button", { name: /View 1 opportunity for EMEA/i });
        await expect(naGroupRow).toBeVisible();
        await expect(emeaGroupRow).toBeVisible();

        await naGroupRow.click();

        const flyout = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: `${monthLabel} · NA` }) });
        await expect(flyout.getByText(naDeal)).toBeVisible();
        await expect(flyout.getByText(emeaDeal)).not.toBeVisible();
    });
});
