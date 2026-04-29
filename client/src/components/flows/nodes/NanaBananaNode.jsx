import { useFlowStore } from "../../../store/flowStore";
import BaseNode from "./BaseNode";

const RESOLUTIONS = ["1K", "2K", "4K"];
const RATIOS = ["1:1", "9:16", "16:9", "4:5", "3:4"];

export default function NanaBananaNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode
      id={id}
      type="nana-banana-avatar"
      data={data}
      selected={selected}
      headerColor="#a78bfa"
      label={data.label || "NanaBanana Avatar"}
      inputs={[
        { id: "model", type: "model", label: "Model" },
        { id: "text", type: "text", label: "Prompt" },
        { id: "image", type: "image", label: "Ref (opt)" },
      ]}
      outputs={[{ id: "image", type: "image", label: "Image" }]}
      creditCost={20}
    >
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[9px] text-white/40 block mb-1">Resolution</label>
          <select
            value={data.resolution || "2K"}
            onChange={(e) => updateNodeData(id, { resolution: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white/80 outline-none"
          >
            {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-white/40 block mb-1">Aspect</label>
          <select
            value={data.aspectRatio || "9:16"}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[10px] text-white/80 outline-none"
          >
            {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </BaseNode>
  );
}
