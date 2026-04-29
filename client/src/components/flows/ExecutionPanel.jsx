/**
 * ExecutionPanel — right-panel tab for run status, live logs, credit usage.
 */

import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Clock, Coins, Terminal } from "lucide-react";
import { useFlowStore } from "../../store/flowStore";

const STATUS_CONFIG = {
  idle:      { label: "Idle",       color: "text-white/30",   Icon: Clock },
  pending:   { label: "Pending…",   color: "text-blue-400",   Icon: Loader2 },
  running:   { label: "Running",    color: "text-blue-400",   Icon: Loader2 },
  completed: { label: "Completed",  color: "text-emerald-400",Icon: CheckCircle2 },
  failed:    { label: "Failed",     color: "text-red-400",    Icon: XCircle },
  cancelled: { label: "Cancelled",  color: "text-white/30",   Icon: XCircle },
};

const LOG_COLORS = {
  info:  "text-white/50",
  warn:  "text-amber-400",
  error: "text-red-400",
};

export function ExecutionPanel({ onRun, onCancel, creditEstimate }) {
  const runStatus = useFlowStore((s) => s.runStatus);
  const nodeStatuses = useFlowStore((s) => s.nodeStatuses);
  const runLogs = useFlowStore((s) => s.runLogs);
  const creditsUsed = useFlowStore((s) => s.creditsUsed);
  const runError = useFlowStore((s) => s.runError);
  const nodes = useFlowStore((s) => s.nodes);

  const logsRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [runLogs]);

  const statusConfig = STATUS_CONFIG[runStatus || "idle"] || STATUS_CONFIG.idle;
  const { label: statusLabel, color: statusColor, Icon: StatusIcon } = statusConfig;

  const isRunning = runStatus === "running" || runStatus === "pending";
  const nodeStatusList = nodes
    .filter((n) => n.type !== "output-viewer" && n.type !== "merge-outputs")
    .map((n) => ({
      id: n.id,
      label: n.data?.label || n.type,
      status: nodeStatuses[n.id]?.status || "idle",
      message: nodeStatuses[n.id]?.message,
    }));

  return (
    <div className="flex flex-col h-full">
      {/* Status header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <StatusIcon
            size={13}
            className={`${statusColor} ${isRunning ? "animate-spin" : ""}`}
          />
          <span className={`text-[11px] font-semibold ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins size={10} className="text-white/25" />
          <span className="text-[10px] text-white/40">
            {creditsUsed > 0 ? `${creditsUsed} used` : `~${creditEstimate} est.`}
          </span>
        </div>
      </div>

      {/* Run / Cancel button */}
      <div className="px-3 py-2 border-b border-white/[0.06]">
        {isRunning ? (
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-lg border border-red-500/40 bg-red-500/10 
              text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-colors"
          >
            Cancel Run
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={nodes.length === 0}
            className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30
              text-white text-[11px] font-semibold transition-colors disabled:cursor-not-allowed"
          >
            ▶ Run Flow
          </button>
        )}

        {runError && (
          <p className="mt-1.5 text-[9px] text-red-400 break-words">{runError}</p>
        )}
      </div>

      {/* Node status list */}
      {nodeStatusList.length > 0 && (
        <div className="px-3 py-2 border-b border-white/[0.06] space-y-1.5">
          {nodeStatusList.map((n) => {
            const ns = STATUS_CONFIG[n.status] || STATUS_CONFIG.idle;
            return (
              <div key={n.id} className="flex items-center gap-2">
                <ns.Icon
                  size={10}
                  className={`${ns.color} flex-shrink-0 ${n.status === "running" ? "animate-spin" : ""}`}
                />
                <span className="text-[9px] text-white/50 truncate flex-1">{n.label}</span>
                <span className={`text-[8px] ${ns.color} flex-shrink-0`}>{ns.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Log output */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.06]">
        <Terminal size={10} className="text-white/20" />
        <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider">Log</span>
      </div>

      <div
        ref={logsRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 font-mono custom-scrollbar"
      >
        {runLogs.length === 0 && (
          <p className="text-[9px] text-white/15 italic">No logs yet.</p>
        )}
        {runLogs.map((log, i) => (
          <div key={i} className={`text-[9px] leading-relaxed ${LOG_COLORS[log.level] || LOG_COLORS.info} break-words`}>
            <span className="text-white/15 mr-1.5">
              {new Date(log.ts).toLocaleTimeString("en", { hour12: false, timeStyle: "medium" })}
            </span>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
