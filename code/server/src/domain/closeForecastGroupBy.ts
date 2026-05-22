import { EntityManager } from "typeorm";
import { CustomField } from "../entity/CustomField";

// Thrown when groupBy is present but not a registered opportunity-scoped custom field.

export class InvalidGroupByFieldError extends Error {
    constructor() {
        super("invalid groupBy field");
    }
}

/**
 * Resolves the optional groupBy query param. Missing or blank → null (caller uses flat forecast).
 * Non-empty names must match a CustomField with entity "opportunity" or we reject the request.
 */
export async function resolveOpportunityGroupByField(
    manager: EntityManager,
    groupBy: string | undefined
): Promise<CustomField | null> {
    const name = groupBy?.trim();
    if (!name) return null;

    const field = await manager.getRepository(CustomField).findOne({ where: { name } });
    if (!field || field.entity !== "opportunity") {
        throw new InvalidGroupByFieldError();
    }
    return field;
}
