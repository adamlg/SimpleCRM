export interface DateParts {
    year: number;
    month: number;
    day: number;
}

export interface MonthBucket {
    key: string;
    label: string;
    year: number;
    month: number;
}

export interface CloseForecastBucket {
    key: string;
    label: string;
    count: number;
    expectedValue: number;
}

export function datePartsFromDate(date: Date): DateParts {
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
    };
}

export function formatIsoDate(parts: DateParts): string {
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function buildMonthBuckets(referenceDate: Date): MonthBucket[] {
    const buckets: MonthBucket[] = [];
    let year = referenceDate.getFullYear();
    let month = referenceDate.getMonth() + 1;

    for (let i = 0; i < 6; i++) {
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
        buckets.push({ key, label, year, month });
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
    }

    return buckets;
}

export function getSixPlusStart(monthBuckets: MonthBucket[]): DateParts {
    const last = monthBuckets[monthBuckets.length - 1];
    let month = last.month + 1;
    let year = last.year;
    if (month > 12) {
        month = 1;
        year++;
    }
    return { year, month, day: 1 };
}

export interface ForecastDateContext {
    monthBuckets: MonthBucket[];
    todayIso: string;
    sixPlusStartIso: string;
}

export function buildForecastDateContext(referenceDate: Date = new Date()): ForecastDateContext {
    const monthBuckets = buildMonthBuckets(referenceDate);
    return {
        monthBuckets,
        todayIso: formatIsoDate(datePartsFromDate(referenceDate)),
        sixPlusStartIso: formatIsoDate(getSixPlusStart(monthBuckets)),
    };
}

export function buildBucketCaseClauses(monthBuckets: MonthBucket[]): string[] {
    return [
        "WHEN o.expectedCloseDate IS NULL THEN 'no_date'",
        "WHEN o.expectedCloseDate < ? THEN 'past'",
        ...monthBuckets.map(b => `WHEN strftime('%Y-%m', o.expectedCloseDate) = '${b.key}' THEN '${b.key}'`),
        "WHEN o.expectedCloseDate >= ? THEN 'six_plus'",
        "ELSE 'six_plus'",
    ];
}

export function buildCloseForecastBucketDefs(referenceDate: Date): CloseForecastBucket[] {
    const monthBuckets = buildMonthBuckets(referenceDate);
    const lastMonthLabel = monthBuckets[monthBuckets.length - 1].label;

    return [
        { key: "past", label: "Past", count: 0, expectedValue: 0 },
        ...monthBuckets.map(b => ({ key: b.key, label: b.label, count: 0, expectedValue: 0 })),
        { key: "six_plus", label: `Later than ${lastMonthLabel}`, count: 0, expectedValue: 0 },
        { key: "no_date", label: "No close date", count: 0, expectedValue: 0 },
    ];
}

export function isValidBucketKey(bucketKey: string, referenceDate: Date = new Date()): boolean {
    return buildCloseForecastBucketDefs(referenceDate).some(def => def.key === bucketKey);
}
