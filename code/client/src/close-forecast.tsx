import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { OpportunityModal } from "./edit-opportunity-modal";
import { CloseForecastBucket, Opportunity } from "./types";

export const CloseForecast: React.FC = () => {
    const [buckets, setBuckets] = useState<CloseForecastBucket[]>([]);
    const [includeClosed, setIncludeClosed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedBucket, setSelectedBucket] = useState<CloseForecastBucket | null>(null);
    const [bucketOpportunities, setBucketOpportunities] = useState<Opportunity[]>([]);
    const [loadingOpportunities, setLoadingOpportunities] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

    const fetchForecast = useCallback(async () => {
        const result = await axios.get("/api/forecast-by-close", {
            params: { includeClosed },
        });
        setBuckets(result.data);
    }, [includeClosed]);

    const fetchBucketOpportunities = useCallback(async () => {
        if (!selectedBucket) return;
        setLoadingOpportunities(true);
        const result = await axios.get("/api/forecast-by-close/opportunities", {
            params: { bucket: selectedBucket.key, includeClosed },
        });
        setBucketOpportunities(result.data);
        setLoadingOpportunities(false);
    }, [selectedBucket, includeClosed]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchForecast();
            setLoading(false);
        };
        load();
    }, [fetchForecast]);

    useEffect(() => {
        if (!selectedBucket) {
            setBucketOpportunities([]);
            return;
        }
        fetchBucketOpportunities();
    }, [selectedBucket, fetchBucketOpportunities]);

    const handleOpportunitySaved = async () => {
        setEditingOpportunity(null);
        await Promise.all([fetchForecast(), fetchBucketOpportunities()]);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    const handleBucketClick = (bucket: CloseForecastBucket) => {
        if (bucket.count === 0) return;
        setSelectedBucket(bucket);
    };

    const closeFlyout = () => setSelectedBucket(null);

    if (loading) return <p>Loading forecast...</p>;

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Forecast by close month</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {includeClosed ? "Showing open & closed opportunities" : "Showing open opportunities only"}
                    </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeClosed} onChange={e => setIncludeClosed(e.target.checked)} className="rounded" />
                    <span className="text-sm font-medium">Include closed opportunities</span>
                </label>

                <table className="table-auto w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-2 text-left">Close period</th>
                            <th className="border p-2 text-right">Count</th>
                            <th className="border p-2 text-right">Expected value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {buckets.map(bucket => {
                            const isSelected = selectedBucket?.key === bucket.key;
                            const isClickable = bucket.count > 0;
                            return (
                                <tr
                                    key={bucket.key}
                                    onClick={() => handleBucketClick(bucket)}
                                    className={[
                                        bucket.key === "past" ? "bg-amber-50" : "",
                                        isSelected ? "ring-2 ring-inset ring-blue-500" : "",
                                        isClickable ? "cursor-pointer hover:bg-blue-50" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    <td className="border p-2 font-medium">{bucket.label}</td>
                                    <td className="border p-2 text-right">{bucket.count}</td>
                                    <td className="border p-2 text-right font-mono font-bold">{formatCurrency(bucket.expectedValue)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedBucket && (
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
                                {selectedBucket.label}
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
