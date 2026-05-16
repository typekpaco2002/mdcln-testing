/**
 * ExecutionPanel — terminal-style live run monitor.
 * Sections: status bar, run/cancel button, node timeline, monospace log feed.
 *
 * Time saving touches:
 *   - Per-node elapsed wall-time (tracked locally from SSE status transitions,
 *     since the store doesn't carry startedAt/finishedAt fields).
 *   - Total run elapsed timer ticks every second while running.
 *   - Failed nodes are clickable and call `onFocusNode(nodeId)` so the canvas
 *     pans/zooms onto the offender instead of forcing the user to hunt.
 *   - Cycle hint: if the parent flags a cycle the Execute button is locked
 *     with a clear "graph has a cycle" reason so the user doesn't waste a
 *     click pinging a run that will fail.
 */

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Square,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  Coins,
  ChevronRight,
  AlertTriangle,
  Crosshair,
} from "lucide-react";
import { useFlowStore } from "../../store/flowStore";

const STATUS_CONFIG = {
  idle:      { label: "READY",     dot: "rgba(255,255,255,0.25)", text: "text-white/40" },
  pending:   { label: "QUEUED",    dot: "#60a5fa",                text: "text-blue-300" },
  running:   { label: "RUNNING",   dot: "#60a5fa",                text: "text-blue-300" },
  completed: { label: "COMPLETED", dot: "#34d399",                text: "text-emerald-300" },
  failed:    { label: "FAILED",    dot: "#f87171",                text: "text-red-300" },
  cancelled: { label: "CANCELLED", dot: "rgba(255,255,255,0.3)",  text: "text-white/40" },
  skipped:   { label: "SKIPPED",   dot: "rgba(255,255,255,0.3)",  text: "text-white/40" },
};

const LOG_LEVELS = {
  info:  { color: "text-white/55", prefix: "○", prefixColor: "text-white/30" },
  warn:  { color: "text-amber-300/85", prefix: "▲", prefixColor: "text-amber-400/60" },
  error: { color: "text-red-300/90", prefix: "×", prefixColor: "text-red-400/70" },
};

function NodeStatusIcon({ status, size = 10 }) {
  if (status === "running" || status === "pending")
    return <Loader2 size={size} className="text-blue-400 animate-spin" strokeWidth={2.4} />;
  if (status === "completed") return <CheckCircle2 size={size} className="text-emerald-400" strokeWidth={2.2} />;
  if (status === "failed") return <XCircle size={size} className="text-red-400" strokeWidth={2.2} />;
  return <Circle size={size} className="text-white/20" strokeWidth={1.8} />;
}

function formatElapsed(ms) {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  return `${m}m ${String(rem).padStart(2, "0")}s`;
}

export function ExecutionPanel({ onRun, onCancel, creditEstimate, hasCycle = false, onFocusNode }) {
  const runStatus = useFlowStore((s) => s.runStatus);
  const nodeStatuses = useFlowStore((s) => s.nodeStatuses);
  const runLogs = useFlowStore((s) => s.runLogs);
  const creditsUsed = useFlowStore((s) => s.creditsUsed);
  const runError = useFlowStore((s) => s.runError);
  const nodes = useFlowStore((s) => s.nodes);
  const currentRunId = useFlowStore((s) => s.currentRunId);

  const logsRef = useRef(null);
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [runLogs]);

  // ── Per-node timing ────────────────────────────────────────────────
  // We watch nodeStatuses transitions and stamp startedAt / finishedAt
  // locally. (The Zustand store doesn't carry timestamps — keeping this
  // purely client-side avoids any backend coupling.)
  const timingsRef = useRef(new Map()); // nodeId -> { startedAt, finishedAt }
  const [, forceTick] = useState(0); // 1 Hz tick to refresh "running" elapsed
  const [runStartedAt, setRunStartedAt] = useState(null);

  // Reset timings on a new run.
  useEffect(() => {
    if (!currentRunId) {
      timingsRef.current = new Map();
      setRunStartedAt(null);
      return;
    }
    timingsRef.current = new Map();
    setRunStartedAt(Date.now());
  }, [currentRunId]);

  // Drive timing transitions off the nodeStatuses snapshot.
  useEffect(() => {
    const now = Date.now();
    for (const [nodeId, st] of Object.entries(nodeStatuses)) {
      const t = timingsRef.current.get(nodeId) || {};
      if ((st.status === "running" || st.status === "pending") && !t.startedAt) {
        t.startedAt = now;
      }
      if ((st.status === "completed" || st.status === "failed" || st.status === "skipped") && !t.finishedAt) {
        if (!t.startedAt) t.startedAt = now;
        t.finishedAt = now;
      }
      timingsRef.current.set(nodeId, t);
    }
  }, [nodeStatuses]);

  // 1 Hz tick while a run is active so the "running" timers refresh.
  useEffect(() => {
    if (runStatus !== "running" && runStatus !== "pending") return;
    const id = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [runStatus]);

  const cfg = STATUS_CONFIG[runStatus || "idle"] || STATUS_CONFIG.idle;
  const isRunning = runStatus === "running" || runStatus === "pending";

  const nodeStatusList = nodes
    .filter((n) => n.type !== "merge-outputs" && n.type !== "group")
    .map((n) => {
      const t = timingsRef.current.get(n.id);
      let elapsed = null;
      if (t?.startedAt) {
        elapsed = (t.finishedAt || Date.now()) - t.startedAt;
      }
      return {
        id: n.id,
        label: n.data?.label || n.type,
        type: n.type,
        status: nodeStatuses[n.id]?.status || "idle",
        error: nodeStatuses[n.id]?.error,
        elapsed,
      };
    });

  const completed = nodeStatusList.filter((n) => n.status === "completed").length;
  const failed = nodeStatusList.filter((n) => n.status === "failed").length;
  const total = nodeStatusList.length;
  const totalElapsed = runStartedAt
    ? (runStatus === "completed" || runStatus === "failed" || runStatus === "cancelled"
        // Once the run terminates, freeze the timer at the last finishedAt
        // we saw so the user can see the final number (vs it ticking forever).
        ? Math.max(
            0,
            Math.max(...Array.from(timingsRef.current.values()).map((t) => t.finishedAt || 0), 0) - runStartedAt
          ) || (Date.now() - runStartedAt)
        : Date.now() - runStartedAt)
    : null;

  // Decide whether Execute should be locked.
  const disabledReason = hasCycle
    ? "Graph has a cycle — break the loop first"
    : nodes.length === 0
    ? "Add at least one node first"
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Status bar ── */}
      <div className="px-3 py-3 border-b border-white/[0.10]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: cfg.dot,
                boxShadow: isRunning ? `0 0 8px ${cfg.dot}` : "none",
                animation: isRunning ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            />
            <span
              className={`text-[8.5px] font-bold tracking-[0.18em] ${cfg.text}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {cfg.label}
            </span>
            {totalElapsed != null && total > 0 && (
              <span
                className="text-[8.5px] text-white/35 tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
                title="Total elapsed"
              >
                · {formatElapsed(totalElapsed)}
              </span>
            )}
          </div>
          {total > 0 && (
            <span
              className="text-[8.5px] text-white/35 tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
              title={`${completed} of ${total} completed${failed ? `, ${failed} failed` : ""}`}
            >
              {String(completed).padStart(2, "0")}/{String(total).padStart(2, "0")}
              {failed > 0 && <span className="text-red-300/70"> ·{failed}</span>}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: total > 0 ? `${(completed / total) * 100}%` : "0%",
                background:
                  runStatus === "failed"
                    ? "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                    : runStatus === "completed"
                    ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
                    : "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)",
                boxShadow: isRunning ? "0 0 12px rgba(167,139,250,0.5)" : "none",
              }}
            />
          </div>
        )}

        {/* Credits */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Coins size={9} className="text-amber-300/60" strokeWidth={2} />
            <span
              className="text-[9px] text-white/45 tabular-nums"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {creditsUsed > 0 ? `${creditsUsed} used` : `~${creditEstimate} est`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Action button ── */}
      <div className="px-3 py-2.5 border-b border-white/[0.10]">
        {isRunning ? (
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold tracking-[0.1em]
              text-red-300 border border-red-400/30 bg-red-500/[0.06] hover:bg-red-500/[0.12] hover:border-red-400/45
              transition-all"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <Square size={10} fill="currentColor" strokeWidth={0} />
            STOP RUN
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!!disabledReason}
            title={disabledReason || "Run flow (Ctrl/⌘+Enter)"}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold tracking-[0.1em]
              transition-all disabled:cursor-not-allowed disabled:opacity-30"
            style={{
              fontFamily: "var(--font-mono)",
              background:
                "linear-gradient(180deg, rgba(167,139,250,0.95) 0%, rgba(124,58,237,0.95) 100%)",
              color: "#fff",
              border: "1px solid rgba(167,139,250,0.55)",
              boxShadow:
                "0 6px 20px -4px rgba(124,58,237,0.55), 0 0 0 1px rgba(167,139,250,0.18), inset 0 1px 0 0 rgba(255,255,255,0.22)",
            }}
          >
            <Play size={10} fill="currentColor" strokeWidth={0} />
            EXECUTE
          </button>
        )}

        {disabledReason && !isRunning && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/[0.06] border border-amber-400/20">
            <AlertTriangle size={9} className="text-amber-300/85 flex-shrink-0" strokeWidth={2} />
            <p className="text-[9px] text-amber-200/80 leading-snug" style={{ fontFamily: "var(--font-mono)" }}>
              {disabledReason}
            </p>
          </div>
        )}

        {runError && (
          <p className="mt-2 text-[9px] text-red-300/80 break-words leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
            {runError}
          </p>
        )}
      </div>

      {/* ── Node timeline ── */}
      {nodeStatusList.length > 0 && (
        <div className="px-3 py-2.5 border-b border-white/[0.10]">
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-[8px] uppercase tracking-[0.18em] font-bold text-white/40"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Pipeline
            </span>
            {failed > 0 && (
              <span
                className="ml-auto text-[8px] text-red-300/70"
                style={{ fontFamily: "var(--font-mono)" }}
                title="Click a failed node below to focus it"
              >
                click ✗ to focus
              </span>
            )}
          </div>
          <div className="space-y-1">
            {nodeStatusList.map((n) => {
              const sc = STATUS_CONFIG[n.status] || STATUS_CONFIG.idle;
              const clickable = !!onFocusNode && (n.status === "failed" || n.status === "running");
              return (
                <div
                  key={n.id}
                  onClick={clickable ? () => onFocusNode(n.id) : undefined}
                  onKeyDown={(e) => {
                    if (!clickable) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onFocusNode(n.id);
                    }
                  }}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={clickable ? `Focus ${n.label} on canvas` : undefined}
                  className={`flex items-center gap-2 px-1.5 py-1 rounded transition-colors outline-none
                    ${n.status === "running" ? "bg-blue-500/[0.05]" : ""}
                    ${n.status === "failed" ? "bg-red-500/[0.05]" : ""}
                    ${clickable ? "cursor-pointer hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:ring-1 focus-visible:ring-violet-400/45" : ""}
                  `}
                  title={
                    n.status === "failed" && n.error
                      ? `${n.error}\n(click to focus)`
                      : clickable
                      ? "Click to focus on canvas"
                      : undefined
                  }
                >
                  <NodeStatusIcon status={n.status} size={9} />
                  <span
                    className="text-[9.5px] text-white/65 truncate flex-1"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {n.label}
                  </span>
                  {n.elapsed != null && (
                    <span
                      className="text-[8px] text-white/30 tabular-nums flex-shrink-0"
                      style={{ fontFamily: "var(--font-mono)" }}
                      title="Elapsed for this node"
                    >
                      {formatElapsed(n.elapsed)}
                    </span>
                  )}
                  <span
                    className={`text-[7.5px] tracking-[0.1em] flex-shrink-0 ${sc.text}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {sc.label}
                  </span>
                  {clickable && (
                    <Crosshair size={9} className="text-white/30 flex-shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Log feed (terminal style) ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.10] flex-shrink-0">
        <ChevronRight size={9} className="text-emerald-400/60" strokeWidth={2.4} />
        <span
          className="text-[8px] uppercase tracking-[0.18em] font-bold text-white/40"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Console
        </span>
        {runLogs.length > 0 && (
          <span className="ml-auto text-[8px] text-white/25" style={{ fontFamily: "var(--font-mono)" }}>
            {runLogs.length}
          </span>
        )}
      </div>

      <div
        ref={logsRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-[2px] custom-scrollbar"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.45) 100%)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        {runLogs.length === 0 && (
          <p
            className="text-[9px] text-white/15 italic mt-2"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            $ awaiting input…
          </p>
        )}
        {runLogs.map((log, i) => {
          const lvl = LOG_LEVELS[log.level] || LOG_LEVELS.info;
          return (
            <div
              key={i}
              className="text-[9px] leading-[1.5] flex gap-1.5 break-words"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span className="text-white/15 flex-shrink-0 tabular-nums">
                {String(new Date(log.ts).getHours()).padStart(2, "0")}:
                {String(new Date(log.ts).getMinutes()).padStart(2, "0")}:
                {String(new Date(log.ts).getSeconds()).padStart(2, "0")}
              </span>
              <span className={`flex-shrink-0 ${lvl.prefixColor}`}>{lvl.prefix}</span>
              <span className={`${lvl.color} min-w-0`}>{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
