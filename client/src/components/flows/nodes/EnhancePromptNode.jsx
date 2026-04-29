import BaseNode from "./BaseNode";

export default function EnhancePromptNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="enhance-prompt"
      data={data}
      selected={selected}
      headerColor="#a78bfa"
      label={data.label || "Enhance Prompt"}
      inputs={[{ id: "text", type: "text", label: "Prompt" }]}
      outputs={[{ id: "text", type: "text", label: "Enhanced" }]}
      creditCost={1}
    >
      <p
        className="text-[9px] text-white/40 leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        // refines prompt with INSTARAW
      </p>
    </BaseNode>
  );
}
