import axios from "axios";
import { useEffect, useState } from "react";
import { Lead } from "./types";
import { LeadRow } from "./lead-row";

export const Leads: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger = 0 }) => {
    const [leads, setLeads] = useState<Lead[]>([]);

    useEffect(() => {
        fetchLeads();
    }, [refreshTrigger]);

    const fetchLeads = async () => {
        const result = await axios.get("/api/leads");
        setLeads(result.data);
    };

    return (
        <div className="w-full">
            <h2 className="text-xl font-fold">Leads</h2>
            <table className="table-auto w-full border-separate border-spacing-y-1">
                <thead>
                    <tr>
                        <th></th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Age</th>
                        <th>Phone Number</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map(lead => (
                        <LeadRow lead={lead} key={lead.id} onUpdate={fetchLeads} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};
