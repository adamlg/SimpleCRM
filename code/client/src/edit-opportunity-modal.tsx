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

function buildPayload(
    name: string,
    value: string,
    stageId: number,
    expectedCloseDate: string,
    fieldDefinitions: CustomField[],
    customFieldValues: Record<string, string>
) {
    return {
        name: name || undefined,
        value: parseFloat(value),
        stageId,
        expectedCloseDate: expectedCloseDate || null,
        customFields: buildCustomFieldsPayload(fieldDefinitions, customFieldValues),
    };
}

interface OpportunityModalProps {
    leadId: number;
    opportunity?: Opportunity;
    onClose: () => void;
    onSaved: () => void;
}

export const OpportunityModal: React.FC<OpportunityModalProps> = ({ leadId, opportunity, onClose, onSaved }) => {
    const isCreate = opportunity === undefined;

    const [name, setName] = useState(opportunity?.name ?? "");
    const [value, setValue] = useState(opportunity ? String(opportunity.value) : "");
    const [stageId, setStageId] = useState(opportunity?.stage.id ?? 0);
    const [expectedCloseDate, setExpectedCloseDate] = useState(opportunity?.expectedCloseDate ?? "");
    const [stages, setStages] = useState<Stage[]>([]);
    const [fieldDefinitions, setFieldDefinitions] = useState<CustomField[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            const [stagesRes, fieldsRes] = await Promise.all([axios.get("/api/stages"), axios.get("/api/custom-fields")]);
            const loadedStages: Stage[] = stagesRes.data;
            setStages(loadedStages);
            const oppFields = fieldsRes.data.filter((f: CustomField) => (f.entity ?? "lead") === "opportunity");
            setFieldDefinitions(oppFields);
            const values: Record<string, string> = {};
            for (const field of oppFields) {
                values[field.name] = customFieldInputValue(opportunity?.customFields?.[field.name]);
            }
            setCustomFieldValues(values);
            if (isCreate && loadedStages.length > 0) {
                setStageId(loadedStages[0].id);
            }
        };
        load();
    }, [opportunity, isCreate]);

    const selectedStage = stages.find(s => s.id === stageId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const payload = buildPayload(name, value, stageId, expectedCloseDate, fieldDefinitions, customFieldValues);
        try {
            if (isCreate) {
                await axios.post("/api/opportunities", { ...payload, leadId });
            } else {
                await axios.put(`/api/opportunities/${opportunity.id}`, payload);
            }
            onSaved();
            onClose();
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (err as any).response?.data;
            const fallback = isCreate ? "Failed to create opportunity" : "Failed to update opportunity";
            setError(typeof data === "string" ? data : data?.error ?? fallback);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain m-4 p-6"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-labelledby="opportunity-modal-title"
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 id="opportunity-modal-title" className="text-xl font-bold">
                        {isCreate ? "Add Opportunity" : "Edit Opportunity"}
                    </h2>
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
                            value={stageId || ""}
                            onChange={e => setStageId(Number(e.target.value))}
                            className="block w-full p-2 border border-gray-300 rounded"
                            required
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
                            disabled={loading || stages.length === 0}
                            className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                        >
                            {loading ? "Saving…" : isCreate ? "Create" : "Save"}
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

/** @deprecated Use OpportunityModal */
export const EditOpportunityModal = OpportunityModal;
