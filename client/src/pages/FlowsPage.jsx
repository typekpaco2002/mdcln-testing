/**
 * AI Flows Builder — main canvas page.
 *
 * Aesthetic direction: "AI Lab Workshop" — refined dark glass, Syne for the
 * brand mark, JetBrains Mono for technical labels, Inter for UI body, with
 * a subtle aurora gradient mesh on the canvas background.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Save,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Loader2,
  Coins,
  Play,
  ArrowLeft,
  Workflow,
  Library,
  Terminal,
  Group as GroupIcon,
  Ungroup,
  Keyboard,
  Sparkles,
  Layers,
  Smartphone,
  AlertTriangle,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useFlowStore, isCompatibleConnection } from "../store/flowStore";
import { useAuthStore } from "../store";
import { NodePalette } from "../components/flows/NodePalette";
import { FlowLibrary } from "../components/flows/FlowLibrary";
import { ExecutionPanel } from "../components/flows/ExecutionPanel";
import { FLOW_TEMPLATES } from "../data/flow-templates";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * DFS cycle detection across the directed graph of nodes/edges.
 * Returns true if any back-edge is found. Used to guard the Run button
 * (a cyclic graph would loop the executor) and to display a hint.
 */
function graphHasCycle(nodes, edges) {
  if (!nodes?.length || !edges?.length) return false;
  const adj = new Map();
  nodes.forEach((n) => adj.set(n.id, []));
  edges.forEach((e) => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  });
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  nodes.forEach((n) => color.set(n.id, WHITE));
  const stack = [];
  for (const start of nodes) {
    if (color.get(start.id) !== WHITE) continue;
    stack.push({ id: start.id, idx: 0 });
    color.set(start.id, GRAY);
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const nbrs = adj.get(frame.id) || [];
      if (frame.idx >= nbrs.length) {
        color.set(frame.id, BLACK);
        stack.pop();
        continue;
      }
      const next = nbrs[frame.idx++];
      const c = color.get(next);
      if (c === GRAY) return true;
      if (c === WHITE) {
        color.set(next, GRAY);
        stack.push({ id: next, idx: 0 });
      }
    }
  }
  return false;
}

function formatClockTime(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const DRAFT_KEY = "flows:draft:unsaved";

// Node types
import ImageInputNode from "../components/flows/nodes/ImageInputNode";
import TextInputNode from "../components/flows/nodes/TextInputNode";
import ModelSelectorNode from "../components/flows/nodes/ModelSelectorNode";
import EnhancePromptNode from "../components/flows/nodes/EnhancePromptNode";
import NanaBananaNode from "../components/flows/nodes/NanaBananaNode";
import SeedreamNode from "../components/flows/nodes/SeedreamNode";
import MCXNode from "../components/flows/nodes/MCXNode";
import CreatorStudioNode from "../components/flows/nodes/CreatorStudioNode";
import UpscalerNode from "../components/flows/nodes/UpscalerNode";
import SynthIDNode from "../components/flows/nodes/SynthIDNode";
import FaceSwapNode from "../components/flows/nodes/FaceSwapNode";
import VideoPromptNode from "../components/flows/nodes/VideoPromptNode";
import VideoMotionNode from "../components/flows/nodes/VideoMotionNode";
import TalkingHeadNode from "../components/flows/nodes/TalkingHeadNode";
import NSFWGenNode from "../components/flows/nodes/NSFWGenNode";
import NSFWVideoNode from "../components/flows/nodes/NSFWVideoNode";
import NSFWVideoExtendNode from "../components/flows/nodes/NSFWVideoExtendNode";
import NSFWMotionNode from "../components/flows/nodes/NSFWMotionNode";
import OutputViewerNode from "../components/flows/nodes/OutputViewerNode";
import GroupNode from "../components/flows/nodes/GroupNode";
import AudioInputNode from "../components/flows/nodes/AudioInputNode";
import VoiceGenNode from "../components/flows/nodes/VoiceGenNode";
import SfxGenNode from "../components/flows/nodes/SfxGenNode";

const NODE_TYPE_MAP = {
  group:                GroupNode,
  "image-input":        ImageInputNode,
  "text-input":         TextInputNode,
  "model-selector":     ModelSelectorNode,
  "audio-input":        AudioInputNode,
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
  "voice-gen":          VoiceGenNode,
  "sfx-gen":            SfxGenNode,
  "nsfw-gen":           NSFWGenNode,
  "nsfw-video":         NSFWVideoNode,
  "nsfw-video-extend":  NSFWVideoExtendNode,
  "nsfw-motion":        NSFWMotionNode,
  "output-viewer":      OutputViewerNode,
};

// No custom EDGE_TYPES — we rely on React Flow's built-in default edge
// renderer and style it via CSS vars. Per-port colour is carried on each
// edge's `style.stroke` which the default renderer respects.

function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Inner canvas (inside ReactFlowProvider) ───────────────────────────────

function FlowCanvas({ flowId, embedded = false }) {
  const { screenToFlowPosition, setCenter } = useReactFlow();
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
    setFlowName, markClean, setSavedFlows,
    setNodeTypeRegistry, nodeTypes,
    startRun, resetRun, handleSSEEvent,
    undo, redo, groupSelection, ungroupSelection,
    duplicateNode,
    runStatus, currentRunId,
  } = store;

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedNonGroupCount = selectedNodes.filter((n) => n.type !== "group").length;
  const selectedGroupCount = selectedNodes.filter((n) => n.type === "group").length;

  const [libLoading, setLibLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [connectionToast, setConnectionToast] = useState(null); // { message, id }
  const [viewportTooSmall, setViewportTooSmall] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const sseRef = useRef(null);
  const connectionToastTimer = useRef(null);
  const autoSaveTimer = useRef(null);
  // ── Stale-closure escape hatches ──────────────────────────────────────
  // The keyboard handler effect attaches once and reads action functions /
  // mutable component state via refs at INVOCATION time, so it never sees a
  // stale snapshot of `runStatus`, `isDirty`, or `hasCycle`. This is what
  // prevents `Cmd+Enter` from spawning a duplicate run while one is already
  // in flight (the would-be double-billing bug).
  const handleRunRef = useRef(null);
  const handleSaveRef = useRef(null);
  const showShortcutsRef = useRef(false);
  const connectionToastRef = useRef(null);
  const editingNameRef = useRef(false);
  // Save-in-flight guard so spamming `Cmd+S` doesn't fan out into N parallel
  // POSTs against the same flow. (See B1 review Minor #7.)
  const isSavingRef = useRef(false);
  // Run-in-flight guard — synchronously blocks a second `Cmd+Enter` from
  // firing a second POST during the brief window between the first POST
  // being awaited and the store transitioning to `runStatus === "pending"`.
  // The `runStatus`-based guard alone isn't enough because the store
  // doesn't update until `startRun(runId)` is called AFTER the fetch
  // resolves. (See B1 review Blocker #1 — would-be double-bill.)
  const isStartingRunRef = useRef(false);
  // Focus-management refs for modal dialogs (cheatsheet + viewport guard).
  // We record the element that opened the dialog so we can restore focus to
  // it on close, and we expose refs to the first focusable element inside
  // each dialog so we can move focus there on open.
  const shortcutsTriggerRef = useRef(null);
  const shortcutsCloseBtnRef = useRef(null);
  const shortcutsDialogRef = useRef(null);
  const viewportDialogRef = useRef(null);
  const viewportCloseBtnRef = useRef(null);
  const creditEstimate = nodeTypes.reduce((sum, t) => {
    const matches = nodes.filter((n) => n.type === t.type).length;
    return sum + matches * (t.creditCost || 0);
  }, 0);

  // Load node type registry once
  useEffect(() => {
    if (nodeTypes.length > 0) return;
    fetch("/api/flows/node-types", { headers: authHeader() })
      .then((r) => r.json())
      .then(({ types, categories }) => setNodeTypeRegistry(types, categories))
      .catch(() => {});
  }, []);

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

  // Load flow by id
  useEffect(() => {
    if (!flowId || flowId === currentFlowId) return;
    fetch(`/api/flows/${flowId}`, { headers: authHeader() })
      .then((r) => r.json())
      .then(({ flow }) => { if (flow) setCurrentFlow(flow); })
      .catch(() => {});
  }, [flowId]);

  // SSE — server caps each connection at ~25s to avoid burning Vercel
  // function budget; we reconnect on `reconnect` event or onerror as long
  // as the run is still pending/running. The DB has the truth, so the
  // worst-case effect of any disconnect is a small visual stall.
  useEffect(() => {
    if (!currentRunId || (runStatus !== "pending" && runStatus !== "running")) {
      sseRef.current?.close();
      sseRef.current = null;
      return;
    }

    let cancelled = false;
    let es = null;
    let reconnectTimer = null;

    const open = () => {
      if (cancelled) return;
      const token = useAuthStore.getState().token;
      const url = `/api/flows/runs/${currentRunId}/stream`;
      es = new EventSource(`${url}?token=${encodeURIComponent(token || "")}`);
      sseRef.current = es;
      es.onmessage = (e) => {
        try { handleSSEEvent(JSON.parse(e.data)); } catch { /* ignore */ }
      };
      // Server-initiated lifetime cap: typed event, reconnect immediately.
      es.addEventListener("reconnect", () => {
        try { es?.close(); } catch { /* ignore */ }
        if (!cancelled) open();
      });
      es.onerror = () => {
        try { es?.close(); } catch { /* ignore */ }
        if (cancelled) return;
        // Network/timeout error — reconnect with a small backoff so we
        // don't tight-loop against a degraded connection.
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => { if (!cancelled) open(); }, 1500);
      };
    };

    open();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { es?.close(); } catch { /* ignore */ }
      sseRef.current = null;
    };
  }, [currentRunId, runStatus]);

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
      width: 260,
      height: 180,
      style: { width: 260, height: 180 },
      data: { ...(def?.defaultData || {}), label: def?.label || type },
    };
    addNode(newNode);
    markDirty();
  }, [screenToFlowPosition, addNode, markDirty]);

  // ── Cycle detection (memoised; used by Run-disabled hint) ────────────
  const hasCycle = useMemo(() => graphHasCycle(nodes, edges), [nodes, edges]);

  // Keep stale-closure refs in sync with the latest render. This runs on
  // EVERY render (no deps) so the keyboard handler (attached once) always
  // calls the freshest `handleRun` / `handleSave` and reads the latest
  // dialog/toast state at the moment the user presses a key.
  // `handleRun` / `handleSave` are referenced lexically here even though
  // they're declared later in the function body — that's safe because the
  // effect callback only executes during commit, by which time the entire
  // render body (and therefore both consts) has been initialised.
  useEffect(() => {
    /* eslint-disable no-use-before-define */
    handleRunRef.current = handleRun;
    handleSaveRef.current = handleSave;
    /* eslint-enable no-use-before-define */
    showShortcutsRef.current = showShortcuts;
    connectionToastRef.current = connectionToast;
    editingNameRef.current = editingName;
  });

  // Keyboard shortcuts — attached ONCE. The handler reads every dynamic
  // value via `useFlowStore.getState()` or refs so it never closes over a
  // stale snapshot. This is what prevents `Cmd+Enter` mid-run from firing
  // a second `POST /api/flows/:id/run` (the would-be double-billing bug).
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      const isEditable = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;

      // ESC closes popovers / cancels editing — always allowed (no preventDefault).
      if (e.key === "Escape") {
        if (showShortcutsRef.current) { setShowShortcuts(false); return; }
        if (connectionToastRef.current) { setConnectionToast(null); return; }
        if (editingNameRef.current) { setEditingName(false); return; }
      }

      // "?" opens shortcut overlay — only outside editable.
      if (!isEditable && e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // Remember the element that opened the dialog so we can restore
        // focus on close (a11y).
        shortcutsTriggerRef.current = document.activeElement;
        setShowShortcuts((v) => !v);
        return;
      }

      if (isEditable) return;

      // Ctrl/Cmd + Enter → run (always reads the latest handleRun via ref so
      // the mid-run guard inside handleRun can't be bypassed).
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRunRef.current?.();
        return;
      }
      // Ctrl/Cmd + S → save (latest handleSave via ref).
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current?.();
        return;
      }
      // Ctrl/Cmd + Z → undo (no shift).
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useFlowStore.getState().undo();
        return;
      }
      // Ctrl/Cmd + Y or Shift+Ctrl/Cmd+Z → redo.
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        useFlowStore.getState().redo();
        return;
      }
      // Ctrl/Cmd + G → group / Ctrl+Shift+G → ungroup.
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        useFlowStore.getState().groupSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && e.shiftKey) {
        e.preventDefault();
        useFlowStore.getState().ungroupSelection();
        return;
      }
      // Ctrl/Cmd + D → duplicate selected (skips groups to avoid recursive nests).
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const state = useFlowStore.getState();
        const sel = state.nodes.filter((n) => n.selected && n.type !== "group");
        if (sel.length > 0) {
          // Stagger duplicate IDs across multiple selections so they don't collide.
          sel.forEach((n, i) => setTimeout(() => state.duplicateNode(n.id), i * 4));
          state.markDirty();
        }
        return;
      }
      // Ctrl/Cmd + A → select all nodes via React Flow's own change pipeline
      // so undo/redo and dirty tracking stay coherent.
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const state = useFlowStore.getState();
        const changes = state.nodes
          .filter((n) => !n.selected)
          .map((n) => ({ id: n.id, type: "select", selected: true }));
        if (changes.length > 0) state.onNodesChange(changes);
        return;
      }
      // Arrow keys → nudge selection (8px, +shift = 32px). Routed through
      // `onNodesChange` so React Flow's internal selection model + the
      // store's history stack pick up the move.
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const state = useFlowStore.getState();
        const sel = state.nodes.filter((n) => n.selected);
        if (sel.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 32 : 8;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const changes = sel.map((n) => ({
          id: n.id,
          type: "position",
          position: { x: n.position.x + dx, y: n.position.y + dy },
          // `dragging: false` tells React Flow this is a committed move (not
          // a live drag) so it's a single undoable entry.
          dragging: false,
        }));
        state.onNodesChange(changes);
        state.markDirty();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSave = useCallback(async () => {
    if (nodes.length === 0) return;
    // Drop any rapid duplicate Cmd+S spam while a save is already in flight.
    if (isSavingRef.current) return;
    isSavingRef.current = true;
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
      if (res?.ok) {
        markClean();
        setLastSavedAt(Date.now());
        // Once the flow lives on the server we no longer need the local draft.
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        setDraftAvailable(false);
        loadFlowList();
      }
    } catch { /* ignore */ }
    finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }, [currentFlowId, currentFlowName, nodes, edges, loadFlowList, markClean, setCurrentFlow]);

  const handleNew = useCallback(() => {
    setCurrentFlow({ id: null, name: "Untitled Flow", nodes: [], edges: [] });
    resetRun();
    markClean();
  }, []);

  const handleLoadFlow = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/flows/${id}`, { headers: authHeader() });
      const { flow } = await res.json();
      if (flow) { setCurrentFlow(flow); resetRun(); }
      setRightPanelTab("execution");
    } catch { /* ignore */ }
  }, []);

  const handleDeleteFlow = useCallback(async (id) => {
    if (!window.confirm("Delete this flow?")) return;
    await fetch(`/api/flows/${id}`, { method: "DELETE", headers: authHeader() });
    if (currentFlowId === id) handleNew();
    loadFlowList();
  }, [currentFlowId]);

  const handleRun = useCallback(async () => {
    // Synchronous lock — set BEFORE any await so a second `Cmd+Enter`
    // that arrives during the fetch can't slip past. The runStatus check
    // catches the post-run state; this catches the pre-run race window.
    if (isStartingRunRef.current) return;
    // Always read runStatus through the live store so the keyboard
    // handler's ref-based call (or any other invoker) can't see a stale
    // closure snapshot.
    const liveStatus = useFlowStore.getState().runStatus;
    if (liveStatus === "running" || liveStatus === "pending") return;
    if (nodes.length === 0) return;
    if (hasCycle) {
      setConnectionToast({
        message: "Graph has a cycle — break the loop before running.",
        kind: "error",
        id: Date.now(),
      });
      return;
    }
    isStartingRunRef.current = true;
    let started = false;
    try {
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
        started = true;
        startRun(data.runId);
        setRightPanelTab("execution");
      }
    } finally {
      // Release the lock on bail-out / failure. If a run actually started
      // we keep the lock latched — the runStatus terminal-state effect
      // below will release it once the run completes / fails / cancels.
      if (!started) isStartingRunRef.current = false;
    }
  }, [currentFlowId, nodes, edges, hasCycle, handleSave, startRun, setRightPanelTab]);

  // Release the in-flight run lock once the run reaches a terminal state
  // (or the run id is cleared). Keeps `handleRun` ready for the next click.
  useEffect(() => {
    if (
      runStatus === null ||
      runStatus === "completed" ||
      runStatus === "failed" ||
      runStatus === "cancelled"
    ) {
      isStartingRunRef.current = false;
    }
  }, [runStatus]);

  // Drop a node at the visible canvas center — used by NodePalette's
  // "click to add" affordance when the user can't or doesn't want to drag.
  const handleAddNodeAtCenter = useCallback((type) => {
    const registry = useFlowStore.getState().nodeTypes;
    const def = registry.find((t) => t.type === type);
    if (!def) return;
    // Use the centre of the viewport so the node lands somewhere visible
    // (vs always at world-origin which can be off-screen after panning).
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    // Random jitter so repeated clicks stack diagonally instead of on top
    // of each other.
    const jitter = (useFlowStore.getState().nodes.filter((n) => n.type === type).length % 8) * 24;
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: center.x + jitter, y: center.y + jitter },
      width: 260,
      height: 180,
      style: { width: 260, height: 180 },
      data: { ...(def?.defaultData || {}), label: def?.label || type },
    };
    addNode(newNode);
    markDirty();
  }, [addNode, markDirty, screenToFlowPosition]);

  // Drop a full template onto the canvas (used by the empty-state tiles).
  const handleApplyTemplate = useCallback((template) => {
    setCurrentFlow({ id: null, name: template.name, nodes: template.nodes, edges: template.edges });
    resetRun();
    markDirty();
    // Templates re-use ids like "image-input-1". Re-stamp them so a user who
    // pastes the same template twice doesn't get duplicate React Flow node
    // ids (which silently break edge attachment).
    setTimeout(() => {
      const stamp = Date.now().toString(36);
      const idMap = new Map();
      const next = useFlowStore.getState().nodes.map((n) => {
        const newId = `${n.id}-${stamp}`;
        idMap.set(n.id, newId);
        return { ...n, id: newId };
      });
      const nextEdges = useFlowStore.getState().edges.map((e) => ({
        ...e,
        id: `e-${idMap.get(e.source) || e.source}-${idMap.get(e.target) || e.target}-${stamp}`,
        source: idMap.get(e.source) || e.source,
        target: idMap.get(e.target) || e.target,
      }));
      useFlowStore.setState({ nodes: next, edges: nextEdges });
    }, 16);
  }, [setCurrentFlow, resetRun, markDirty]);

  // ── Connection feedback toast ────────────────────────────────────────
  // React Flow fires `onConnectEnd` with `connectionState.isValid` when the
  // user releases a wire. If the pointer is on an incompatible handle we
  // surface a quick, dismissible toast so the user knows *why* nothing
  // connected — instead of silently dropping the connection.
  const handleConnectEnd = useCallback((_evt, connectionState) => {
    if (!connectionState) return;
    if (connectionState.isValid) return;
    if (!connectionState.toNode || !connectionState.toHandle) return;
    // Same direction (output→output or input→input) — React Flow rejects
    // these silently. Surface a quiet, short toast so the user understands
    // why the wire disappeared instead of blaming themselves.
    const fromDir = connectionState.fromHandle?.type;
    const toDir = connectionState.toHandle?.type;
    if (fromDir && toDir && fromDir === toDir) {
      setConnectionToast({
        message: fromDir === "source"
          ? "Outputs can only connect to inputs."
          : "Inputs can only connect to outputs.",
        kind: "warn",
        id: Date.now(),
        // Shorter dwell — this is a recoverable, low-stakes mistake.
        dwellMs: 1500,
      });
      return;
    }
    // Resolve the data types involved for a friendlier message on
    // direction-correct-but-type-mismatched rejections.
    const srcReg = nodeTypes.find((t) => t.type === connectionState.fromNode?.type);
    const tgtReg = nodeTypes.find((t) => t.type === connectionState.toNode?.type);
    const srcPort = srcReg?.outputs?.find((p) => p.id === connectionState.fromHandle?.id);
    const tgtPort = tgtReg?.inputs?.find((p) => p.id === connectionState.toHandle?.id);
    const srcType = srcPort?.type || "any";
    const tgtType = tgtPort?.type || "any";
    if (srcType === tgtType) return; // unknown failure mode — skip quietly
    setConnectionToast({
      message: `${tgtReg?.label || "Target"} expects ${tgtType}, got ${srcType}.`,
      kind: "warn",
      id: Date.now(),
    });
  }, [nodeTypes]);

  // Auto-dismiss the connection toast. Per-toast `dwellMs` (set by
  // `handleConnectEnd` for the quieter direction-mismatch variant) overrides
  // the 3.5 s default.
  useEffect(() => {
    if (!connectionToast) return;
    if (connectionToastTimer.current) clearTimeout(connectionToastTimer.current);
    const dwell = connectionToast.dwellMs || 3500;
    connectionToastTimer.current = setTimeout(() => setConnectionToast(null), dwell);
    return () => { if (connectionToastTimer.current) clearTimeout(connectionToastTimer.current); };
  }, [connectionToast]);

  // ── Auto-save (every 30 s while dirty) ────────────────────────────────
  // Saved flows hit the backend; unsaved (no id) snapshot to localStorage so
  // a refresh / accidental close doesn't lose work. We never invent a
  // backend route — this is a pure client-side safety net.
  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (currentFlowId) {
        if (nodes.length > 0) handleSave();
      } else if (nodes.length > 0) {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            name: currentFlowName,
            nodes,
            edges,
            savedAt: Date.now(),
          }));
          setLastSavedAt(Date.now());
          setDraftAvailable(true);
          // The user's work is now durable locally — treat the canvas as
          // clean so the dirty-dot clears and "Saved at HH:mm:ss" shows.
          // If they edit again, `markDirty` from the edit re-flips it.
          markClean();
        } catch { /* quota — ignore */ }
      }
    }, 30_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [isDirty, currentFlowId, currentFlowName, nodes, edges, handleSave, markClean]);

  // Detect an existing draft on mount so we can surface a one-click restore.
  useEffect(() => {
    if (currentFlowId) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.nodes?.length) setDraftAvailable(true);
      }
    } catch { /* ignore */ }
  }, [currentFlowId]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed?.nodes?.length) return;
      setCurrentFlow({
        id: null,
        name: parsed.name || "Restored draft",
        nodes: parsed.nodes,
        edges: parsed.edges || [],
      });
      resetRun();
      markDirty();
      setDraftAvailable(false);
    } catch { /* ignore */ }
  }, [setCurrentFlow, resetRun, markDirty]);

  const handleDiscardDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraftAvailable(false);
  }, []);

  // Warn before unload while there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const before = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [isDirty]);

  // Small-viewport guard. Flows is a complex spatial UI; on phones we
  // surface a clear "open on desktop" message rather than degrading.
  useEffect(() => {
    const check = () => setViewportTooSmall(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Cheatsheet focus management ──────────────────────────────────────
  // On open: focus the close button + remember the previously-focused
  // element. On Tab/Shift+Tab: cycle within the dialog. On close: restore
  // focus to whatever opened it (the `?` key or the toolbar button).
  useEffect(() => {
    if (!showShortcuts) return;
    const previouslyFocused = shortcutsTriggerRef.current || document.activeElement;
    const rafId = requestAnimationFrame(() => shortcutsCloseBtnRef.current?.focus());
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const root = shortcutsDialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", trap);
      try { previouslyFocused && typeof previouslyFocused.focus === "function" && previouslyFocused.focus(); }
      catch { /* element may have unmounted */ }
    };
  }, [showShortcuts]);

  // ── Viewport-guard focus management ──────────────────────────────────
  // The mobile alertdialog has a single action (Back to dashboard); we
  // focus it on open and Tab-trap on it so a screen reader / keyboard
  // user can't blunder into the hidden canvas behind the overlay.
  useEffect(() => {
    if (!viewportTooSmall || embedded) return;
    const previouslyFocused = document.activeElement;
    const rafId = requestAnimationFrame(() => viewportCloseBtnRef.current?.focus());
    const trap = (e) => {
      if (e.key !== "Tab") return;
      const root = viewportDialogRef.current;
      if (!root) return;
      // Single focusable target — just pin focus on it.
      e.preventDefault();
      viewportCloseBtnRef.current?.focus();
    };
    window.addEventListener("keydown", trap);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", trap);
      try { previouslyFocused && typeof previouslyFocused.focus === "function" && previouslyFocused.focus(); }
      catch { /* ignore */ }
    };
  }, [viewportTooSmall, embedded]);

  const handleCancel = useCallback(async () => {
    if (!currentRunId) return;
    await fetch(`/api/flows/runs/${currentRunId}`, { method: "DELETE", headers: authHeader() });
    resetRun();
  }, [currentRunId]);

  // Live connection guard: gives the user red/green feedback while dragging
  // a wire. Same compatibility rules as the commit-time guard in
  // flowStore.onConnect so the two never disagree.
  const isValidConnection = useCallback(
    (connection) => isCompatibleConnection(connection, nodes, nodeTypes),
    [nodes, nodeTypes]
  );

  const isRunning = runStatus === "running" || runStatus === "pending";

  return (
    <div
      className="flex h-full w-full overflow-hidden flows-page-root"
      style={{ background: "var(--fp-page-bg)", color: "var(--fp-text)" }}
    >
      {/* ── Left palette (frosted glass rail) ── */}
      <div
        className={`flex-shrink-0 flex flex-col transition-[width] duration-200 ease-out relative z-30
          ${paletteOpen ? "w-[218px]" : "w-0 overflow-hidden"}`}
        style={{
          background: "var(--fp-rail-bg)",
          backdropFilter: "blur(28px) saturate(170%)",
          WebkitBackdropFilter: "blur(28px) saturate(170%)",
          borderRight: "1px solid var(--fp-border)",
          boxShadow:
            "inset -1px 0 0 0 var(--fp-rail-sheen), 8px 0 32px -16px var(--fp-rail-shadow)",
        }}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(124,58,237,0.08) 100%)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <Workflow size={11} className="text-violet-300" strokeWidth={2} />
            </div>
            <span
              className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/55"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Nodes
            </span>
          </div>
        </div>
        <NodePalette onClickAdd={handleAddNodeAtCenter} />
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* ── Toolbar ── */}
        <div
          className="flex items-center gap-2 px-3 py-2 flex-shrink-0 z-20 relative"
          style={{
            background: "var(--fp-toolbar-bg)",
            backdropFilter: "blur(28px) saturate(170%)",
            WebkitBackdropFilter: "blur(28px) saturate(170%)",
            borderBottom: "1px solid var(--fp-border)",
            boxShadow:
              "inset 0 1px 0 0 var(--fp-rail-sheen), 0 8px 28px -16px var(--fp-rail-shadow)",
          }}
        >
          {!embedded && (
            <button
              onClick={() => navigate("/dashboard")}
              className="p-1.5 rounded-md hover:bg-white/[0.05] text-white/35 hover:text-white/75 transition-colors flex-shrink-0"
              title="Back"
            >
              <ArrowLeft size={13} strokeWidth={1.8} />
            </button>
          )}

          <button
            onClick={togglePalette}
            className="p-1.5 rounded-md hover:bg-white/[0.05] text-white/35 hover:text-white/75 transition-colors flex-shrink-0"
            title="Toggle palette"
          >
            {paletteOpen
              ? <ChevronLeft size={13} strokeWidth={1.8} />
              : <ChevronRight size={13} strokeWidth={1.8} />}
          </button>

          {/* Brand mark */}
          <div className="hidden md:flex items-center gap-2 ml-1 mr-2 pr-2 border-r border-white/[0.05]">
            <span
              className="text-[16px] font-bold tracking-[-0.03em] leading-none"
              style={{
                fontFamily: "var(--font-syne)",
                background: "linear-gradient(135deg, #fff 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Flows
            </span>
          </div>

          {/* Flow name */}
          {editingName ? (
            <input
              autoFocus
              value={currentFlowName}
              onChange={(e) => setFlowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="bg-white/[0.04] border border-violet-400/40 rounded-md px-2.5 py-1.5 text-[12px]
                text-white/95 outline-none min-w-0 max-w-xs font-medium"
              style={{ fontFamily: "var(--font-sans)" }}
            />
          ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-2 hover:bg-white/[0.03] rounded-md px-2 py-1.5 group max-w-xs"
            title="Click to rename"
          >
            <span className="text-[12px] font-medium text-white/85 truncate">{currentFlowName}</span>
            {isDirty ? (
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: "#f59e0b", boxShadow: "0 0 4px rgba(245,158,11,0.6)" }}
                title="Unsaved changes"
              />
            ) : lastSavedAt ? (
              <span
                className="hidden lg:inline text-[9px] text-white/30 tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
                title={`Last saved ${formatClockTime(lastSavedAt)}`}
              >
                ✓ {formatClockTime(lastSavedAt)}
              </span>
            ) : null}
          </button>
        )}

        <div className="flex-1" />

          {/* Tech metrics — glass chip */}
          <div
            className="hidden sm:flex items-center gap-3 px-3 py-1 rounded-md"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="text-[8px] uppercase tracking-[0.15em] text-white/30"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                N
              </span>
              <span
                className="text-[10px] text-white/65 tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {String(nodes.length).padStart(2, "0")}
              </span>
            </div>
            <div className="w-px h-3 bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <span
                className="text-[8px] uppercase tracking-[0.15em] text-white/30"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                E
              </span>
              <span
                className="text-[10px] text-white/65 tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {String(edges.length).padStart(2, "0")}
              </span>
            </div>
            <div className="w-px h-3 bg-white/[0.08]" />
            <div className="flex items-center gap-1.5">
              <Coins size={9} className="text-amber-300/70" strokeWidth={2} />
              <span
                className="text-[10px] text-white/65 tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                ~{creditEstimate}
              </span>
            </div>
          </div>

          {/* Undo/Redo — glass chip */}
          <div
            className="flex items-center rounded-md overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={undo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 hover:bg-white/[0.04] text-white/35 hover:text-white/75 transition-colors"
            >
              <Undo2 size={12} strokeWidth={1.8} />
            </button>
            <div className="w-px h-3 bg-white/[0.05]" />
            <button
              onClick={redo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 hover:bg-white/[0.04] text-white/35 hover:text-white/75 transition-colors"
            >
              <Redo2 size={12} strokeWidth={1.8} />
            </button>
          </div>

          {/* Group / Ungroup — visible only when relevant selection exists */}
          {(selectedNonGroupCount >= 2 || selectedGroupCount > 0) && (
            <div
              className="flex items-center rounded-md overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06)",
              }}
            >
              {selectedNonGroupCount >= 2 && (
                <button
                  onClick={groupSelection}
                  title="Group selection (Ctrl+G)"
                  className="p-1.5 hover:bg-violet-500/10 text-white/45 hover:text-violet-200 transition-colors"
                >
                  <GroupIcon size={12} strokeWidth={1.8} />
                </button>
              )}
              {selectedGroupCount > 0 && (
                <>
                  {selectedNonGroupCount >= 2 && <div className="w-px h-3 bg-white/[0.05]" />}
                  <button
                    onClick={ungroupSelection}
                    title="Ungroup (Ctrl+Shift+G)"
                    className="p-1.5 hover:bg-violet-500/10 text-white/45 hover:text-violet-200 transition-colors"
                  >
                    <Ungroup size={12} strokeWidth={1.8} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Save — glass button */}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
              text-[10px] font-semibold text-white/80 hover:text-white
              disabled:opacity-30 disabled:cursor-not-allowed transition-all tracking-[0.05em]"
            style={{
              fontFamily: "var(--font-mono)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.07)",
            }}
          >
            {saving ? <Loader2 size={11} className="animate-spin" strokeWidth={2} /> : <Save size={11} strokeWidth={1.8} />}
            SAVE
          </button>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={nodes.length === 0 || isRunning || hasCycle}
            className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[10px] font-bold tracking-[0.08em]
              transition-all disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
            style={{
              fontFamily: "var(--font-mono)",
              color: "#fff",
              background: isRunning
                ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
              boxShadow: isRunning
                ? "0 0 18px rgba(96,165,250,0.45), inset 0 1px 0 0 rgba(255,255,255,0.15)"
                : "0 4px 14px -4px rgba(124,58,237,0.55), inset 0 1px 0 0 rgba(255,255,255,0.15)",
            }}
            title={
              hasCycle
                ? "Graph has a cycle — break the loop before running"
                : nodes.length === 0
                ? "Add at least one node first"
                : "Run flow (Ctrl/⌘+Enter)"
            }
          >
            {isRunning
              ? <><Loader2 size={11} className="animate-spin" strokeWidth={2.4} /> RUNNING</>
              : <><Play size={10} fill="currentColor" strokeWidth={0} /> EXECUTE</>}
          </button>

          {/* Shortcut hint — opens the cheatsheet overlay. `tap-target-min`
              guarantees a 44×44 hit area per WCAG 2.5.5; visually the icon
              stays small (flex-centered). */}
          <button
            onClick={(e) => {
              // Remember the trigger so the dialog can restore focus on close.
              shortcutsTriggerRef.current = e.currentTarget;
              setShowShortcuts((v) => !v);
            }}
            className="tap-target-min rounded-md hover:bg-white/[0.05] text-white/35 hover:text-white/75 transition-colors flex-shrink-0"
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
          >
            <Keyboard size={13} strokeWidth={1.8} />
          </button>

          <button
            onClick={toggleRightPanel}
            className="p-1.5 rounded-md hover:bg-white/[0.05] text-white/35 hover:text-white/75 transition-colors flex-shrink-0"
            title="Toggle panel"
          >
            {rightPanelOpen
              ? <ChevronRight size={13} strokeWidth={1.8} />
              : <ChevronLeft size={13} strokeWidth={1.8} />}
          </button>
        </div>

        {/* ── ReactFlow canvas ──
            Aurora + grain overlays are pushed BEHIND the react-flow viewport
            by explicit z-index; otherwise the absolute-positioned overlays
            would stack on top of the (static-flow) ReactFlow component and
            — even though they're "pointer-events: none" — can visually
            obscure thin edge strokes at low opacity. */}
        <div
          className="flex-1 relative"
            style={{ background: "var(--fp-canvas-bg)" }}
        >
          {/* Aurora background mesh */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 0,
              background: `
                radial-gradient(40% 35% at 25% 35%, rgba(124, 58, 237, 0.14) 0%, transparent 60%),
                radial-gradient(35% 30% at 80% 70%, rgba(245, 158, 11, 0.09) 0%, transparent 60%),
                radial-gradient(45% 40% at 60% 20%, rgba(34, 211, 238, 0.07) 0%, transparent 70%)
              `,
            }}
          />
          {/* Grain texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{
              zIndex: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' /%3E%3C/svg%3E")`,
            }}
          />

          <ReactFlow
            style={{ position: "absolute", inset: 0, zIndex: 10 }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectEnd={handleConnectEnd}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={NODE_TYPE_MAP}
            // No custom edgeTypes — using React Flow's built-in default edge
            // renderer (known-good, battle-tested). Per-port colour still
            // comes through via each edge's `style.stroke` which the default
            // renderer honours. This eliminates an entire failure mode
            // (custom edge component never rendering / being mis-mapped).
            isValidConnection={isValidConnection}
            fitView
            fitViewOptions={{ padding: 0.4, maxZoom: 1.2 }}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={["Delete", "Backspace"]}
            // Hold Shift to draw a selection box; Cmd/Ctrl-click adds to it.
            // Left-mouse on empty canvas pans (default), and left-mouse from a
            // handle creates a connection — we don't override panOnDrag here.
            multiSelectionKeyCode={["Meta", "Control"]}
            selectionKeyCode={["Shift"]}
            selectionMode="partial"
            connectionLineType="bezier"
            connectionLineStyle={{ stroke: "#a78bfa", strokeWidth: 2.5, strokeLinecap: "round", opacity: 0.95 }}
            defaultEdgeOptions={{
              type: "default",
              animated: false,
              style: { stroke: "#a78bfa", strokeWidth: 3 },
            }}
            minZoom={0.25}
            maxZoom={2}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(255,255,255,0.045)"
            />

            <Controls
              position="bottom-left"
              className="flow-controls"
              showInteractive={false}
            />

            <MiniMap
              position="bottom-right"
              className="flow-minimap"
              maskColor="rgba(0,0,0,0.7)"
              maskStrokeColor="rgba(167,139,250,0.3)"
              maskStrokeWidth={1}
              nodeColor={(n) => {
                const reg = nodeTypes.find((t) => t.type === n.type);
                return reg?.color || "#a78bfa";
              }}
              nodeBorderRadius={4}
              nodeStrokeWidth={2}
              nodeStrokeColor="#08080b"
              style={{
                background: "linear-gradient(135deg, rgba(12,12,16,0.95) 0%, rgba(8,8,12,0.95) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            />

            {/* Cycle warning badge — only shown when a cycle exists, so the
                user can see WHY the Run button is disabled without hunting
                through tooltips. */}
            {hasCycle && (
              <Panel position="top-left">
                <div
                  className="flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(120,30,30,0.55)",
                    backdropFilter: "blur(14px) saturate(160%)",
                    WebkitBackdropFilter: "blur(14px) saturate(160%)",
                    color: "#fecaca",
                    border: "1px solid rgba(248,113,113,0.45)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    boxShadow:
                      "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 6px 18px -8px rgba(127,29,29,0.35)",
                  }}
                >
                  <AlertTriangle size={10} strokeWidth={2.2} />
                  cycle detected · run blocked
                </div>
              </Panel>
            )}

            {/* Empty state — interactive template gallery so a new user
                doesn't stare at a blank canvas. Drag-from-palette is still
                the primary mental model; templates are the shortcut. */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="!pointer-events-auto">
                <div className="mt-16 flex flex-col items-center gap-6 text-center max-w-[640px] px-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(124,58,237,0.06) 100%)",
                      backdropFilter: "blur(20px) saturate(160%)",
                      WebkitBackdropFilter: "blur(20px) saturate(160%)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      boxShadow:
                        "0 16px 40px -16px rgba(124,58,237,0.55), inset 0 1px 0 0 rgba(255,255,255,0.1)",
                    }}
                  >
                    <GitBranch size={22} className="text-white/25" strokeWidth={1.4} />
                    <div
                      className="absolute -inset-2 rounded-3xl opacity-40 -z-10"
                      style={{ background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)" }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <h2
                      className="text-[22px] font-bold tracking-[-0.02em]"
                      style={{
                        fontFamily: "var(--font-syne)",
                        background: "linear-gradient(135deg, #fff 0%, rgba(167,139,250,0.7) 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Start in one click
                    </h2>
                    <p
                      className="text-[11px] text-white/40 tracking-[0.05em]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      pick a starter · drag from the palette · or click a node to drop it
                    </p>
                  </div>

                  {/* Template tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                    {FLOW_TEMPLATES.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t)}
                        className="group/tpl text-left rounded-xl p-3 transition-all duration-200
                          hover:scale-[1.02] hover:border-violet-400/55 focus:outline-none focus:ring-2 focus:ring-violet-400/45"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(167,139,250,0.10) 0%, rgba(255,255,255,0.03) 100%)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          backdropFilter: "blur(14px)",
                          WebkitBackdropFilter: "blur(14px)",
                          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 22px -10px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-violet-500/10 border border-violet-400/20 flex items-center justify-center flex-shrink-0">
                            <Layers size={13} className="text-violet-300/90" strokeWidth={1.8} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[11px] font-semibold text-white/90 truncate">
                                {t.name}
                              </span>
                              <span
                                className="text-[8px] text-white/40 flex-shrink-0"
                                style={{ fontFamily: "var(--font-mono)" }}
                              >
                                {t.nodes.length}n · {t.edges.length}e
                              </span>
                            </div>
                            <p className="text-[10px] text-white/45 leading-snug line-clamp-2 text-left">
                              {t.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Restore-draft inline action */}
                  {draftAvailable && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.28)",
                      }}
                    >
                      <Sparkles size={11} className="text-amber-300" strokeWidth={2} />
                      <span className="text-[10px] text-amber-100/90" style={{ fontFamily: "var(--font-mono)" }}>
                        unsaved draft available
                      </span>
                      <button
                        onClick={handleRestoreDraft}
                        className="ml-1 text-[10px] font-semibold text-amber-200 hover:text-white px-2 py-0.5 rounded
                          border border-amber-400/35 hover:border-amber-300/55 bg-amber-500/10 hover:bg-amber-500/20"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        restore
                      </button>
                      <button
                        onClick={handleDiscardDraft}
                        className="text-[10px] text-amber-200/60 hover:text-amber-200 px-1.5 py-0.5"
                        style={{ fontFamily: "var(--font-mono)" }}
                        aria-label="Discard draft"
                      >
                        discard
                      </button>
                    </div>
                  )}
                </div>
              </Panel>
            )}

            {/* Connection feedback toast (top-center) */}
            {connectionToast && (
              <Panel position="top-center" className="!pointer-events-auto mt-2">
                <div
                  role="status"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    background:
                      connectionToast.kind === "error"
                        ? "rgba(120,30,30,0.7)"
                        : "rgba(120,80,30,0.7)",
                    border: `1px solid ${connectionToast.kind === "error" ? "rgba(248,113,113,0.5)" : "rgba(251,191,36,0.5)"}`,
                    color: connectionToast.kind === "error" ? "#fecaca" : "#fde68a",
                    backdropFilter: "blur(14px) saturate(160%)",
                    WebkitBackdropFilter: "blur(14px) saturate(160%)",
                    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.55)",
                  }}
                >
                  <AlertTriangle size={10} strokeWidth={2.2} />
                  <span>{connectionToast.message}</span>
                  <button
                    onClick={() => setConnectionToast(null)}
                    className="tap-target-min ml-1 opacity-60 hover:opacity-100 transition-opacity rounded"
                    aria-label="Dismiss connection toast"
                  >
                    <X size={9} strokeWidth={2.4} />
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* ── Right panel (frosted glass rail) ── */}
      <div
        className={`flex-shrink-0 flex flex-col transition-[width] duration-200 ease-out relative z-30
          ${rightPanelOpen ? "w-[252px]" : "w-0 overflow-hidden"}`}
        style={{
          background: "var(--fp-rail-bg)",
          backdropFilter: "blur(28px) saturate(170%)",
          WebkitBackdropFilter: "blur(28px) saturate(170%)",
          borderLeft: "1px solid var(--fp-border)",
          boxShadow:
            "inset 1px 0 0 0 var(--fp-rail-sheen), -8px 0 32px -16px var(--fp-rail-shadow)",
        }}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/[0.04] flex-shrink-0">
          <button
            onClick={() => setRightPanelTab("library")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[8px] font-bold uppercase tracking-[0.18em]
              transition-colors relative
              ${rightPanelTab === "library" ? "text-white/85" : "text-white/30 hover:text-white/55"}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Library size={10} strokeWidth={2} />
            Library
            {rightPanelTab === "library" && (
              <span
                className="absolute bottom-0 left-2 right-2 h-px rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, #a78bfa, transparent)" }}
              />
            )}
          </button>
          <button
            onClick={() => setRightPanelTab("execution")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[8px] font-bold uppercase tracking-[0.18em]
              transition-colors relative
              ${rightPanelTab === "execution" ? "text-white/85" : "text-white/30 hover:text-white/55"}`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Terminal size={10} strokeWidth={2} />
            Run
            {isRunning && (
              <span
                className="w-1.5 h-1.5 rounded-full ml-0.5"
                style={{ background: "#60a5fa", boxShadow: "0 0 6px rgba(96,165,250,0.7)" }}
              />
            )}
            {rightPanelTab === "execution" && (
              <span
                className="absolute bottom-0 left-2 right-2 h-px rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, #a78bfa, transparent)" }}
              />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {rightPanelTab === "library" ? (
            <FlowLibrary
              onLoadFlow={handleLoadFlow}
              onNewFlow={handleNew}
              onDeleteFlow={handleDeleteFlow}
              onLoadTemplate={handleApplyTemplate}
              loading={libLoading}
            />
          ) : (
            <ExecutionPanel
              onRun={handleRun}
              onCancel={handleCancel}
              creditEstimate={creditEstimate}
              hasCycle={hasCycle}
              onFocusNode={(nodeId) => {
                const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
                if (!node) return;
                const w = node.width || node.style?.width || 240;
                const h = node.height || node.style?.height || 160;
                setCenter(node.position.x + w / 2, node.position.y + h / 2, { duration: 400, zoom: 1.1 });
                // Mark only that node selected so the canvas highlights it
                useFlowStore.setState({
                  nodes: useFlowStore.getState().nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
                });
              }}
            />
          )}
        </div>
      </div>

      {/* ── Shortcut cheatsheet overlay ─────────────────────────────── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: "var(--z-modal, 60)",
          }}
          onClick={() => setShowShortcuts(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div
            ref={shortcutsDialogRef}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full rounded-2xl p-5"
            style={{
              background: "linear-gradient(180deg, rgba(28,28,40,0.96) 0%, rgba(14,14,20,0.96) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 22px 60px -18px rgba(0,0,0,0.7), inset 0 1px 0 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard size={14} className="text-violet-300" strokeWidth={1.8} />
                <h3 className="text-[13px] font-semibold text-white/90" style={{ fontFamily: "var(--font-syne)" }}>
                  Keyboard shortcuts
                </h3>
              </div>
              <button
                ref={shortcutsCloseBtnRef}
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/80 transition-colors tap-target-min"
                aria-label="Close shortcuts"
              >
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-3" style={{ fontFamily: "var(--font-mono)" }}>
              {[
                ["Run flow",            ["Ctrl/⌘", "Enter"]],
                ["Save",                ["Ctrl/⌘", "S"]],
                ["Undo / Redo",         ["Ctrl/⌘", "Z / Shift+Z"]],
                ["Duplicate selected",  ["Ctrl/⌘", "D"]],
                ["Select all",          ["Ctrl/⌘", "A"]],
                ["Group / Ungroup",     ["Ctrl/⌘", "G / Shift+G"]],
                ["Delete selection",    ["Delete or Backspace"]],
                ["Nudge selection 8px", ["Arrow keys"]],
                ["Nudge selection 32px",["Shift + Arrow keys"]],
                ["Close popovers",      ["Esc"]],
                ["This panel",          ["?"]],
              ].map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[10.5px] text-white/70" style={{ fontFamily: "var(--font-sans)" }}>
                    {label}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-1.5 py-0.5 rounded text-[9px] text-white/70 border border-white/15 bg-white/[0.05]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[9.5px] text-white/35 leading-snug" style={{ fontFamily: "var(--font-mono)" }}>
              Tip: typing in an input or textarea suspends most shortcuts so you can type freely.<br />
              Right-click any node for quick actions (Duplicate · Collapse · Delete).
            </p>
          </div>
        </div>
      )}

      {/* ── Mobile / small-viewport guard ───────────────────────────── */}
      {viewportTooSmall && !embedded && (
        <div
          ref={viewportDialogRef}
          className="fixed inset-0 flex items-center justify-center p-6"
          style={{
            background: "rgba(6,6,10,0.94)",
            backdropFilter: "blur(10px)",
            zIndex: "var(--z-popover, 70)",
          }}
          role="alertdialog"
          aria-modal="true"
          aria-label="Flows needs a larger screen"
        >
          <div
            className="max-w-xs w-full rounded-2xl p-6 text-center"
            style={{
              background: "linear-gradient(180deg, rgba(28,28,40,0.96) 0%, rgba(14,14,20,0.96) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 22px 60px -18px rgba(0,0,0,0.7)",
            }}
          >
            <div
              className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(124,58,237,0.06) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <Smartphone size={20} className="text-violet-300/90" strokeWidth={1.6} />
            </div>
            <h3 className="text-[14px] font-semibold text-white/95 mb-1" style={{ fontFamily: "var(--font-syne)" }}>
              Flows needs a larger screen
            </h3>
            <p className="text-[11px] text-white/55 leading-relaxed mb-4">
              The canvas is designed for desktop and tablet. Open this page on a wider device to build and run flows.
            </p>
            <button
              ref={viewportCloseBtnRef}
              onClick={() => navigate("/dashboard")}
              className="w-full py-2 rounded-md text-[11px] font-semibold text-white/85 hover:text-white tap-target-min
                bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.18] transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page wrapper (provides ReactFlow context) ──────────────────────────────

export default function FlowsPage({ embedded = false }) {
  const flowId = !embedded
    ? (window.location.pathname.split("/flows/")[1] || null)
    : null;

  return (
    <div
      className={`flows-page-shell ${embedded ? "relative w-full overflow-hidden" : "fixed inset-0 overflow-hidden"}`}
      style={embedded
        ? { height: "calc(100vh - 4.5rem)", background: "var(--fp-page-bg, #08080b)", zIndex: 1 }
        : { top: 0, left: 0, right: 0, bottom: 0, background: "var(--fp-page-bg, #08080b)", zIndex: 1 }
      }
    >
      <ReactFlowProvider>
        <FlowCanvas flowId={flowId} embedded={embedded} />
      </ReactFlowProvider>

      <style>{`
        .react-flow__attribution { display: none !important; }

        /* ── Theme tokens (dark default) ───────────────────────────────── */
        .flows-page-root,
        .flows-page-shell {
          --fp-page-bg: #06060a;
          --fp-canvas-bg: #0b0b10;
          --fp-text: #f4f4f5;
          --fp-text-muted: #a1a1aa;
          --fp-border: rgba(255,255,255,0.10);
          --fp-border-strong: rgba(255,255,255,0.22);
          --fp-rail-bg: linear-gradient(180deg, rgba(20,20,30,0.72) 0%, rgba(10,10,16,0.78) 100%);
          --fp-toolbar-bg: linear-gradient(180deg, rgba(20,20,30,0.55) 0%, rgba(10,10,16,0.62) 100%);
          --fp-rail-sheen: rgba(255,255,255,0.05);
          --fp-rail-shadow: rgba(0,0,0,0.6);
          --fp-glass-chip-bg: rgba(255,255,255,0.06);
          --fp-glass-chip-border: rgba(255,255,255,0.14);

          --fp-node-bg: linear-gradient(180deg, rgba(34,32,48,0.55) 0%, rgba(18,18,28,0.62) 100%);
          --fp-node-border: rgba(255,255,255,0.22);
          --fp-node-border-selected: rgba(167,139,250,0.6);
          --fp-node-shadow: rgba(0,0,0,0.7);
          --fp-node-shadow-soft: rgba(0,0,0,0.45);
          --fp-node-sheen: rgba(255,255,255,0.07);

          --fp-input-bg: rgba(255,255,255,0.10);
          --fp-input-border: rgba(255,255,255,0.30);
          --fp-input-text: rgba(255,255,255,0.92);
          --fp-input-placeholder: rgba(255,255,255,0.40);
        }

        /* ── Theme tokens (light) ──────────────────────────────────────── */
        html[data-theme="light"] .flows-page-root,
        html.light .flows-page-root,
        html[data-theme="light"] .flows-page-shell,
        html.light .flows-page-shell {
          --fp-page-bg: #eef0f6;
          --fp-canvas-bg: #f5f6fa;
          --fp-text: #0f172a;
          --fp-text-muted: #475569;
          --fp-border: rgba(15,23,42,0.14);
          --fp-border-strong: rgba(15,23,42,0.20);
          --fp-rail-bg: linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(238,240,246,0.82) 100%);
          --fp-toolbar-bg: linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(245,246,250,0.72) 100%);
          --fp-rail-sheen: rgba(255,255,255,0.7);
          --fp-rail-shadow: rgba(15,23,42,0.16);
          --fp-glass-chip-bg: rgba(15,23,42,0.05);
          --fp-glass-chip-border: rgba(15,23,42,0.14);

          --fp-node-bg: linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(245,246,250,0.82) 100%);
          --fp-node-border: rgba(15,23,42,0.18);
          --fp-node-border-selected: rgba(124,58,237,0.55);
          --fp-node-shadow: rgba(15,23,42,0.16);
          --fp-node-shadow-soft: rgba(15,23,42,0.10);
          --fp-node-sheen: rgba(255,255,255,0.7);

          --fp-input-bg: rgba(255,255,255,0.85);
          --fp-input-border: rgba(15,23,42,0.18);
          --fp-input-text: #0f172a;
          --fp-input-placeholder: rgba(15,23,42,0.40);
        }

        /* ── Light-mode tactical overrides for Tailwind text/border/bg ── */
        html[data-theme="light"] .flows-page-root .text-white,
        html.light .flows-page-root .text-white,
        html[data-theme="light"] .flows-page-root [class*="text-white\\/95"],
        html.light .flows-page-root [class*="text-white\\/95"],
        html[data-theme="light"] .flows-page-root [class*="text-white\\/9"],
        html.light .flows-page-root [class*="text-white\\/9"] { color: #0f172a !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/8"],
        html.light .flows-page-root [class*="text-white\\/8"] { color: #1e293b !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/7"],
        html.light .flows-page-root [class*="text-white\\/7"] { color: #334155 !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/6"],
        html.light .flows-page-root [class*="text-white\\/6"] { color: #475569 !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/5"],
        html.light .flows-page-root [class*="text-white\\/5"] { color: #64748b !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/4"],
        html.light .flows-page-root [class*="text-white\\/4"] { color: #64748b !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/3"],
        html.light .flows-page-root [class*="text-white\\/3"] { color: #94a3b8 !important; }
        html[data-theme="light"] .flows-page-root [class*="text-white\\/2"],
        html.light .flows-page-root [class*="text-white\\/2"] { color: #94a3b8 !important; }

        html[data-theme="light"] .flows-page-root [class*="border-white"],
        html.light .flows-page-root [class*="border-white"] {
          border-color: rgba(15,23,42,0.16) !important;
        }
        html[data-theme="light"] .flows-page-root [class*="bg-white\\/"],
        html.light .flows-page-root [class*="bg-white\\/"] {
          background-color: rgba(15,23,42,0.05) !important;
        }
        html[data-theme="light"] .flows-page-root .hover\\:bg-white\\/10:hover,
        html.light .flows-page-root .hover\\:bg-white\\/10:hover,
        html[data-theme="light"] .flows-page-root [class*="hover\\:bg-white"]:hover,
        html.light .flows-page-root [class*="hover\\:bg-white"]:hover {
          background-color: rgba(15,23,42,0.10) !important;
        }

        /* ── Dropdown contrast (fixes white-text-on-white-bg) ──────────── */
        .flows-page-root select,
        .flows-page-shell select,
        .flow-node-card select {
          background-color: var(--fp-input-bg);
          color: var(--fp-input-text);
          border-color: var(--fp-input-border);
        }
        .flows-page-root select option,
        .flows-page-shell select option,
        .flow-node-card select option {
          background: #1a1a26;
          color: #e4e4e7;
        }
        html[data-theme="light"] .flows-page-root select option,
        html.light .flows-page-root select option,
        html[data-theme="light"] .flow-node-card select option,
        html.light .flow-node-card select option {
          background: #ffffff;
          color: #0f172a;
        }
        .flows-page-root textarea::placeholder,
        .flows-page-root input::placeholder,
        .flow-node-card textarea::placeholder,
        .flow-node-card input::placeholder {
          color: var(--fp-input-placeholder);
        }

        /* ── Light-mode adjustments for the React Flow canvas itself ──── */
        html[data-theme="light"] .flows-page-root .react-flow,
        html.light .flows-page-root .react-flow {
          --xy-edge-stroke: #7c3aed;
          --xy-edge-stroke-default: #7c3aed;
          --xy-edge-stroke-selected: #5b21b6;
          --xy-edge-stroke-selected-default: #5b21b6;
          --xy-connectionline-stroke: #7c3aed;
          --xy-connectionline-stroke-default: #7c3aed;
          --xy-background-pattern-color-props: rgba(15,23,42,0.10);
        }
        html[data-theme="light"] .flows-page-root .react-flow__edge-path,
        html.light .flows-page-root .react-flow__edge-path,
        html[data-theme="light"] .flows-page-root .react-flow__connection-path,
        html.light .flows-page-root .react-flow__connection-path {
          stroke: #7c3aed;
        }

        /* Edge dash flow animation */
        @keyframes flow-dash {
          to { stroke-dashoffset: -12; }
        }

        /* Custom controls */
        .flow-controls {
          background: linear-gradient(135deg, rgba(12,12,16,0.95) 0%, rgba(8,8,12,0.95) 100%) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 8px !important;
          overflow: hidden;
          box-shadow: 0 8px 24px -8px rgba(0,0,0,0.6) !important;
        }
        .flow-controls button {
          background: transparent !important;
          border: none !important;
          border-bottom: 1px solid rgba(255,255,255,0.04) !important;
          color: rgba(255,255,255,0.4) !important;
          width: 28px !important;
          height: 28px !important;
          padding: 0 !important;
          transition: all 0.15s ease;
        }
        .flow-controls button:last-child { border-bottom: none !important; }
        .flow-controls button:hover {
          background: rgba(167,139,250,0.08) !important;
          color: rgba(167,139,250,0.9) !important;
        }
        .flow-controls button svg { fill: currentColor; max-width: 12px; max-height: 12px; }

        /* Custom minimap */
        .flow-minimap { margin: 12px !important; }

        /* React Flow's own CSS vars — the canonical way to colour the
           default edge. Scoped to our page only, so every default edge
           gets a fat violet wire automatically. Per-edge style.stroke
           from flowStore still overrides when present. */
        .react-flow {
          --xy-edge-stroke: #a78bfa;
          --xy-edge-stroke-default: #a78bfa;
          --xy-edge-stroke-width: 3;
          --xy-edge-stroke-width-default: 3;
          --xy-edge-stroke-selected: #c4b5fd;
          --xy-edge-stroke-selected-default: #c4b5fd;
          --xy-connectionline-stroke: #a78bfa;
          --xy-connectionline-stroke-default: #a78bfa;
          --xy-connectionline-stroke-width: 3;
          --xy-connectionline-stroke-width-default: 3;
          --xy-background-pattern-color-props: rgba(255,255,255,0.08);
        }

        /* Edge safety-net: guarantees a visible stroke even before React
           Flow's CSS vars kick in, and stops any Tailwind reset from
           washing the line out. */
        .react-flow__edge-path,
        .react-flow__connection-path {
          stroke: #a78bfa;
          stroke-width: 3px;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
        /* Hover / selection widen the wire. */
        .react-flow__edge:hover .react-flow__edge-path {
          stroke-width: 4px;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #c4b5fd;
          stroke-width: 4px;
        }
        /* Live drag preview while user is pulling a wire. */
        .react-flow__connection-path {
          opacity: 1;
        }
        /* Defensive: nothing clips or hides the edge SVG. */
        .react-flow svg         { max-width: none !important; max-height: none !important; }
        .react-flow__edge       { visibility: visible !important; opacity: 1 !important; pointer-events: stroke; }
        .react-flow__edges      { z-index: 1; overflow: visible !important; }
        .react-flow__edges svg  { overflow: visible !important; }
        svg.react-flow__edges   { overflow: visible !important; }

        /* Handle hover */
        .react-flow__handle {
          transition: all 0.15s ease;
          cursor: crosshair !important;
          border-width: 2px !important;
        }
        .react-flow__handle:hover {
          transform: scale(1.6);
        }
        .react-flow__handle-connecting { background: #fbbf24 !important; }
        .react-flow__handle-valid { background: #34d399 !important; }

        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(167,139,250,0.25);
        }

        /* Selection box */
        .react-flow__nodesselection-rect,
        .react-flow__selection {
          background: rgba(167,139,250,0.16) !important;
          border: 1px dashed rgba(167,139,250,0.62) !important;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
