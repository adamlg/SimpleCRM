import { test, expect } from "./fixtures";
import {
    createLeadViaUi,
    createOpportunityViaUi,
    currentMonthLabel,
    forecastClickableGroupRow,
    forecastClickableRow,
    goToForecast,
    isoCloseDateInForecastMonth,
    uniqueSuffix,
    waitForForecastTable,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("Close forecast", () => {
    test("shows opportunities in the month bucket for their expected close date", async ({ page }) => {
        const lead = await createLeadViaUi(page);
        const closeDate = isoCloseDateInForecastMonth();
        const monthLabel = currentMonthLabel();
        const dealName = `E2E Forecast Deal ${uniqueSuffix()}`;

        await createOpportunityViaUi(page, lead, {
            name: dealName,
            value: "50000",
            expectedCloseDate: closeDate,
        });

        await goToForecast(page);

        const monthRow = forecastClickableRow(page, monthLabel);
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
        const suffix = uniqueSuffix();
        const lead = await createLeadViaUi(page);
        const closeDate = isoCloseDateInForecastMonth();
        const monthLabel = currentMonthLabel();
        const naRegion = `E2E-NA-${suffix}`;
        const emeaRegion = `E2E-EMEA-${suffix}`;
        const naDeal = `E2E NA Deal ${suffix}`;
        const emeaDeal = `E2E EMEA Deal ${suffix}`;

        await createOpportunityViaUi(page, lead, {
            name: naDeal,
            value: "10000",
            expectedCloseDate: closeDate,
            region: naRegion,
        });
        await createOpportunityViaUi(page, lead, {
            name: emeaDeal,
            value: "20000",
            expectedCloseDate: closeDate,
            region: emeaRegion,
        });

        await goToForecast(page);
        await page.getByLabel("Group by").selectOption({ label: "Region" });
        await expect(page.getByText("Grouped by Region")).toBeVisible();
        await waitForForecastTable(page);

        const naGroupRow = forecastClickableGroupRow(page, monthLabel, naRegion);
        const emeaGroupRow = forecastClickableGroupRow(page, monthLabel, emeaRegion);
        await expect(naGroupRow).toBeVisible();
        await expect(emeaGroupRow).toBeVisible();

        await naGroupRow.click();

        const flyout = page
            .getByRole("dialog")
            .filter({ has: page.getByRole("heading", { name: `${monthLabel} · ${naRegion}` }) });
        const naCard = flyout.locator("div.border").filter({ hasText: naDeal });
        await expect(naCard).toBeVisible();
        await expect(flyout.getByText(emeaDeal)).not.toBeVisible();
    });
});
