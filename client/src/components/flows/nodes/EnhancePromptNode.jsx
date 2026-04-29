import BaseNode from "./BaseNode";

export default function EnhancePromptNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="enhance-prompt"
      data={data}
      selected={selected}
      headerColor="#7c3aed"
      label="Enhance Prompt"
      inputs={[{ id: "text", type: "text", label: "Prompt" }]}
      outputs={[{ id: "text", type: "text", label: "Enhanced" }]}
      creditCost={1}
    >
      <p className="text-[9px] text-white/40 leading-relaxed">
        AI-refines your prompt using INSTARAW style for maximum visual quality.
      </p>
    </BaseNode>
  );
}
