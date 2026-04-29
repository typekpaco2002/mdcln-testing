/**
 * BaseNode — shared wrapper for all AI Flows Builder nodes.
 *
 * Features:
 *  - Colored header bar by category
 *  - Source/target handles with port-type colors
 *  - Status ring: grey=idle, pulsing-blue=running, green=completed, red=failed
 *  - Inline output preview (image thumbnail / video player)
 *  - Collapsible settings body
 *  - Context menu (duplicate, delete, collapse)
 */

import { memo, useState, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { ChevronDown, ChevronUp, Copy, Trash2, Image, Play } from "lucide-react";
import { useFlowStore } from "../../../store/flowStore";

// Port handle colors by data type
const PORT_COLORS = {
  image:  "#7c3aed",
  video:  "#f59e0b",
  text:   "#06b6d4",
  model:  "#10b981",
  audio:  "#f472b6",
  any:    "#6b7280",
};

// Status styles
const STATUS_RING = {
  idle:      "ring-white/10",
  running:   "ring-blue-500 ring-2 animate-pulse",
  completed: "ring-emerald-500 ring-2",
  failed:    "ring-red-500 ring-2",
  skipped:   "ring-gray-500 ring-1",
};

const STATUS_DOT = {
  idle:      "bg-white/20",
  running:   "bg-blue-400 animate-pulse",
  completed: "bg-emerald-400",
  failed:    "bg-red-400",
  skipped:   "bg-gray-500",
};

export const BaseNode = memo(function BaseNode({
  id,
  type,
  data = {},
  selected,
  headerColor = "#7c3aed",
  label,
  inputs = [],
  outputs = [],
  children,
  creditCost = 0,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { nodeStatuses, deleteNode, duplicateNode, updateNodeData } = useFlowStore();
  const status = nodeStatuses[id]?.status || "idle";
  const nodeOutput = nodeStatuses[id]?.output;
  const outputType = nodeStatuses[id]?.outputType;
  const statusMessage = nodeStatuses[id]?.message;
  const errorMessage = nodeStatuses[id]?.error;

  const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);
  const handleDuplicate = useCallback(() => duplicateNode(id), [id, duplicateNode]);

  return (
    <div
      className={`
        relative bg-[#111118] border border-white/[0.08] rounded-xl shadow-2xl
        min-w-[220px] max-w-[280px] select-none
        ring-offset-[#111118] ring-offset-1
        ${STATUS_RING[status] || STATUS_RING.idle}
        ${selected ? "border-white/20" : ""}
        transition-shadow duration-200
      `}
      style={{ boxShadow: selected ? `0 0 0 2px ${headerColor}40` : undefined }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl cursor-pointer"
        style={{ background: `${headerColor}22`, borderBottom: `1px solid ${headerColor}40` }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status] || STATUS_DOT.idle}`}
          />
          <span className="text-[11px] font-semibold text-white/90 truncate">{label || type}</span>
          {creditCost > 0 && (
            <span className="text-[9px] text-white/40 flex-shrink-0">{creditCost}cr</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
            title="Duplicate"
          >
            <Copy size={11} />
          </button>
          <button
            className="p-0.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
          {collapsed ? <ChevronDown size={12} className="text-white/40" /> : <ChevronUp size={12} className="text-white/40" />}
        </div>
      </div>

      {/* Input handles */}
      {inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: `${52 + i * 28}px`,
            background: PORT_COLORS[port.type] || PORT_COLORS.any,
            width: 10,
            height: 10,
            border: "2px solid #111118",
            left: -5,
          }}
          title={`${port.label} (${port.type})`}
        />
      ))}

      {/* Output handles */}
      {outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: `${52 + i * 28}px`,
            background: PORT_COLORS[port.type] || PORT_COLORS.any,
            width: 10,
            height: 10,
            border: "2px solid #111118",
            right: -5,
          }}
          title={`${port.label} (${port.type})`}
        />
      ))}

      {/* Port labels (when not collapsed) */}
      {!collapsed && (inputs.length > 0 || outputs.length > 0) && (
        <div className="flex justify-between px-4 pt-2 pb-0">
          <div className="flex flex-col gap-1">
            {inputs.map((p) => (
              <span key={p.id} className="text-[9px] text-white/30">{p.label}</span>
            ))}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {outputs.map((p) => (
              <span key={p.id} className="text-[9px] text-white/30">{p.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      {!collapsed && (
        <div className="p-3 space-y-2.5">
          {children}

          {/* Status message */}
          {status === "running" && statusMessage && (
            <p className="text-[9px] text-blue-400 truncate">{statusMessage}</p>
          )}
          {status === "failed" && errorMessage && (
            <p className="text-[9px] text-red-400 truncate" title={errorMessage}>{errorMessage}</p>
          )}

          {/* Output preview */}
          {status === "completed" && nodeOutput && (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-black/40">
              {outputType === "video" ? (
                <video
                  src={nodeOutput}
                  className="w-full max-h-32 object-contain"
                  controls
                  muted
                  playsInline
                />
              ) : outputType === "image" || (typeof nodeOutput === "string" && nodeOutput.match(/\.(jpg|jpeg|png|webp|gif)/i)) ? (
                <img
                  src={nodeOutput}
                  alt="Output"
                  className="w-full max-h-32 object-contain"
                />
              ) : outputType === "text" || typeof nodeOutput === "string" ? (
                <p className="text-[10px] text-white/60 p-2 max-h-20 overflow-y-auto leading-relaxed">
                  {typeof nodeOutput === "string" ? nodeOutput : JSON.stringify(nodeOutput, null, 2)}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default BaseNode;
