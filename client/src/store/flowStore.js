/**
 * AI Flows Builder — Zustand canvas store
 *
 * Manages React Flow canvas state (nodes, edges, selection) plus
 * the sidebar state and current run status / SSE stream.
 */

import { create } from "zustand";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";

let historyStack = [];
let historyFuture = [];
const MAX_HISTORY = 50;

export const useFlowStore = create((set, get) => ({
  // ── Canvas ──────────────────────────────────────────────────────────────
  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({ edges: addEdge({ ...connection, animated: false }, state.edges) })),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  clearSelection: () => set({ selectedNodeId: null }),

  addNode: (node) => {
    get()._pushHistory();
    set((state) => ({ nodes: [...state.nodes, node] }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  deleteNode: (nodeId) => {
    get()._pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  duplicateNode: (nodeId) => {
    const node = get().nodes.find((n) => n.id === nodeId);
    if (!node) return;
    get()._pushHistory();
    const newNode = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data },
      selected: false,
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  // ── History (undo/redo) ──────────────────────────────────────────────────
  _pushHistory: () => {
    const state = get();
    historyStack = [...historyStack.slice(-MAX_HISTORY), { nodes: state.nodes, edges: state.edges }];
    historyFuture = [];
  },

  undo: () => {
    if (!historyStack.length) return;
    const state = get();
    historyFuture = [{ nodes: state.nodes, edges: state.edges }, ...historyFuture];
    const prev = historyStack[historyStack.length - 1];
    historyStack = historyStack.slice(0, -1);
    set({ nodes: prev.nodes, edges: prev.edges });
  },

  redo: () => {
    if (!historyFuture.length) return;
    const state = get();
    historyStack = [...historyStack, { nodes: state.nodes, edges: state.edges }];
    const next = historyFuture[0];
    historyFuture = historyFuture.slice(1);
    set({ nodes: next.nodes, edges: next.edges });
  },

  canUndo: () => historyStack.length > 0,
  canRedo: () => historyFuture.length > 0,

  // ── Flow metadata ────────────────────────────────────────────────────────
  currentFlowId: null,
  currentFlowName: "Untitled Flow",
  isDirty: false,

  setCurrentFlow: (flow) =>
    set({
      currentFlowId: flow.id,
      currentFlowName: flow.name,
      nodes: flow.nodes || [],
      edges: flow.edges || [],
      isDirty: false,
    }),

  setFlowName: (name) => set({ currentFlowName: name, isDirty: true }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  // ── Run state ────────────────────────────────────────────────────────────
  currentRunId: null,
  runStatus: null, // "pending" | "running" | "completed" | "failed" | "cancelled"
  nodeStatuses: {}, // { nodeId: { status, output, outputType, message, error } }
  runLogs: [],
  creditsUsed: 0,
  runError: null,

  setCurrentRunId: (id) => set({ currentRunId: id }),

  handleSSEEvent: (event) => {
    const { type, nodeId, status, output, outputType, message, error, creditsUsed, nodeResults } = event;

    if (type === "node") {
      set((state) => ({
        nodeStatuses: {
          ...state.nodeStatuses,
          [nodeId]: { status, output, outputType, message, error },
        },
        // Animate edges when a node starts running
        edges: status === "running"
          ? state.edges.map((e) =>
              e.target === nodeId ? { ...e, animated: true } : e
            )
          : status === "completed"
          ? state.edges.map((e) =>
              e.target === nodeId ? { ...e, animated: false } : e
            )
          : state.edges,
      }));
    } else if (type === "log") {
      set((state) => ({
        runLogs: [...state.runLogs, { ts: event.ts, nodeId, message: event.message, level: event.level }],
      }));
    } else if (type === "flow") {
      set({
        runStatus: status,
        creditsUsed: creditsUsed || 0,
        runError: error || null,
        ...(nodeResults ? { nodeStatuses: Object.fromEntries(
          Object.entries(nodeResults).map(([id, r]) => [id, { status: r.status, output: r.output, outputType: r.outputType, error: r.error }])
        ) } : {}),
      });
    }
  },

  startRun: (runId) =>
    set({ currentRunId: runId, runStatus: "pending", nodeStatuses: {}, runLogs: [], creditsUsed: 0, runError: null }),

  resetRun: () =>
    set({ currentRunId: null, runStatus: null, nodeStatuses: {}, runLogs: [], creditsUsed: 0, runError: null }),

  // ── UI state ─────────────────────────────────────────────────────────────
  paletteOpen: true,
  rightPanelOpen: true,
  rightPanelTab: "library", // "library" | "execution"

  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  // Load saved flows list
  savedFlows: [],
  setSavedFlows: (flows) => set({ savedFlows: flows }),

  // Node type registry (loaded from server)
  nodeTypes: [],
  nodeCategories: {},
  setNodeTypeRegistry: (types, categories) => set({ nodeTypes: types, nodeCategories: categories }),
}));
