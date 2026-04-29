import BaseNode from "./BaseNode";

export default function UpscalerNode({ id, data, selected }) {
  return (
    <BaseNode
      id={id}
      type="upscaler"
      data={data}
      selected={selected}
      headerColor="#7c3aed"
      label="Upscaler"
      inputs={[{ id: "image", type: "image", label: "Image" }]}
      outputs={[{ id: "image", type: "image", label: "Upscaled" }]}
      creditCost={5}
    >
      <p className="text-[9px] text-white/40">Upscales image to higher resolution via RunningHub AI.</p>
    </BaseNode>
  );
}
