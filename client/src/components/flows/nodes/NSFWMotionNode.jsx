import BaseNode from "./BaseNode";

export default function NSFWMotionNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="nsfw-motion"
      data={data}
      selected={selected}
      headerColor="#dc2626"
      label="NSFW Motion"
      inputs={[
        { id: "image", type: "image", label: "Source Image" },
        { id: "video", type: "video", label: "Motion Ref" },
        { id: "model", type: "model", label: "Model" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={90}
    >
      <p className="text-[9px] text-white/40">NSFW video generation with motion reference control.</p>
    </BaseNode>
  );
}
