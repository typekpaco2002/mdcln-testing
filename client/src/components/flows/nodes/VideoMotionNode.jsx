import { useFlowStore } from "../../../store/flowStore";
import BaseNode from "./BaseNode";

export default function VideoMotionNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  return (
    <BaseNode
      id={id}
      type="video-motion"
      data={data}
      selected={selected}
      headerColor="#d97706"
      label="Motion Control"
      inputs={[
        { id: "image", type: "image", label: "Source Image" },
        { id: "video", type: "video", label: "Motion Ref" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={130}
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={data.ultra || false}
          onChange={(e) => updateNodeData(id, { ultra: e.target.checked })}
          className="w-3 h-3 accent-amber-500"
        />
        <span className="text-[10px] text-white/60">Ultra quality</span>
      </label>
    </BaseNode>
  );
}
