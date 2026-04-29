import { useEffect, useState } from "react";
import { User } from "lucide-react";
import BaseNode from "./BaseNode";
import { useFlowStore } from "../../../store/flowStore";

export default function ModelSelectorNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  const [models, setModels] = useState([]);

  useEffect(() => {
    fetch("/api/models", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.json())
      .then((d) => setModels(d.models || d || []))
      .catch(() => {});
  }, []);

  const selectedModel = models.find((m) => m.id === data.modelId);

  return (
    <BaseNode
      id={id}
      type="model-selector"
      data={data}
      selected={selected}
      headerColor="#60a5fa"
      label={data.label || "Model Selector"}
      inputs={[]}
      outputs={[{ id: "model", type: "model", label: "Model" }]}
      creditCost={0}
    >
      {selectedModel?.photo1Url && (
        <img src={selectedModel.photo1Url} alt="" className="w-full h-16 object-cover rounded-lg mb-2" />
      )}
      <select
        value={data.modelId || ""}
        onChange={(e) => updateNodeData(id, { modelId: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/80 
          outline-none focus:border-emerald-500/40 cursor-pointer"
      >
        <option value="">Select model…</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
    </BaseNode>
  );
}
