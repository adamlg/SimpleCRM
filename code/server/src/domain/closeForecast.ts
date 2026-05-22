import { EntityManager, In } from "typeorm";
import { Opportunity } from "../entity/Opportunity";
import {
    buildBucketCaseClauses,
    buildCloseForecastBucketDefs,
    buildForecastDateContext,
    buildGroupKeySql,
    CloseForecastBucket,
    CloseForecastGroup,
    groupKeyToLabel,
    isValidBucketKey,
    sortCloseForecastGroups,
} from "./bucketOpportunitiesByCloseMonth";
import { resolveOpportunityGroupByField } from "./closeForecastGroupBy";

interface CloseForecastRow {
    bucketKey: string;
    count: number;
    expectedValue: number;
}

interface CloseForecastGroupedRow extends CloseForecastRow {
    groupKey: string;
}

interface OpportunityIdRow {
    id: number;
}

function statusWhereClause(includeClosed: boolean): string {
    return includeClosed ? "1 = 1" : "s.status = 'pending'";
}

function caseParams(ctx: ReturnType<typeof buildForecastDateContext>): [string, string] {
    return [ctx.todayIso, ctx.sixPlusStartIso];
}

/** Original forecast: one row per close period, no custom-field dimension. */
async function getCloseForecastFlat(
    manager: EntityManager,
    includeClosed: boolean,
    referenceDate: Date
): Promise<CloseForecastBucket[]> {
    const ctx = buildForecastDateContext(referenceDate);
    const caseClauses = buildBucketCaseClauses(ctx.monthBuckets);
    const whereClause = statusWhereClause(includeClosed);

    const sql = `
        SELECT bucket_key AS bucketKey,
               COUNT(*) AS count,
               SUM(COALESCE(expectedValue, 0)) AS expectedValue
        FROM (
            SELECT o.expectedValue AS expectedValue,
                   CASE ${caseClauses.join(" ")} END AS bucket_key
            FROM opportunity o
            INNER JOIN stage s ON o.stageId = s.id
            WHERE ${whereClause}
        )
        GROUP BY bucket_key
    `;

    const rows = (await manager.query(sql, caseParams(ctx))) as CloseForecastRow[];
    return mergeFlatForecastRows(rows, referenceDate);
}

function mergeFlatForecastRows(rows: CloseForecastRow[], referenceDate: Date): CloseForecastBucket[] {
    const defs = buildCloseForecastBucketDefs(referenceDate);
    const totalsByKey = new Map(rows.map(row => [row.bucketKey, row]));

    return defs.map(def => {
        const row = totalsByKey.get(def.key);
        return {
            key: def.key,
            label: def.label,
            count: row ? Number(row.count) : 0,
            expectedValue: row ? Number(row.expectedValue) : 0,
        };
    });
}

/**
 * Same close-period buckets as flat mode, plus a groups[] breakdown per period.
 * SQL groups by (bucket_key, group_key); we then sum rows per bucket for parent totals
 * and attach the per-group counts separately (parent total must equal sum of groups).
 */
async function getCloseForecastGrouped(
    manager: EntityManager,
    includeClosed: boolean,
    fieldName: string,
    fieldLabel: string,
    referenceDate: Date
): Promise<CloseForecastBucket[]> {
    const ctx = buildForecastDateContext(referenceDate);
    const caseClauses = buildBucketCaseClauses(ctx.monthBuckets);
    const whereClause = statusWhereClause(includeClosed);
    const groupKeySql = buildGroupKeySql(fieldName);

    const sql = `
        SELECT bucket_key AS bucketKey,
               group_key AS groupKey,
               COUNT(*) AS count,
               SUM(COALESCE(expectedValue, 0)) AS expectedValue
        FROM (
            SELECT o.expectedValue AS expectedValue,
                   CASE ${caseClauses.join(" ")} END AS bucket_key,
                   ${groupKeySql} AS group_key
            FROM opportunity o
            INNER JOIN stage s ON o.stageId = s.id
            WHERE ${whereClause}
        )
        GROUP BY bucket_key, group_key
    `;

    const rows = (await manager.query(sql, caseParams(ctx))) as CloseForecastGroupedRow[];
    // One SQL row per (period, group); roll up to period-level totals for the parent table row.
    const totalsByBucket = new Map<string, CloseForecastRow>();
    for (const row of rows) {
        const existing = totalsByBucket.get(row.bucketKey);
        if (existing) {
            existing.count = Number(existing.count) + Number(row.count);
            existing.expectedValue = Number(existing.expectedValue) + Number(row.expectedValue);
        } else {
            totalsByBucket.set(row.bucketKey, {
                bucketKey: row.bucketKey,
                count: Number(row.count),
                expectedValue: Number(row.expectedValue),
            });
        }
    }
    const flat = mergeFlatForecastRows([...totalsByBucket.values()], referenceDate);

    const groupsByBucket = new Map<string, CloseForecastGroup[]>();
    for (const row of rows) {
        const group: CloseForecastGroup = {
            key: row.groupKey,
            label: groupKeyToLabel(row.groupKey, fieldLabel),
            count: Number(row.count),
            expectedValue: Number(row.expectedValue),
        };
        const existing = groupsByBucket.get(row.bucketKey) ?? [];
        existing.push(group);
        groupsByBucket.set(row.bucketKey, existing);
    }

    return flat.map(bucket => {
        const groups = groupsByBucket.get(bucket.key);
        if (!groups || groups.length === 0) return bucket;
        return { ...bucket, groups: sortCloseForecastGroups(groups) };
    });
}

export async function getCloseForecast(
    manager: EntityManager,
    includeClosed: boolean,
    groupBy?: string,
    referenceDate: Date = new Date()
): Promise<CloseForecastBucket[]> {
    const field = await resolveOpportunityGroupByField(manager, groupBy);
    // No groupBy (or empty string from UI) → do not run grouped SQL at all.
    if (!field) {
        return getCloseForecastFlat(manager, includeClosed, referenceDate);
    }
    return getCloseForecastGrouped(manager, includeClosed, field.name, field.label, referenceDate);
}

export async function getCloseForecastOpportunities(
    manager: EntityManager,
    bucketKey: string,
    includeClosed: boolean,
    groupBy?: string,
    groupKey?: string,
    referenceDate: Date = new Date()
): Promise<Opportunity[]> {
    if (!isValidBucketKey(bucketKey, referenceDate)) {
        throw new Error("invalid bucket");
    }

    const field = await resolveOpportunityGroupByField(manager, groupBy);
    const ctx = buildForecastDateContext(referenceDate);
    const caseClauses = buildBucketCaseClauses(ctx.monthBuckets);
    const whereClause = statusWhereClause(includeClosed);
    const params: (string | number)[] = [...caseParams(ctx), bucketKey];

    // When groupBy is active but group is omitted, return every opportunity in the close period
    // (parent row click). When group is set (e.g. __unset__ or "EMEA"), filter to that segment.
    let groupFilter = "";
    if (field && groupKey !== undefined && groupKey !== "") {
        groupFilter = `AND ${buildGroupKeySql(field.name)} = ?`;
        params.push(groupKey);
    }

    const sql = `
        SELECT o.id AS id
        FROM opportunity o
        INNER JOIN stage s ON o.stageId = s.id
        WHERE ${whereClause}
          AND (CASE ${caseClauses.join(" ")} END) = ?
          ${groupFilter}
        ORDER BY o.expectedCloseDate IS NULL, o.expectedCloseDate ASC, o.id ASC
    `;

    const idRows = (await manager.query(sql, params)) as OpportunityIdRow[];
    if (idRows.length === 0) return [];

    const ids = idRows.map(row => row.id);
    const opportunities = await manager.getRepository(Opportunity).find({ where: { id: In(ids) } });
    const byId = new Map(opportunities.map(opp => [opp.id, opp]));
    return ids.map(id => byId.get(id)!).filter(Boolean);
}

export { InvalidGroupByFieldError } from "./closeForecastGroupBy";
export type { CloseForecastGroup } from "./bucketOpportunitiesByCloseMonth";
