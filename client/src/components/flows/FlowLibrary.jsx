/**
 * FlowLibrary — right-panel tab listing saved flows + templates.
 */

import { useCallback } from "react";
import { Plus, Folder, Clock, Loader2, Trash2, Layers } from "lucide-react";
import { useFlowStore } from "../../store/flowStore";
import { FLOW_TEMPLATES } from "../../data/flow-templates";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function FlowLibrary({ onLoadFlow, onNewFlow, onDeleteFlow, onLoadTemplate, loading }) {
  const savedFlows = useFlowStore((s) => s.savedFlows);
  const currentFlowId = useFlowStore((s) => s.currentFlowId);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <span className="text-[11px] font-semibold text-white/70">My Flows</span>
        <button
          onClick={onNewFlow}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/20 hover:bg-violet-500/30 
            border border-violet-500/40 text-[10px] text-violet-400 transition-colors"
        >
          <Plus size={10} />
          New
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1.5 custom-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-white/20" />
          </div>
        )}

        {!loading && savedFlows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Folder size={24} className="text-white/10" />
            <p className="text-[10px] text-white/25 text-center">No flows yet.<br/>Create one to get started.</p>
          </div>
        )}

        {/* Templates section */}
      {savedFlows.length === 0 && !loading && (
        <div className="px-2 mb-2">
          <div className="flex items-center gap-1.5 px-1.5 py-1">
            <Layers size={9} className="text-white/25" />
            <span className="text-[9px] text-white/25 font-semibold uppercase tracking-wider">Starter Templates</span>
          </div>
          {FLOW_TEMPLATES.map((t) => (
            <div
              key={t.id}
              className="group flex items-start gap-2 px-2.5 py-2 mx-0 rounded-lg cursor-pointer
                hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-colors mb-0.5"
              onClick={() => onLoadTemplate?.(t)}
            >
              <Layers size={14} className="text-violet-400/50 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-white/60 truncate">{t.name}</div>
                <div className="text-[8px] text-white/25 leading-relaxed line-clamp-2">{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {savedFlows.map((flow) => (
          <div
            key={flow.id}
            className={`
              group relative flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg cursor-pointer
              hover:bg-white/[0.05] transition-colors border
              ${currentFlowId === flow.id
                ? "border-violet-500/30 bg-violet-500/10"
                : "border-transparent hover:border-white/[0.06]"}
            `}
            onClick={() => onLoadFlow(flow.id)}
          >
            {/* Thumbnail or placeholder */}
            {flow.thumbnail ? (
              <img src={flow.thumbnail} alt="" className="w-10 h-8 object-cover rounded flex-shrink-0" />
            ) : (
              <div className="w-10 h-8 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Folder size={12} className="text-white/20" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-white/80 truncate">{flow.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock size={8} className="text-white/20" />
                <span className="text-[8px] text-white/25">{timeAgo(flow.updatedAt)}</span>
                {flow._count?.runs > 0 && (
                  <span className="text-[8px] text-white/20">· {flow._count.runs} run{flow._count.runs !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFlow(flow.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 
                text-white/20 hover:text-red-400 transition-all flex-shrink-0"
              title="Delete flow"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
