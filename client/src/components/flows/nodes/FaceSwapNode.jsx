import BaseNode from "./BaseNode";

export default function FaceSwapNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="face-swap"
      data={data}
      selected={selected}
      headerColor="#a78bfa"
      label={data.label || "Face Swap"}
      inputs={[
        { id: "image", type: "image", label: "Target" },
        { id: "face", type: "image", label: "Face" },
      ]}
      outputs={[{ id: "image", type: "image", label: "Result" }]}
      creditCost={10}
    >
      <p
        className="text-[9px] text-white/40 leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        // swap face → target
      </p>
    </BaseNode>
  );
}
