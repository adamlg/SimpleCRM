import { useState, useEffect } from "react";
import { Lead, Opportunity } from "./types";
import axios from "axios";
import { OpportunityModal } from "./edit-opportunity-modal";
import { LeadModal } from "./edit-lead-modal";

export const LeadRow: React.FC<{ lead: Lead; onUpdate: () => void }> = ({ lead, onUpdate }) => {
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [showOpps, setShowOpps] = useState(false);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [opportunityModal, setOpportunityModal] = useState<Opportunity | "create" | null>(null);

    useEffect(() => {
        if (showOpps) {
            fetchOpportunities();
        }
    }, [showOpps]);

    const fetchOpportunities = async () => {
        const result = await axios.get("/api/opportunities");
        setOpportunities(result.data.filter((opp: Opportunity) => opp.lead.id === lead.id));
    };

    const deleteOpportunity = async (oppId: number) => {
        await axios.delete(`/api/opportunities/${oppId}`);
        fetchOpportunities();
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    return (
        <>
            <tr key={lead.id}>
                <td className="border p-2 align-top">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowLeadModal(true)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpportunityModal("create")}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                        >
                            Add Opp
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowOpps(!showOpps)}
                            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 text-sm"
                        >
                            {showOpps ? "Hide" : "Show"} Opps
                        </button>
                    </div>
                </td>
                <td className="border p-2 align-top">{lead.firstName}</td>
                <td className="border p-2 align-top">{lead.lastName}</td>
                <td className="border p-2 text-right align-top tabular-nums">{lead.age}</td>
                <td className="border p-2 align-top">{lead.phoneNumber}</td>
            </tr>
            {showOpps && (
                <tr className="bg-gray-50">
                    <td colSpan={5} className="border p-2">
                        <div className="space-y-4">
                            <h3 className="font-bold">Opportunities</h3>
                            {opportunities.length === 0 ? (
                                <p className="text-gray-500">No opportunities</p>
                            ) : (
                                <div className="space-y-2">
                                    {opportunities.map(opp => (
                                        <div
                                            key={opp.id}
                                            className="flex justify-between items-center p-2 bg-white border border-gray-300 rounded"
                                        >
                                            <div>
                                                <span className="font-medium">{opp.name || "Unnamed"}</span>
                                                <span className="text-sm text-gray-600 ml-2">{opp.stage.name}</span>
                                                <span className="text-sm font-mono text-gray-600 ml-2">
                                                    {formatCurrency(opp.value)}
                                                </span>
                                                <span className="text-sm font-mono text-gray-500 ml-2">
                                                    Expected: {formatCurrency(opp.value * opp.stage.conversionLikelihood)}
                                                </span>
                                                {opp.expectedCloseDate && (
                                                    <span className="text-sm text-gray-600 ml-2">Close: {opp.expectedCloseDate}</span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setOpportunityModal(opp)}
                                                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteOpportunity(opp.id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
            {showLeadModal && (
                <LeadModal lead={lead} onClose={() => setShowLeadModal(false)} onSaved={onUpdate} />
            )}
            {opportunityModal && (
                <OpportunityModal
                    leadId={lead.id}
                    opportunity={opportunityModal === "create" ? undefined : opportunityModal}
                    onClose={() => setOpportunityModal(null)}
                    onSaved={fetchOpportunities}
                />
            )}
        </>
    );
};
