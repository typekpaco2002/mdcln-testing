import { useFlowStore } from "../../../store/flowStore";
import BaseNode from "./BaseNode";

const DURATIONS = [5, 8, 10];

export default function VideoPromptNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode
      id={id}
      type="video-prompt"
      data={data}
      selected={selected}
      headerColor="#f59e0b"
      label={data.label || "Video from Prompt"}
      inputs={[
        { id: "text", type: "text", label: "Prompt" },
        { id: "image", type: "image", label: "Ref (opt)" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={70}
    >
      <div>
        <label className="text-[9px] text-white/40 block mb-1">Duration (sec)</label>
        <div className="flex gap-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => updateNodeData(id, { duration: d })}
              className={`flex-1 py-1 rounded text-[9px] font-medium transition-colors
                ${data.duration === d ? "bg-amber-500/30 text-amber-400 border border-amber-500/40" : "bg-white/5 text-white/40 border border-white/10 hover:border-white/20"}`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>
    </BaseNode>
  );
}
