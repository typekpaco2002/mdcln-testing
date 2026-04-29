import { Download, ExternalLink, Inbox } from "lucide-react";
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
      headerColor="#34d399"
      label={data.label || "Output"}
      inputs={[{ id: "any", type: "any", label: "Result" }]}
      outputs={[]}
      creditCost={0}
    >
      {!nodeOutput && (
        <div
          className="rounded-md flex flex-col items-center justify-center gap-1.5 py-4"
          style={{
            background: "linear-gradient(135deg, rgba(52,211,153,0.04) 0%, rgba(255,255,255,0.005) 100%)",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          <Inbox size={14} className="text-white/20" strokeWidth={1.6} />
          <span
            className="text-[8.5px] uppercase tracking-[0.15em] text-white/30"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            awaiting result
          </span>
        </div>
      )}

      {nodeOutput && typeof nodeOutput === "string" && (
        <div className="flex gap-1.5">
          <a
            href={nodeOutput}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md
              bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12]
              text-[9px] font-semibold text-white/55 hover:text-white/85 transition-all tracking-[0.05em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <ExternalLink size={9} strokeWidth={2} />
            OPEN
          </a>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md
              bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16] border border-emerald-400/25 hover:border-emerald-400/40
              text-[9px] font-semibold text-emerald-300 hover:text-emerald-200 transition-all tracking-[0.05em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Download size={9} strokeWidth={2} />
            SAVE
          </button>
        </div>
      )}
    </BaseNode>
  );
}
