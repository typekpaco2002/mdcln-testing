import BaseNode from "./BaseNode";

export default function TalkingHeadNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="talking-head"
      data={data}
      selected={selected}
      headerColor="#f59e0b"
      label={data.label || "Talking Head"}
      inputs={[
        { id: "image", type: "image", label: "Portrait" },
        { id: "audio", type: "audio", label: "Audio" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={50}
    >
      <p
        className="text-[9px] text-white/40 leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        // animate portrait + audio
      </p>
    </BaseNode>
  );
}
