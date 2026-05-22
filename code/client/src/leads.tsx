import axios from "axios";
import { useEffect, useState } from "react";
import { AddLeadModal } from "./add-lead-modal";
import { Lead } from "./types";
import { LeadRow } from "./lead-row";

export const Leads: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger = 0 }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchLeads();
    }, [refreshTrigger]);

    const fetchLeads = async () => {
        const result = await axios.get("/api/leads");
        setLeads(result.data);
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Leads</h2>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium shrink-0"
                >
                    Add Lead
                </button>
            </div>
            <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Actions</th>
                        <th className="border p-2 text-left">First Name</th>
                        <th className="border p-2 text-left">Last Name</th>
                        <th className="border p-2 text-right">Age</th>
                        <th className="border p-2 text-left">Phone Number</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map(lead => (
                        <LeadRow lead={lead} key={lead.id} onUpdate={fetchLeads} />
                    ))}
                </tbody>
            </table>

            {showAddModal && (
                <AddLeadModal
                    fieldsRefresh={refreshTrigger}
                    onClose={() => setShowAddModal(false)}
                    onAdded={fetchLeads}
                />
            )}
        </div>
    );
};
