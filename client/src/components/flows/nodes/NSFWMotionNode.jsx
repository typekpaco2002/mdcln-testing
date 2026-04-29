import BaseNode from "./BaseNode";

export default function NSFWMotionNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="nsfw-motion"
      data={data}
      selected={selected}
      headerColor="#f87171"
      label={data.label || "NSFW Motion"}
      inputs={[
        { id: "image", type: "image", label: "Image" },
        { id: "video", type: "video", label: "Motion" },
        { id: "model", type: "model", label: "Model" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={90}
    >
      <p
        className="text-[9px] text-white/40 leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        // NSFW + motion control
      </p>
    </BaseNode>
  );
}
