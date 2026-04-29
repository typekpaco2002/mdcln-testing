/**
 * AI Flows Builder — Main Canvas Page
 *
 * Full-screen layout:
 *  - Left sidebar: node palette (collapsible)
 *  - Center: React Flow canvas with dark dot-grid, mini-map
 *  - Right panel: Flow Library | Execution Panel (tabbed, collapsible)
 *  - Top toolbar: flow name, save, undo/redo, credit estimate, run button
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Save, Undo2, Redo2, ChevronLeft, ChevronRight,
  GitBranch, Workflow, Loader2, Coins, ArrowLeft,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useFlowStore } from "../store/flowStore";
import { useAuthStore } from "../store";
import { FLOW_TEMPLATES } from "../data/flow-templates";
import { NodePalette } from "../components/flows/NodePalette";
import { FlowLibrary } from "../components/flows/FlowLibrary";
import { ExecutionPanel } from "../components/flows/ExecutionPanel";

// Node type component map for React Flow
import ImageInputNode   from "../components/flows/nodes/ImageInputNode";
import TextInputNode    from "../components/flows/nodes/TextInputNode";
import ModelSelectorNode from "../components/flows/nodes/ModelSelectorNode";
import EnhancePromptNode from "../components/flows/nodes/EnhancePromptNode";
import NanaBananaNode   from "../components/flows/nodes/NanaBananaNode";
import SeedreamNode     from "../components/flows/nodes/SeedreamNode";
import MCXNode          from "../components/flows/nodes/MCXNode";
import CreatorStudioNode from "../components/flows/nodes/CreatorStudioNode";
import UpscalerNode     from "../components/flows/nodes/UpscalerNode";
import SynthIDNode      from "../components/flows/nodes/SynthIDNode";
import FaceSwapNode     from "../components/flows/nodes/FaceSwapNode";
import VideoPromptNode  from "../components/flows/nodes/VideoPromptNode";
import VideoMotionNode  from "../components/flows/nodes/VideoMotionNode";
import TalkingHeadNode  from "../components/flows/nodes/TalkingHeadNode";
import NSFWGenNode      from "../components/flows/nodes/NSFWGenNode";
import NSFWVideoNode    from "../components/flows/nodes/NSFWVideoNode";
import NSFWMotionNode   from "../components/flows/nodes/NSFWMotionNode";
import OutputViewerNode from "../components/flows/nodes/OutputViewerNode";

const NODE_TYPE_MAP = {
  "image-input":        ImageInputNode,
  "text-input":         TextInputNode,
  "model-selector":     ModelSelectorNode,
  "enhance-prompt":     EnhancePromptNode,
  "nana-banana-avatar": NanaBananaNode,
  "seedream-avatar":    SeedreamNode,
  "mcx-img2img":        MCXNode,
  "creator-studio":     CreatorStudioNode,
  "upscaler":           UpscalerNode,
  "synthid-remover":    SynthIDNode,
  "face-swap":          FaceSwapNode,
  "video-prompt":       VideoPromptNode,
  "video-motion":       VideoMotionNode,
  "talking-head":       TalkingHeadNode,
  "nsfw-gen":           NSFWGenNode,
  "nsfw-video":         NSFWVideoNode,
  "nsfw-motion":        NSFWMotionNode,
  "output-viewer":      OutputViewerNode,
};

function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Inner canvas component (needs to be inside ReactFlowProvider) ──────────

function FlowCanvas({ flowId }) {
  const { screenToFlowPosition } = useReactFlow();
  const navigate = useNavigate();
  const store = useFlowStore();
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setCurrentFlow, markDirty,
    paletteOpen, togglePalette,
    rightPanelOpen, toggleRightPanel,
    rightPanelTab, setRightPanelTab,
    currentFlowId, currentFlowName, isDirty,
    setFlowName, markClean, setSavedFlows, savedFlows,
    setNodeTypeRegistry, nodeTypes,
    startRun, resetRun, handleSSEEvent,
    undo, redo,
    runStatus, currentRunId, creditsUsed,
  } = store;

  const [libLoading, setLibLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const sseRef = useRef(null);
  const creditEstimate = nodeTypes.reduce((sum, t) => {
    const found = nodes.find((n) => n.type === t.type);
    return found ? sum + (t.creditCost || 0) : sum;
  }, 0);

  // Load node type registry from server once
  useEffect(() => {
    if (nodeTypes.length > 0) return;
    fetch("/api/flows/node-types", { headers: authHeader() })
      .then((r) => r.json())
      .then(({ types, categories }) => setNodeTypeRegistry(types, categories))
      .catch(() => {});
  }, []);

  // Load flows list
  const loadFlowList = useCallback(async () => {
    setLibLoading(true);
    try {
      const res = await fetch("/api/flows", { headers: authHeader() });
      const data = await res.json();
      setSavedFlows(data.flows || []);
    } catch { /* ignore */ }
    finally { setLibLoading(false); }
  }, [setSavedFlows]);

  useEffect(() => { loadFlowList(); }, []);

  // Load specific flow by ID (from URL param or prop)
  useEffect(() => {
    if (!flowId || flowId === currentFlowId) return;
    fetch(`/api/flows/${flowId}`, { headers: authHeader() })
      .then((r) => r.json())
      .then(({ flow }) => { if (flow) setCurrentFlow(flow); })
      .catch(() => {});
  }, [flowId]);

  // Subscribe to SSE stream when run is active
  useEffect(() => {
    if (!currentRunId || (runStatus !== "pending" && runStatus !== "running")) {
      sseRef.current?.close();
      sseRef.current = null;
      return;
    }
    const token = useAuthStore.getState().token;
    const url = `/api/flows/runs/${currentRunId}/stream`;
    const es = new EventSource(`${url}?token=${encodeURIComponent(token || "")}`);
    es.onmessage = (e) => {
      try { handleSSEEvent(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    sseRef.current = es;
    return () => { es.close(); sseRef.current = null; };
  }, [currentRunId, runStatus]);

  // Drag-drop from palette onto canvas
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/flow-node-type");
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const registry = useFlowStore.getState().nodeTypes;
    const def = registry.find((t) => t.type === type);
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { ...(def?.defaultData || {}), label: def?.label || type },
    };
    addNode(newNode);
    markDirty();
  }, [screenToFlowPosition, addNode, markDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentFlowId, currentFlowName, nodes, edges]);

  // Save flow
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = { name: currentFlowName, nodes, edges };
      let res;
      if (currentFlowId) {
        res = await fetch(`/api/flows/${currentFlowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/flows", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.flow) setCurrentFlow(data.flow);
      }
      markClean();
      loadFlowList();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }, [currentFlowId, currentFlowName, nodes, edges]);

  // New blank flow
  const handleNew = useCallback(() => {
    setCurrentFlow({ id: null, name: "Untitled Flow", nodes: [], edges: [] });
    resetRun();
    markClean();
  }, []);

  // Load a saved flow
  const handleLoadFlow = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/flows/${id}`, { headers: authHeader() });
      const { flow } = await res.json();
      if (flow) { setCurrentFlow(flow); resetRun(); }
      setRightPanelTab("execution");
    } catch { /* ignore */ }
  }, []);

  // Delete a flow
  const handleDeleteFlow = useCallback(async (id) => {
    if (!window.confirm("Delete this flow?")) return;
    await fetch(`/api/flows/${id}`, { method: "DELETE", headers: authHeader() });
    if (currentFlowId === id) handleNew();
    loadFlowList();
  }, [currentFlowId]);

  // Run the flow
  const handleRun = useCallback(async () => {
    if (!currentFlowId) {
      await handleSave();
      await new Promise(r => setTimeout(r, 300));
    }
    const fid = useFlowStore.getState().currentFlowId;
    if (!fid) return;

    const res = await fetch(`/api/flows/${fid}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
    });
    const data = await res.json();
    if (data.runId) {
      startRun(data.runId);
      setRightPanelTab("execution");
    }
  }, [currentFlowId, nodes]);

  // Load a template into the canvas
  const handleLoadTemplate = useCallback((template) => {
    setCurrentFlow({
      id: null,
      name: template.name,
      nodes: template.nodes,
      edges: template.edges,
    });
    resetRun();
    markDirty();
  }, [setCurrentFlow, resetRun]);

  // Cancel a run
  const handleCancel = useCallback(async () => {
    if (!currentRunId) return;
    await fetch(`/api/flows/runs/${currentRunId}`, { method: "DELETE", headers: authHeader() });
    resetRun();
  }, [currentRunId]);

  // Edge connection validation (type matching)
  const isValidConnection = useCallback((connection) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return true;
    const sourceReg = nodeTypes.find((t) => t.type === sourceNode.type);
    const targetReg = nodeTypes.find((t) => t.type === targetNode.type);
    const sourcePort = sourceReg?.outputs?.find((p) => p.id === connection.sourceHandle);
    const targetPort = targetReg?.inputs?.find((p) => p.id === connection.targetHandle);
    if (!sourcePort || !targetPort) return true;
    if (targetPort.type === "any" || sourcePort.type === "any") return true;
    return sourcePort.type === targetPort.type;
  }, [nodes, nodeTypes]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left palette */}
      <div
        className={`flex-shrink-0 border-r border-white/[0.06] bg-[#0c0c12] flex flex-col transition-all duration-200 ${paletteOpen ? "w-48" : "w-0 overflow-hidden border-r-0"}`}
      >
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Workflow size={13} className="text-violet-400" />
            <span className="text-[11px] font-semibold text-white/70">Nodes</span>
          </div>
        </div>
        <NodePalette />
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-[#0c0c12] flex-shrink-0">
          {/* Back button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
            title="Back to dashboard"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Palette toggle */}
          <button
            onClick={togglePalette}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
            title="Toggle palette"
          >
            {paletteOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Flow name */}
          {editingName ? (
            <input
              autoFocus
              value={currentFlowName}
              onChange={(e) => setFlowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="flex-1 bg-white/5 border border-white/20 rounded-md px-2 py-1 text-[12px] 
                text-white/90 outline-none focus:border-violet-500/50 min-w-0 max-w-xs"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 hover:bg-white/[0.04] rounded-md px-2 py-1 group"
            >
              <span className="text-[12px] font-medium text-white/80 max-w-[180px] truncate">{currentFlowName}</span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes" />}
            </button>
          )}

          <div className="flex-1" />

          {/* Undo/Redo */}
          <button onClick={undo} title="Undo (Ctrl+Z)" className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
            <Undo2 size={13} />
          </button>
          <button onClick={redo} title="Redo (Ctrl+Y)" className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
            <Redo2 size={13} />
          </button>

          {/* Credit estimate */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
            <Coins size={10} className="text-amber-400" />
            <span className="text-[10px] text-white/50">~{creditEstimate} cr</span>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.08]
              border border-white/[0.08] text-[11px] text-white/60 hover:text-white/80 
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Save
          </button>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={nodes.length === 0 || runStatus === "running" || runStatus === "pending"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500
              text-white text-[11px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {(runStatus === "running" || runStatus === "pending")
              ? <><Loader2 size={11} className="animate-spin" /> Running…</>
              : "▶ Run"
            }
          </button>

          {/* Right panel toggle */}
          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
            title="Toggle panel"
          >
            {rightPanelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* ReactFlow canvas */}
        <div className="flex-1 relative" style={{ background: "#0c0c12" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPE_MAP}
            isValidConnection={isValidConnection}
            fitView
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Delete", "Backspace"]}
            multiSelectionKeyCode="Shift"
            connectionLineStyle={{ stroke: "#7c3aed", strokeWidth: 1.5, strokeDasharray: "4" }}
            defaultEdgeOptions={{ style: { stroke: "#7c3aed55", strokeWidth: 1.5 }, type: "smoothstep" }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff0a" />
            <Controls
              className="!bg-[#111118] !border-white/10 !rounded-xl !shadow-xl"
              showInteractive={false}
            />
            <MiniMap
              style={{ background: "#0c0c12", border: "1px solid rgba(255,255,255,0.06)" }}
              maskColor="rgba(0,0,0,0.6)"
              nodeColor={(n) => {
                const reg = nodeTypes.find((t) => t.type === n.type);
                return reg?.color || "#7c3aed";
              }}
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none">
                <div className="mt-32 flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] 
                    flex items-center justify-center">
                    <GitBranch size={24} className="text-white/15" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white/30">Drag nodes from the palette</p>
                    <p className="text-[11px] text-white/15 mt-0.5">to start building your flow</p>
                  </div>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right panel */}
      <div
        className={`flex-shrink-0 border-l border-white/[0.06] bg-[#0c0c12] flex flex-col transition-all duration-200 ${rightPanelOpen ? "w-52" : "w-0 overflow-hidden border-l-0"}`}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] flex-shrink-0">
          {["library", "execution"].map((tab) => (
            <button
              key={tab}
              onClick={() => setRightPanelTab(tab)}
              className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors
                ${rightPanelTab === tab
                  ? "text-violet-400 border-b border-violet-500"
                  : "text-white/30 hover:text-white/50"}`}
            >
              {tab === "library" ? "Library" : "Run"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {rightPanelTab === "library" ? (
            <FlowLibrary
              onLoadFlow={handleLoadFlow}
              onNewFlow={handleNew}
              onDeleteFlow={handleDeleteFlow}
              onLoadTemplate={handleLoadTemplate}
              loading={libLoading}
            />
          ) : (
            <ExecutionPanel
              onRun={handleRun}
              onCancel={handleCancel}
              creditEstimate={creditEstimate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper (provides ReactFlow context) ──────────────────────────────

export default function FlowsPage() {
  // Extract flowId from URL hash/path if needed
  const flowId = window.location.pathname.split("/flows/")[1] || null;

  return (
    <div
      className="fixed inset-0 bg-[#0c0c12] overflow-hidden"
      style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
    >
      <ReactFlowProvider>
        <FlowCanvas flowId={flowId} />
      </ReactFlowProvider>

      <style>{`
        .react-flow__attribution { display: none !important; }
        .react-flow__controls button {
          background: #111118 !important;
          border-color: rgba(255,255,255,0.08) !important;
          color: rgba(255,255,255,0.4) !important;
        }
        .react-flow__controls button:hover {
          background: rgba(255,255,255,0.06) !important;
          color: rgba(255,255,255,0.7) !important;
        }
        .react-flow__edge-path { stroke-width: 1.5px; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 999px; }
        .react-flow__handle { transition: transform 0.1s; }
        .react-flow__handle:hover { transform: scale(1.5); }
        .react-flow__minimap-mask { fill: rgba(0,0,0,0.6); }
      `}</style>
    </div>
  );
}
