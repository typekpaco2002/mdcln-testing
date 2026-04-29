import { Download, ExternalLink } from "lucide-react";
import BaseNode from "./BaseNode";
import { useFlowStore } from "../../../store/flowStore";

export default function OutputViewerNode({ id, data, selected }) {
  const { nodeStatuses } = useFlowStore();
  const nodeOutput = nodeStatuses[id]?.output;
  const outputType = nodeStatuses[id]?.outputType;

  const handleDownload = () => {
    if (!nodeOutput || typeof nodeOutput !== "string") return;
    const a = document.createElement("a");
    a.href = nodeOutput;
    a.download = `flow-output.${outputType === "video" ? "mp4" : "jpg"}`;
    a.target = "_blank";
    a.click();
  };

  return (
    <BaseNode
      id={id}
      type="output-viewer"
      data={data}
      selected={selected}
      headerColor="#059669"
      label="Output"
      inputs={[{ id: "any", type: "any", label: "Result" }]}
      outputs={[]}
      creditCost={0}
    >
      {!nodeOutput && (
        <div className="rounded-lg border border-dashed border-white/10 flex items-center justify-center h-16">
          <p className="text-[9px] text-white/20">Awaiting result…</p>
        </div>
      )}

      {nodeOutput && typeof nodeOutput === "string" && (
        <div className="flex gap-1.5 mt-1">
          <a
            href={nodeOutput}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-white/5 
              hover:bg-white/10 border border-white/10 text-[9px] text-white/60 transition-colors"
          >
            <ExternalLink size={10} />
            Open
          </a>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-emerald-500/20 
              hover:bg-emerald-500/30 border border-emerald-500/40 text-[9px] text-emerald-400 transition-colors"
          >
            <Download size={10} />
            Save
          </button>
        </div>
      )}
    </BaseNode>
  );
}
