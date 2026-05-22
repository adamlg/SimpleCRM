import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

export type LeadDetails = {
    firstName: string;
    lastName: string;
    age: string;
    phoneNumber: string;
};

export type OpportunityDetails = {
    name: string;
    value: string;
    expectedCloseDate?: string;
    region?: string;
    headcount?: string;
};

function uniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueSuffix(): string {
    return uniqueId();
}

export async function resetE2eDb(request: APIRequestContext): Promise<void> {
    const response = await request.post("/api/e2e/reset");
    if (!response.ok()) {
        throw new Error(`E2E reset failed: ${response.status()} ${await response.text()}`);
    }
}

export function currentMonthLabel(date = new Date()): string {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

/** Last day of the current month — always on or after today, so it lands in this month's forecast bucket. */
export function isoCloseDateInForecastMonth(): string {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, "0");
    const day = String(end.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function forecastTable(page: Page): Locator {
    return page.getByRole("table", {
        name: /Click a row with opportunities to open the list in a side panel/i,
    });
}

/** Clickable forecast bucket/group row (a <tr> with tabindex, not a <button>). */
export function forecastClickableRow(page: Page, periodOrGroupLabel: string): Locator {
    return forecastTable(page)
        .locator('tbody tr[tabindex="0"]')
        .filter({ has: page.getByRole("cell", { name: periodOrGroupLabel, exact: true }) });
}

/** Group row nested under a specific close-period bucket (avoids duplicate labels across months). */
export function forecastClickableGroupRow(page: Page, bucketLabel: string, groupLabel: string): Locator {
    const bucketRow = forecastTable(page)
        .locator("tbody tr")
        .filter({ has: page.getByRole("cell", { name: bucketLabel, exact: true }) })
        .first();
    return bucketRow
        .locator("xpath=following-sibling::tr[@tabindex='0'][.//td[contains(@class,'pl-8')]]")
        .filter({ has: page.getByRole("cell", { name: groupLabel, exact: true }) })
        .first();
}

export async function waitForForecastTable(page: Page): Promise<void> {
    await expect(page.getByText("Loading forecast...")).not.toBeVisible({ timeout: 15_000 });
    await expect(forecastTable(page)).toBeVisible();
}

export async function goToHome(page: Page): Promise<void> {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
}

export async function goToForecast(page: Page): Promise<void> {
    await page.goto("/");
    await page.getByRole("button", { name: "Forecast" }).click();
    await expect(page.getByRole("heading", { name: "Forecast by close month" })).toBeVisible();
    await waitForForecastTable(page);
}

export async function createLeadViaUi(page: Page, overrides: Partial<LeadDetails> = {}): Promise<LeadDetails> {
    const id = uniqueId();
    const lead: LeadDetails = {
        firstName: overrides.firstName ?? `E2E-${id}`,
        lastName: overrides.lastName ?? "Lead",
        age: overrides.age ?? "30",
        phoneNumber: overrides.phoneNumber ?? "555-0100",
    };

    await goToHome(page);
    await page.getByRole("button", { name: "Add Lead" }).click();
    const dialog = page.getByRole("dialog", { name: "Add Lead" });
    await dialog.getByLabel("First name").fill(lead.firstName);
    await dialog.getByLabel("Last name").fill(lead.lastName);
    await dialog.getByLabel("Age").fill(lead.age);
    await dialog.getByLabel("Phone number").fill(lead.phoneNumber);
    await dialog.getByRole("button", { name: "Add Lead" }).click();
    await expect(dialog).not.toBeVisible();

    return lead;
}

export function leadRow(page: Page, lead: Pick<LeadDetails, "firstName" | "lastName">): Locator {
    return page.getByRole("row").filter({ hasText: lead.firstName }).filter({ hasText: lead.lastName });
}

export async function fillOpportunityForm(page: Page, dialogName: string, details: OpportunityDetails): Promise<void> {
    const dialog = page.getByRole("dialog", { name: dialogName });
    await dialog.getByPlaceholder("Deal name").fill(details.name);
    await dialog.locator('input[type="number"][required]').fill(details.value);
    if (details.expectedCloseDate) {
        await dialog.locator('input[type="date"]').fill(details.expectedCloseDate);
    }
    if (details.region) {
        await dialog.locator("div").filter({ hasText: /^Region$/ }).locator("input").fill(details.region);
    }
    if (details.headcount) {
        await dialog.locator("div").filter({ hasText: /^Headcount$/ }).locator("input").fill(details.headcount);
    }
}

export async function createOpportunityViaUi(
    page: Page,
    lead: LeadDetails,
    details: OpportunityDetails
): Promise<void> {
    await leadRow(page, lead).getByRole("button", { name: "Add Opp" }).click();
    await fillOpportunityForm(page, "Add Opportunity", details);
    await page.getByRole("dialog", { name: "Add Opportunity" }).getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("dialog", { name: "Add Opportunity" })).not.toBeVisible();
}

export async function showOpportunities(page: Page, lead: LeadDetails): Promise<void> {
    const row = leadRow(page, lead);
    await row.getByRole("button", { name: "Show Opps" }).click();
    await expect(row.getByRole("button", { name: "Hide Opps" })).toBeVisible();
}
