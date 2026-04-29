import BaseNode from "./BaseNode";

export default function NSFWVideoNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="nsfw-video"
      data={data}
      selected={selected}
      headerColor="#dc2626"
      label="NSFW Video"
      inputs={[
        { id: "image", type: "image", label: "Input Image" },
        { id: "model", type: "model", label: "Model" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={80}
    >
      <p className="text-[9px] text-white/40">Generate NSFW video from an image.</p>
    </BaseNode>
  );
}
