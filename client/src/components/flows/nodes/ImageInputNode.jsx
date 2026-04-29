import { useCallback, useRef, useState } from "react";
import { Upload, Link2, X } from "lucide-react";
import BaseNode from "./BaseNode";
import { useFlowStore } from "../../../store/flowStore";

export default function ImageInputNode({ id, data, selected }) {
  const { updateNodeData } = useFlowStore();
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => updateNodeData(id, { imageUrl: e.target.result, mode: "upload" });
    reader.readAsDataURL(file);
  }, [id, updateNodeData]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clear = (e) => {
    e.stopPropagation();
    updateNodeData(id, { imageUrl: "", mode: "url" });
  };

  return (
    <BaseNode
      id={id}
      type="image-input"
      data={data}
      selected={selected}
      headerColor="#60a5fa"
      label={data.label || "Image Input"}
      inputs={[]}
      outputs={[{ id: "image", type: "image", label: "Image" }]}
      creditCost={0}
    >
      <div
        className={`group relative rounded-md flex flex-col items-center justify-center cursor-pointer
          transition-all overflow-hidden ${data.imageUrl ? "p-0" : "p-4"}`}
        style={{
          minHeight: data.imageUrl ? "auto" : "70px",
          background: dragOver
            ? "linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0.04) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.005) 100%)",
          border: `1px dashed ${dragOver ? "rgba(96,165,250,0.5)" : "rgba(255,255,255,0.10)"}`,
        }}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
      >
        {data.imageUrl ? (
          <>
            <img src={data.imageUrl} alt="Input" className="w-full max-h-24 object-contain" />
            <button
              onClick={clear}
              className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center
                bg-black/60 hover:bg-red-500/80 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
              title="Clear"
            >
              <X size={9} strokeWidth={2.5} />
            </button>
          </>
        ) : (
          <>
            <Upload size={14} className="text-white/30 group-hover:text-blue-300/70 transition-colors mb-1.5" strokeWidth={1.6} />
            <span className="text-[9px] text-white/35 group-hover:text-white/55 transition-colors">
              Click or drop image
            </span>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      <div className="flex items-center gap-1.5 mt-2">
        <Link2 size={9} className="text-white/25 flex-shrink-0" strokeWidth={1.8} />
        <input
          type="text"
          placeholder="paste URL…"
          value={data.mode === "url" ? (data.imageUrl || "") : ""}
          onChange={(e) => updateNodeData(id, { imageUrl: e.target.value, mode: "url" })}
          className="flex-1 bg-transparent text-[10px] text-white/80 placeholder:text-white/20 outline-none min-w-0
            border-b border-white/[0.06] focus:border-blue-400/40 transition-colors py-0.5"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </div>
    </BaseNode>
  );
}
