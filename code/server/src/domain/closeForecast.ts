import { EntityManager, In } from "typeorm";
import { Opportunity } from "../entity/Opportunity";
import {
    buildBucketCaseClauses,
    buildCloseForecastBucketDefs,
    buildForecastDateContext,
    CloseForecastBucket,
    isValidBucketKey,
} from "./bucketOpportunitiesByCloseMonth";

interface CloseForecastRow {
    bucketKey: string;
    count: number;
    expectedValue: number;
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

export async function getCloseForecast(
    manager: EntityManager,
    includeClosed: boolean,
    referenceDate: Date = new Date()
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

export async function getCloseForecastOpportunities(
    manager: EntityManager,
    bucketKey: string,
    includeClosed: boolean,
    referenceDate: Date = new Date()
): Promise<Opportunity[]> {
    if (!isValidBucketKey(bucketKey, referenceDate)) {
        throw new Error("invalid bucket");
    }

    const ctx = buildForecastDateContext(referenceDate);
    const caseClauses = buildBucketCaseClauses(ctx.monthBuckets);
    const whereClause = statusWhereClause(includeClosed);

    const sql = `
        SELECT o.id AS id
        FROM opportunity o
        INNER JOIN stage s ON o.stageId = s.id
        WHERE ${whereClause}
          AND (CASE ${caseClauses.join(" ")} END) = ?
        ORDER BY o.expectedCloseDate IS NULL, o.expectedCloseDate ASC, o.id ASC
    `;

    const idRows = (await manager.query(sql, [...caseParams(ctx), bucketKey])) as OpportunityIdRow[];
    if (idRows.length === 0) return [];

    const ids = idRows.map(row => row.id);
    const opportunities = await manager.getRepository(Opportunity).find({ where: { id: In(ids) } });
    const byId = new Map(opportunities.map(opp => [opp.id, opp]));
    return ids.map(id => byId.get(id)!).filter(Boolean);
}
