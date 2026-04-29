import BaseNode from "./BaseNode";

export default function SynthIDNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="synthid-remover"
      data={data}
      selected={selected}
      headerColor="#a78bfa"
      label={data.label || "SynthID Remover"}
      inputs={[{ id: "image", type: "image", label: "Image" }]}
      outputs={[{ id: "image", type: "image", label: "Clean" }]}
      creditCost={20}
    >
      <p
        className="text-[9px] text-white/40 leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        // strips SynthID watermark
      </p>
    </BaseNode>
  );
}
