import BaseNode from "./BaseNode";

export default function TalkingHeadNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="talking-head"
      data={data}
      selected={selected}
      headerColor="#d97706"
      label="Talking Head"
      inputs={[
        { id: "image", type: "image", label: "Portrait" },
        { id: "audio", type: "audio", label: "Audio" },
      ]}
      outputs={[{ id: "video", type: "video", label: "Video" }]}
      creditCost={50}
    >
      <p className="text-[9px] text-white/40">Animate a portrait with an audio track.</p>
    </BaseNode>
  );
}
