import { useFlowStore } from "../../../store/flowStore";
import BaseNode from "./BaseNode";

export default function NSFWGenNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode
      id={id}
      type="nsfw-gen"
      data={data}
      selected={selected}
      headerColor="#f87171"
      label={data.label || "NSFW Generation"}
      inputs={[
        { id: "model", type: "model", label: "Model" },
        { id: "text", type: "text", label: "Prompt" },
      ]}
      outputs={[{ id: "image", type: "image", label: "Image" }]}
      creditCost={30}
    >
      <div>
        <label className="text-[9px] text-white/40 block mb-1">Quantity</label>
        <div className="flex gap-1">
          {[1, 2, 4].map((q) => (
            <button
              key={q}
              onClick={() => updateNodeData(id, { quantity: q })}
              className={`flex-1 py-1 rounded text-[9px] font-medium transition-colors
                ${data.quantity === q ? "bg-red-500/30 text-red-400 border border-red-500/40" : "bg-white/5 text-white/40 border border-white/10 hover:border-white/20"}`}
            >
              {q}x
            </button>
          ))}
        </div>
      </div>
    </BaseNode>
  );
}
