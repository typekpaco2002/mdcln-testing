import BaseNode from "./BaseNode";

export default function SynthIDNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="synthid-remover"
      data={data}
      selected={selected}
      headerColor="#7c3aed"
      label="SynthID Remover"
      inputs={[{ id: "image", type: "image", label: "Image" }]}
      outputs={[{ id: "image", type: "image", label: "Clean Image" }]}
      creditCost={20}
    >
      <p className="text-[9px] text-white/40">Removes SynthID or NanaBanana digital watermarks.</p>
    </BaseNode>
  );
}
