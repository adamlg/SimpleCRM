import { useEffect, useState } from "react";
import axios from "axios";
import { CustomField, Lead } from "./types";
function customFieldInputValue(value: unknown): string {
    if (value === undefined || value === null) return "";
    return String(value);
}

function buildLeadCustomFieldsPayload(
    fields: CustomField[],
    values: Record<string, string>
): Record<string, string> {
    const payload: Record<string, string> = {};
    for (const field of fields) {
        const raw = values[field.name] ?? "";
        if (raw === "") continue;
        payload[field.name] = raw;
    }
    return payload;
}

interface LeadModalProps {
    lead: Lead;
    onClose: () => void;
    onSaved: () => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({ lead, onClose, onSaved }) => {
    const [firstName, setFirstName] = useState(lead.firstName);
    const [lastName, setLastName] = useState(lead.lastName);
    const [age, setAge] = useState(String(lead.age));
    const [phoneNumber, setPhoneNumber] = useState(lead.phoneNumber);
    const [fieldDefinitions, setFieldDefinitions] = useState<CustomField[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            const fieldsRes = await axios.get("/api/custom-fields");
            const leadFields = fieldsRes.data.filter((f: CustomField) => (f.entity ?? "lead") === "lead");
            setFieldDefinitions(leadFields);
            const values: Record<string, string> = {};
            for (const field of leadFields) {
                values[field.name] = customFieldInputValue(lead.customFields?.[field.name]);
            }
            setCustomFieldValues(values);
        };
        load();
    }, [lead]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await axios.put(`/api/leads/${lead.id}`, {
                firstName,
                lastName,
                age,
                phoneNumber,
                customFields: buildLeadCustomFieldsPayload(fieldDefinitions, customFieldValues),
            });
            onSaved();
            onClose();
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (err as any).response?.data;
            setError(typeof data === "string" ? data : data?.error ?? "Failed to update lead");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain m-4 p-6"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-labelledby="edit-lead-title"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 id="edit-lead-title" className="text-xl font-bold">
                        Edit Lead
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <label className="block text-sm font-medium mb-1">First name</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Last name</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Age</label>
                        <input
                            type="text"
                            value={age}
                            onChange={e => setAge(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Phone number</label>
                        <input
                            type="text"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                            required
                        />
                    </div>

                    {fieldDefinitions.length > 0 && (
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-sm font-bold text-gray-700">Custom fields</h3>
                            {fieldDefinitions.map(field => (
                                <div key={field.id}>
                                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                                    <input
                                        type={field.type === "number" ? "number" : "text"}
                                        value={customFieldValues[field.name] ?? ""}
                                        onChange={e =>
                                            setCustomFieldValues({
                                                ...customFieldValues,
                                                [field.name]: e.target.value,
                                            })
                                        }
                                        className="block w-full p-2 border border-gray-300 rounded"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                        >
                            {loading ? "Saving…" : "Save"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 p-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
