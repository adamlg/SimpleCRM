const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value: string): boolean {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Whether API input is allowed for opportunity expectedCloseDate (omit, clear, or YYYY-MM-DD). */
export function isValidExpectedCloseDate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
    return isRealCalendarDate(value);
}
