import { useEffect, useState } from "react";
import axios from "axios";
import { CustomField, Opportunity, Stage } from "./types";

function customFieldInputValue(value: unknown): string {
    if (value === undefined || value === null) return "";
    return String(value);
}

function buildCustomFieldsPayload(
    fields: CustomField[],
    values: Record<string, string>
): Record<string, string | number> {
    const payload: Record<string, string | number> = {};
    for (const field of fields) {
        const raw = values[field.name] ?? "";
        if (raw === "") continue;
        payload[field.name] = field.type === "number" ? Number(raw) : raw;
    }
    return payload;
}

interface EditOpportunityModalProps {
    opportunity: Opportunity;
    onClose: () => void;
    onSaved: () => void;
}

export const EditOpportunityModal: React.FC<EditOpportunityModalProps> = ({ opportunity, onClose, onSaved }) => {
    const [name, setName] = useState(opportunity.name ?? "");
    const [value, setValue] = useState(String(opportunity.value));
    const [stageId, setStageId] = useState(opportunity.stage.id);
    const [expectedCloseDate, setExpectedCloseDate] = useState(opportunity.expectedCloseDate ?? "");
    const [stages, setStages] = useState<Stage[]>([]);
    const [fieldDefinitions, setFieldDefinitions] = useState<CustomField[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [stagesRes, fieldsRes] = await Promise.all([axios.get("/api/stages"), axios.get("/api/custom-fields")]);
            setStages(stagesRes.data);
            const oppFields = fieldsRes.data.filter((f: CustomField) => (f.entity ?? "lead") === "opportunity");
            setFieldDefinitions(oppFields);
            const values: Record<string, string> = {};
            for (const field of oppFields) {
                values[field.name] = customFieldInputValue(opportunity.customFields?.[field.name]);
            }
            setCustomFieldValues(values);
        };
        load();
    }, [opportunity]);

    const selectedStage = stages.find(s => s.id === stageId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await axios.put(`/api/opportunities/${opportunity.id}`, {
                name: name || undefined,
                value: parseFloat(value),
                stageId,
                expectedCloseDate: expectedCloseDate || null,
                customFields: buildCustomFieldsPayload(fieldDefinitions, customFieldValues),
            });
            onSaved();
            onClose();
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (err as any).response?.data;
            setError(typeof data === "string" ? data : data?.error ?? "Failed to update opportunity");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto m-4 p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Edit Opportunity</h2>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div>
                        <label className="block text-sm font-medium mb-1">Deal name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Deal name"
                            className="block w-full p-2 border border-gray-300 rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Value ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Stage</label>
                        <select
                            value={stageId}
                            onChange={e => setStageId(Number(e.target.value))}
                            className="block w-full p-2 border border-gray-300 rounded"
                        >
                            {stages.map(stage => (
                                <option key={stage.id} value={stage.id}>
                                    {stage.name} ({stage.status})
                                </option>
                            ))}
                        </select>
                        {selectedStage && (
                            <p className="text-xs text-gray-500 mt-1">
                                Status: {selectedStage.status} · {(selectedStage.conversionLikelihood * 100).toFixed(0)}% likelihood
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Expected close date</label>
                        <input
                            type="date"
                            value={expectedCloseDate}
                            onChange={e => setExpectedCloseDate(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                        />
                        <button
                            type="button"
                            onClick={() => setExpectedCloseDate("")}
                            className="text-xs text-gray-500 mt-1 hover:text-gray-700"
                        >
                            Clear date
                        </button>
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
