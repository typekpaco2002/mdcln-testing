/**
 * FlowLibrary — refined right-rail panel showing user flows + starter templates.
 *
 * Time-saving upgrades:
 *   - Search across saved flows by name (no more scrolling 30-item lists).
 *   - Sort toggle (recent ⇄ alphabetical).
 *   - Per-row "Duplicate" action — clones the flow JSON into a new
 *     "Untitled (copy)" via the existing onLoadTemplate path (which sets a
 *     fresh, unsaved flow — the user just hits Save).
 *   - Export/Import JSON — push-button portability without a backend route.
 *   - Templates are always visible (collapsible) so users can spin up a new
 *     pipeline even when they already have saved flows.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  Layers,
  GitBranch,
  Sparkles,
  Search,
  Copy,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  ArrowDownAZ,
  Clock,
} from "@/components/icons";
import { useFlowStore } from "../../store/flowStore";
import { FLOW_TEMPLATES } from "../../data/flow-templates";

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function FlowLibrary({ onLoadFlow, onNewFlow, onDeleteFlow, onLoadTemplate, loading }) {
  const savedFlows = useFlowStore((s) => s.savedFlows);
  const currentFlowId = useFlowStore((s) => s.currentFlowId);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent"); // "recent" | "alpha"
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const fileInputRef = useRef(null);

  // ── Filter + sort the saved flow list ────────────────────────────────
  const filteredFlows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? savedFlows.filter((f) => (f.name || "").toLowerCase().includes(q))
      : savedFlows.slice();
    if (sort === "alpha") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    }
    return list;
  }, [savedFlows, search, sort]);

  // ── Duplicate a saved flow into a fresh unsaved draft ─────────────────
  // We reuse the template-load path because that's exactly what we want:
  // clone the nodes/edges into a new untitled flow. The user clicks Save to
  // commit it server-side. Avoids inventing a new backend route.
  const handleDuplicate = useCallback((flow) => {
    if (!flow || !onLoadTemplate) return;
    onLoadTemplate({
      id: `dup-${flow.id}`,
      name: `${flow.name || "Untitled"} (copy)`,
      nodes: flow.nodes || [],
      edges: flow.edges || [],
    });
  }, [onLoadTemplate]);

  // ── Export current canvas to a downloadable JSON file ─────────────────
  const handleExport = useCallback(() => {
    const { nodes, edges, currentFlowName } = useFlowStore.getState();
    if (!nodes.length) return;
    const payload = { name: currentFlowName, nodes, edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = (currentFlowName || "flow").toLowerCase().replace(/[^a-z0-9-_]+/g, "-").slice(0, 60);
    a.download = `${safe || "flow"}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  // ── Import a JSON flow file into a fresh unsaved draft ────────────────
  const handleImportFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result || "");
        const parsed = JSON.parse(text);
        if (!parsed?.nodes || !Array.isArray(parsed.nodes)) {
          // eslint-disable-next-line no-alert
          alert("That file doesn't look like a flow export.");
          return;
        }
        onLoadTemplate?.({
          id: `import-${Date.now()}`,
          name: parsed.name || "Imported flow",
          nodes: parsed.nodes,
          edges: parsed.edges || [],
        });
      } catch {
        // eslint-disable-next-line no-alert
        alert("Couldn't parse that JSON file.");
      }
    };
    reader.readAsText(file);
  }, [onLoadTemplate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 border-b border-white/[0.05] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[8px] uppercase tracking-[0.18em] font-bold text-white/45"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Library
          </span>
          {savedFlows.length > 0 && (
            <span
              className="text-[8px] text-white/25"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {savedFlows.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Sort toggle */}
          <button
            onClick={() => setSort((s) => (s === "recent" ? "alpha" : "recent"))}
            className="tap-target-min rounded hover:bg-white/[0.06] text-white/35 hover:text-white/80 transition-colors"
            title={sort === "recent" ? "Sort A→Z" : "Sort by recent"}
            aria-label={sort === "recent" ? "Sort alphabetically" : "Sort by recent"}
          >
            {sort === "recent"
              ? <Clock size={11} strokeWidth={1.8} />
              : <ArrowDownAZ size={11} strokeWidth={1.8} />}
          </button>
          {/* Import */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="tap-target-min rounded hover:bg-white/[0.06] text-white/35 hover:text-white/80 transition-colors"
            title="Import JSON flow"
            aria-label="Import JSON flow"
          >
            <Upload size={11} strokeWidth={1.8} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              handleImportFile(f);
              e.target.value = ""; // reset so the same file can be picked twice
            }}
          />
          {/* Export */}
          <button
            onClick={handleExport}
            className="tap-target-min rounded hover:bg-white/[0.06] text-white/35 hover:text-white/80 transition-colors"
            title="Export current canvas as JSON"
            aria-label="Export current canvas as JSON"
          >
            <Download size={11} strokeWidth={1.8} />
          </button>
          {/* New */}
          <button
            onClick={onNewFlow}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold text-violet-200 hover:text-white
              border border-violet-400/45 hover:border-violet-400/65 bg-violet-500/[0.16] hover:bg-violet-500/[0.28]
              transition-all duration-150 ml-1"
            style={{
              fontFamily: "var(--font-mono)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08)",
            }}
          >
            <Plus size={10} strokeWidth={2.4} />
            NEW
          </button>
        </div>
      </div>

      {/* Search */}
      {savedFlows.length > 3 && (
        <div className="px-3 pt-2.5 pb-1.5">
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <Search size={10} className="text-white/30 flex-shrink-0" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Search flows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[10.5px] text-white/85 placeholder:text-white/25 outline-none min-w-0"
              style={{ fontFamily: "var(--font-sans)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-[8.5px] text-white/35 hover:text-white/75 tabular-nums flex-shrink-0"
                style={{ fontFamily: "var(--font-mono)" }}
                aria-label="Clear search"
              >
                {filteredFlows.length}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={14} className="animate-spin text-white/20" />
          </div>
        )}

        {/* Saved flows */}
        {!loading && filteredFlows.length > 0 && (
          <div className="py-2 space-y-0.5 px-1.5">
            {filteredFlows.map((flow) => {
              const active = currentFlowId === flow.id;
              return (
                <div
                  key={flow.id}
                  onClick={() => onLoadFlow(flow.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onLoadFlow(flow.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Load ${flow.name}`}
                  className={`
                    group/flow relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer
                    transition-all duration-150 border outline-none
                    ${active
                      ? "bg-violet-500/[0.16] border-violet-400/45 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      : "border-transparent hover:bg-white/[0.07] hover:border-white/[0.18] focus-visible:bg-white/[0.07] focus-visible:border-violet-400/45"}
                  `}
                >
                  {/* active indicator strip */}
                  {active && (
                    <span
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r"
                      style={{ background: "#a78bfa", boxShadow: "0 0 6px rgba(167,139,250,0.5)" }}
                    />
                  )}

                  {flow.thumbnail ? (
                    <img src={flow.thumbnail} alt="" className="w-9 h-7 object-cover rounded-md flex-shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
                      }}
                    >
                      <GitBranch size={11} className="text-white/55" strokeWidth={1.8} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-medium text-white/85 truncate leading-tight">
                      {flow.name}
                    </div>
                    <div
                      className="flex items-center gap-1.5 mt-0.5 text-[8px] text-white/30"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <span>{timeAgo(flow.updatedAt)}</span>
                      {Array.isArray(flow.nodes) && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{flow.nodes.length}n</span>
                        </>
                      )}
                      {flow._count?.runs > 0 && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{flow._count.runs}r</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/flow:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(flow); }}
                      className="p-1 rounded hover:bg-white/[0.10] text-white/30 hover:text-white/85 transition-all"
                      title="Duplicate as new draft"
                      aria-label={`Duplicate ${flow.name}`}
                    >
                      <Copy size={10} strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFlow(flow.id); }}
                      className="p-1 rounded hover:bg-red-500/15 text-white/25 hover:text-red-300 transition-all"
                      title="Delete flow"
                      aria-label={`Delete ${flow.name}`}
                    >
                      <Trash2 size={10} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty filter result */}
        {!loading && savedFlows.length > 0 && filteredFlows.length === 0 && search && (
          <div className="px-4 py-6 text-center">
            <p className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-mono)" }}>
              no flows match "{search}"
            </p>
          </div>
        )}

        {/* Templates section — always visible, collapsible. Defaults to open
            when no saved flows exist so the new-user empty state stays helpful. */}
        {!loading && (
          <div className="py-2 border-t border-white/[0.05] mt-1">
            <button
              onClick={() => setTemplatesOpen((v) => !v)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/[0.03] transition-colors"
              aria-expanded={templatesOpen}
            >
              <Sparkles size={9} className="text-amber-300/60" strokeWidth={1.8} />
              <span
                className="text-[8px] uppercase tracking-[0.18em] font-bold text-white/45"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Templates
              </span>
              <span
                className="text-[8px] text-white/25 ml-auto"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {FLOW_TEMPLATES.length}
              </span>
              {templatesOpen
                ? <ChevronDown size={10} className="text-white/30" strokeWidth={2} />
                : <ChevronRight size={10} className="text-white/30" strokeWidth={2} />}
            </button>

            {templatesOpen && (
              <div className="px-2 mt-2 space-y-1">
                {FLOW_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onLoadTemplate?.(t)}
                    className="w-full text-left group/tpl relative rounded-xl p-2.5 transition-all duration-200 overflow-hidden
                      hover:border-violet-400/45 focus-visible:border-violet-400/55 focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-violet-400/30"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(167,139,250,0.10) 0%, rgba(255,255,255,0.03) 100%)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      backdropFilter: "blur(14px)",
                      WebkitBackdropFilter: "blur(14px)",
                      boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-0 group-hover/tpl:opacity-100 transition-opacity duration-300"
                      style={{ background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)" }}
                    />

                    <div className="relative flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-violet-500/10 border border-violet-400/15 flex items-center justify-center flex-shrink-0">
                        <Layers size={11} className="text-violet-300/80" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[10.5px] font-semibold text-white/85 group-hover/tpl:text-white truncate transition-colors">
                            {t.name}
                          </span>
                          <span
                            className="text-[8px] text-white/30 flex-shrink-0"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {t.nodes.length}n
                          </span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-snug line-clamp-2">{t.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
