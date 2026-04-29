import BaseNode from "./BaseNode";

export default function FaceSwapNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="face-swap"
      data={data}
      selected={selected}
      headerColor="#7c3aed"
      label="Face Swap"
      inputs={[
        { id: "image", type: "image", label: "Target" },
        { id: "face", type: "image", label: "Face Source" },
      ]}
      outputs={[{ id: "image", type: "image", label: "Result" }]}
      creditCost={10}
    >
      <p className="text-[9px] text-white/40">Swaps the face from source onto the target image.</p>
    </BaseNode>
  );
}
