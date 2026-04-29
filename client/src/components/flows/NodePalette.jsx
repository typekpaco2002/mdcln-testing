/**
 * NodePalette — left sidebar with draggable node types grouped by category.
 * Drag a node type onto the canvas to add it.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useFlowStore } from "../../store/flowStore";

const CATEGORY_LABELS = {
  inputs:  { label: "Inputs",       color: "#2563eb" },
  images:  { label: "Image Gen",    color: "#7c3aed" },
  video:   { label: "Video Gen",    color: "#d97706" },
  nsfw:    { label: "NSFW Studio",  color: "#dc2626" },
  outputs: { label: "Outputs",      color: "#059669" },
  utility: { label: "Utility",      color: "#4b5563" },
};

// Icon emoji per node type for quick visual scanning
const NODE_ICONS = {
  "image-input":        "🖼",
  "text-input":         "✏️",
  "model-selector":     "🧬",
  "enhance-prompt":     "✨",
  "nana-banana-avatar": "🍌",
  "seedream-avatar":    "🌱",
  "mcx-img2img":        "🔁",
  "creator-studio":     "🎨",
  "upscaler":           "⬆",
  "synthid-remover":    "🔍",
  "face-swap":          "🫥",
  "video-prompt":       "🎬",
  "video-motion":       "🌀",
  "talking-head":       "🗣",
  "nsfw-gen":           "🔥",
  "nsfw-video":         "📹",
  "nsfw-video-extend":  "📏",
  "nsfw-motion":        "💃",
  "output-viewer":      "📤",
  "merge-outputs":      "🔀",
};

export function NodePalette() {
  const nodeTypes = useFlowStore((s) => s.nodeTypes);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});

  const filtered = nodeTypes.filter(
    (t) =>
      !search ||
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  for (const t of filtered) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  const onDragStart = (e, type) => {
    e.dataTransfer.setData("application/flow-node-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const toggleCategory = (cat) =>
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
          <Search size={11} className="text-white/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/25 outline-none min-w-0"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 custom-scrollbar">
        {Object.entries(CATEGORY_LABELS).map(([cat, meta]) => {
          const items = grouped[cat];
          if (!items?.length) return null;
          const isCollapsed = collapsed[cat];

          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: meta.color }}
                  />
                  <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                    {meta.label}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight size={11} className="text-white/20" />
                ) : (
                  <ChevronDown size={11} className="text-white/20" />
                )}
              </button>

              {/* Nodes */}
              {!isCollapsed && (
                <div className="px-2 pb-1 space-y-0.5">
                  {items.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node.type)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing
                        hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]
                        transition-all duration-150 group"
                      title={node.description}
                    >
                      <span className="text-base leading-none w-5 text-center flex-shrink-0">
                        {NODE_ICONS[node.type] || "⬡"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium text-white/80 truncate">{node.label}</div>
                        {node.creditCost > 0 && (
                          <div className="text-[8px] text-white/25">{node.creditCost} credits</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
