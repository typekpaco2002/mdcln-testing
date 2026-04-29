import { useCallback, useRef } from "react";
import { Upload, Link } from "lucide-react";
import BaseNode from "./BaseNode";
import { useFlowStore } from "../../../store/flowStore";

export default function ImageInputNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  const fileRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => updateNodeData(id, { imageUrl: e.target.result, mode: "upload" });
    reader.readAsDataURL(file);
  }, [id, updateNodeData]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <BaseNode
      id={id}
      type="image-input"
      data={data}
      selected={selected}
      headerColor="#2563eb"
      label="Image Input"
      inputs={[]}
      outputs={[{ id: "image", type: "image", label: "Image" }]}
      creditCost={0}
    >
      <div
        className="rounded-lg border-2 border-dashed border-white/10 hover:border-blue-500/40 
          flex flex-col items-center justify-center gap-1 p-3 cursor-pointer transition-colors bg-white/[0.02]"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        {data.imageUrl && data.imageUrl.startsWith("data:") ? (
          <img src={data.imageUrl} alt="Input" className="w-full h-20 object-contain rounded" />
        ) : data.imageUrl ? (
          <img src={data.imageUrl} alt="Input" className="w-full h-20 object-contain rounded" />
        ) : (
          <>
            <Upload size={16} className="text-white/30" />
            <span className="text-[9px] text-white/30 text-center">Click or drop image</span>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      <div className="flex items-center gap-1.5">
        <Link size={10} className="text-white/30 flex-shrink-0" />
        <input
          type="text"
          placeholder="or paste URL…"
          value={data.mode === "url" ? (data.imageUrl || "") : ""}
          onChange={(e) => updateNodeData(id, { imageUrl: e.target.value, mode: "url" })}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 
            placeholder:text-white/20 outline-none focus:border-blue-500/40 min-w-0"
        />
      </div>
    </BaseNode>
  );
}
