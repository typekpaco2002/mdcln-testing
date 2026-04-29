/**
 * FlowEdge — minimal, always-visible edge.
 *
 * Renders a single SVG <path> with a hard-coded fallback stroke colour. No
 * gradients, no <defs>, no useStore lookups, no conditional `url(#...)`
 * references — so there is no scenario where the edge can paint with a
 * stroke that resolves to "none" on the first render frame.
 *
 * Idle edges are dashed; running edges get an animated travelling dash;
 * completed/failed/selected edges go solid.
 */

import { getBezierPath } from "@xyflow/react";
import { useFlowStore } from "../../store/flowStore";

const PORT_COLORS = {
  image: "#a78bfa",
  video: "#f59e0b",
  text:  "#22d3ee",
  model: "#34d399",
  audio: "#f472b6",
  any:   "#94a3b8",
};

const DEFAULT_STROKE = "#a78bfa";

export default function FlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  selected,
}) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    curvature: 0.35,
  });

  const nodeStatuses = useFlowStore((s) => s.nodeStatuses);
  const nodeTypes    = useFlowStore((s) => s.nodeTypes);
  const nodes        = useFlowStore((s) => s.nodes);

  // Resolve a single concrete colour from the source port type — never relies
  // on <defs> resolution.
  let stroke = DEFAULT_STROKE;
  const srcNode = nodes.find((n) => n.id === source);
  if (srcNode) {
    const reg = nodeTypes.find((t) => t.type === srcNode.type);
    const port = reg?.outputs?.find((p) => p.id === sourceHandleId) || reg?.outputs?.[0];
    if (port) stroke = PORT_COLORS[port.type] || DEFAULT_STROKE;
  }

  const targetStatus = nodeStatuses[target]?.status;
  const sourceStatus = nodeStatuses[source]?.status;
  const isRunning   = targetStatus === "running";
  const isCompleted = sourceStatus === "completed" || targetStatus === "completed";
  const isFailed    = targetStatus === "failed" || sourceStatus === "failed";
  const isIdle      = !isRunning && !isCompleted && !isFailed && !selected;

  const dashArray   = isRunning ? "6 6" : isIdle ? "5 5" : undefined;
  const strokeWidth = selected ? 2.5 : isRunning ? 2.25 : 2;
  const finalStroke = isFailed ? "#ef4444" : stroke;

  return (
    <g className="react-flow__edge-mc">
      {/* Soft glow underlay — always painted */}
      <path
        d={edgePath}
        fill="none"
        stroke={finalStroke}
        strokeWidth={isRunning || selected ? 7 : 5}
        strokeOpacity={isRunning ? 0.28 : selected ? 0.20 : isCompleted ? 0.16 : 0.14}
        style={{ filter: "blur(3px)", pointerEvents: "none" }}
      />

      {/* Main solid/dashed stroke — concrete colour, no url() */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={finalStroke}
        strokeWidth={strokeWidth}
        strokeOpacity={isIdle ? 0.9 : 1}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        style={{
          animation: isRunning ? "flow-dash 0.8s linear infinite" : "none",
          pointerEvents: "all",
        }}
      />
    </g>
  );
}
