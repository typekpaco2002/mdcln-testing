import BaseNode from "./BaseNode";

export default function UpscalerNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="upscaler"
      data={data}
      selected={selected}
      headerColor="#a78bfa"
      label={data.label || "Upscaler"}
      inputs={[{ id: "image", type: "image", label: "Image" }]}
      outputs={[{ id: "image", type: "image", label: "Upscaled" }]}
      creditCost={5}
    >
      <p
        className="text-[9px] text-white/40 leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        // x2 SeedVR2 upscale
      </p>
    </BaseNode>
  );
}
