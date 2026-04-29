import BaseNode from "./BaseNode";
import { useFlowStore } from "../../../store/flowStore";

export default function TextInputNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode
      id={id}
      type="text-input"
      data={data}
      selected={selected}
      headerColor="#60a5fa"
      label={data.label || "Text Input"}
      inputs={[]}
      outputs={[{ id: "text", type: "text", label: "Text" }]}
      creditCost={0}
    >
      <textarea
        value={data.text || ""}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Enter prompt or text…"
        rows={3}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white/80
          placeholder:text-white/20 outline-none focus:border-cyan-500/40 resize-none leading-relaxed"
      />
    </BaseNode>
  );
}
