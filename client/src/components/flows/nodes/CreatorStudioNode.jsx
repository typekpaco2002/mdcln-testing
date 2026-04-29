import { useFlowStore } from "../../../store/flowStore";
import BaseNode from "./BaseNode";

const RATIOS = ["1:1", "9:16", "16:9", "4:5", "3:4"];

export default function CreatorStudioNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode
      id={id}
      type="creator-studio"
      data={data}
      selected={selected}
      headerColor="#7c3aed"
      label="Creator Studio"
      inputs={[{ id: "text", type: "text", label: "Prompt" }]}
      outputs={[{ id: "image", type: "image", label: "Image" }]}
      creditCost={10}
    >
      <div>
        <label className="text-[9px] text-white/40 block mb-1">Aspect Ratio</label>
        <select
          value={data.aspectRatio || "9:16"}
          onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white/80 outline-none"
        >
          {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </BaseNode>
  );
}
