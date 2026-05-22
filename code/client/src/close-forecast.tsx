import axios from "axios";
import { Fragment, useCallback, useEffect, useState } from "react";
import { OpportunityModal } from "./edit-opportunity-modal";
import { CloseForecastBucket, CloseForecastGroup, CustomField, Opportunity } from "./types";

// Flyout target: a close period, optionally narrowed to one custom-field value (group.key).
// group null = parent row → API omits ?group and returns all opportunities in the period.
interface ForecastSelection {
    bucket: CloseForecastBucket;
    group: CloseForecastGroup | null;
}

export const CloseForecast: React.FC = () => {
    const [buckets, setBuckets] = useState<CloseForecastBucket[]>([]);
    const [includeClosed, setIncludeClosed] = useState(false);
    const [groupByField, setGroupByField] = useState<string | null>(null);
    const [opportunityFields, setOpportunityFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState<ForecastSelection | null>(null);
    const [bucketOpportunities, setBucketOpportunities] = useState<Opportunity[]>([]);
    const [loadingOpportunities, setLoadingOpportunities] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

    useEffect(() => {
        const loadFields = async () => {
            const result = await axios.get("/api/custom-fields");
            setOpportunityFields(result.data.filter((f: CustomField) => (f.entity ?? "lead") === "opportunity"));
        };
        loadFields();
    }, []);

    const fetchForecast = useCallback(async () => {
        const result = await axios.get("/api/forecast-by-close", {
            params: {
                includeClosed,
                ...(groupByField ? { groupBy: groupByField } : {}),
            },
        });
        setBuckets(result.data);
    }, [includeClosed, groupByField]);

    const fetchBucketOpportunities = useCallback(async () => {
        if (!selection) return;
        setLoadingOpportunities(true);
        const result = await axios.get("/api/forecast-by-close/opportunities", {
            params: {
                bucket: selection.bucket.key,
                includeClosed,
                // groupBy tells the server which field to use; group only when a sub-row was clicked.
                ...(groupByField ? { groupBy: groupByField } : {}),
                ...(selection.group ? { group: selection.group.key } : {}),
            },
        });
        setBucketOpportunities(result.data);
        setLoadingOpportunities(false);
    }, [selection, includeClosed, groupByField]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchForecast();
            setLoading(false);
        };
        load();
    }, [fetchForecast]);

    // Changing filters invalidates the open flyout (bucket/group keys may no longer match).
    useEffect(() => {
        setSelection(null);
    }, [groupByField, includeClosed]);

    useEffect(() => {
        if (!selection) {
            setBucketOpportunities([]);
            return;
        }
        fetchBucketOpportunities();
    }, [selection, fetchBucketOpportunities]);

    const handleOpportunitySaved = async () => {
        setEditingOpportunity(null);
        await Promise.all([fetchForecast(), fetchBucketOpportunities()]);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    const openSelection = (bucket: CloseForecastBucket, group: CloseForecastGroup | null) => {
        const count = group ? group.count : bucket.count;
        if (count === 0) return;
        setSelection({ bucket, group });
    };

    const closeFlyout = () => setSelection(null);

    const flyoutTitle = () => {
        if (!selection) return "";
        if (selection.group) return `${selection.bucket.label} · ${selection.group.label}`;
        return selection.bucket.label;
    };

    const groupByLabel = groupByField ? opportunityFields.find(f => f.name === groupByField)?.label : null;

    const isRowSelected = (bucketKey: string, groupKey: string | null) =>
        selection?.bucket.key === bucketKey && (selection.group?.key ?? null) === groupKey;

    if (loading) return <p>Loading forecast...</p>;

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Forecast by close month</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {includeClosed ? "Showing open & closed opportunities" : "Showing open opportunities only"}
                        {groupByLabel && ` · Grouped by ${groupByLabel}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeClosed}
                            onChange={e => setIncludeClosed(e.target.checked)}
                            className="rounded"
                        />
                        <span className="text-sm font-medium">Include closed opportunities</span>
                    </label>

                    <label className="flex items-center gap-2">
                        <span className="text-sm font-medium">Group by</span>
                        <select
                            value={groupByField ?? ""}
                            onChange={e => setGroupByField(e.target.value || null)}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="">No grouping</option>
                            {opportunityFields.map(field => (
                                <option key={field.id} value={field.name}>
                                    {field.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-2 text-left">{groupByField ? "Close period / group" : "Close period"}</th>
                            <th className="border p-2 text-right">Count</th>
                            <th className="border p-2 text-right">Expected value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {buckets.map(bucket => {
                            const hasGroups = Boolean(bucket.groups?.length);
                            const parentSelected = isRowSelected(bucket.key, null);
                            const parentClickable = bucket.count > 0;
                            return (
                                <Fragment key={bucket.key}>
                                    <tr
                                        onClick={() => openSelection(bucket, null)}
                                        className={[
                                            bucket.key === "past" ? "bg-amber-50" : "",
                                            parentSelected ? "ring-2 ring-inset ring-blue-500" : "",
                                            parentClickable ? "cursor-pointer hover:bg-blue-50" : "",
                                            hasGroups ? "font-medium" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    >
                                        <td className="border p-2">{bucket.label}</td>
                                        <td className="border p-2 text-right">{bucket.count}</td>
                                        <td className="border p-2 text-right font-mono font-bold">
                                            {formatCurrency(bucket.expectedValue)}
                                        </td>
                                    </tr>
                                    {bucket.groups?.map(group => {
                                        const groupSelected = isRowSelected(bucket.key, group.key);
                                        const groupClickable = group.count > 0;
                                        return (
                                            <tr
                                                key={`${bucket.key}-${group.key}`}
                                                onClick={() => openSelection(bucket, group)}
                                                className={[
                                                    groupSelected ? "ring-2 ring-inset ring-blue-500 bg-blue-50" : "bg-gray-50",
                                                    groupClickable ? "cursor-pointer hover:bg-blue-100" : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                            >
                                                <td className="border p-2 pl-8 text-gray-700">{group.label}</td>
                                                <td className="border p-2 text-right">{group.count}</td>
                                                <td className="border p-2 text-right font-mono">
                                                    {formatCurrency(group.expectedValue)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selection && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 bg-black/30"
                        aria-label="Close opportunity list"
                        onClick={closeFlyout}
                    />
                    <aside
                        className="fixed top-0 right-0 z-40 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
                        role="dialog"
                        aria-labelledby="forecast-flyout-title"
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <h3 id="forecast-flyout-title" className="text-lg font-bold">
                                {flyoutTitle()}
                            </h3>
                            <button
                                type="button"
                                onClick={closeFlyout}
                                className="text-gray-500 hover:text-gray-700 text-2xl leading-none px-2"
                                aria-label="Close"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingOpportunities ? (
                                <p className="text-sm text-gray-600">Loading opportunities...</p>
                            ) : bucketOpportunities.length === 0 ? (
                                <p className="text-sm text-gray-500">No opportunities</p>
                            ) : (
                                <div className="space-y-2">
                                    {bucketOpportunities.map(opp => (
                                        <div
                                            key={opp.id}
                                            className="flex justify-between items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded"
                                        >
                                            <div className="text-sm space-y-1 min-w-0">
                                                <p className="font-medium">{opp.name || "Unnamed"}</p>
                                                <p className="text-gray-600">
                                                    {opp.lead.firstName} {opp.lead.lastName}
                                                </p>
                                                <p className="text-gray-600">{opp.stage.name}</p>
                                                {groupByField && (
                                                    <p className="text-gray-600">
                                                        {groupByLabel}:{" "}
                                                        {opp.customFields?.[groupByField] != null &&
                                                        String(opp.customFields[groupByField]) !== ""
                                                            ? String(opp.customFields[groupByField])
                                                            : "—"}
                                                    </p>
                                                )}
                                                <p className="font-mono">{formatCurrency(opp.value)}</p>
                                                <p className="text-gray-500">Expected: {formatCurrency(opp.expectedValue ?? 0)}</p>
                                                <p className="text-gray-600">Close: {opp.expectedCloseDate ?? "—"}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditingOpportunity(opp)}
                                                className="shrink-0 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </>
            )}

            {editingOpportunity && (
                <OpportunityModal
                    leadId={editingOpportunity.lead.id}
                    opportunity={editingOpportunity}
                    onClose={() => setEditingOpportunity(null)}
                    onSaved={handleOpportunitySaved}
                />
            )}
        </>
    );
};
