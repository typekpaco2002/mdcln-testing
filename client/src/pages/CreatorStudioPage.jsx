import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Sparkles, Wand2, X, ChevronDown, ChevronUp,
  Loader2, Download, RefreshCw, Clock, CheckCircle2, AlertCircle,
  Maximize2, Zap, Settings2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { creatorStudioAPI, modelAPI } from "../services/api";
import { useAuthStore } from "../store";
import { useActiveGeneration } from "../hooks/useActiveGeneration";
import LivePreviewPanel from "../components/LivePreviewPanel";
import FileUpload from "../components/FileUpload";

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1", desc: "Square" },
  { value: "9:16", label: "9:16", desc: "Portrait" },
  { value: "16:9", label: "16:9", desc: "Landscape" },
  { value: "3:4", label: "3:4", desc: "Portrait" },
  { value: "4:3", label: "4:3", desc: "Landscape" },
  { value: "2:3", label: "2:3", desc: "Tall" },
  { value: "3:2", label: "3:2", desc: "Wide" },
];

const RESOLUTIONS = [
  { value: "1K", label: "1K", desc: "1024px" },
  { value: "2K", label: "2K", desc: "2048px" },
  { value: "4K", label: "4K", desc: "4096px" },
];

const NB_MODELS = [
  { value: "nano-banana-pro", label: "Pro", desc: "Ultra Realism" },
  { value: "nano-banana-2", label: "v2", desc: "Faster" },
];

export default function CreatorStudioPage() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const queryClient = useQueryClient();

  // ── form state ────────────────────────────────────────────────────────────
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [resolution, setResolution] = useState("2K");
  const [nanoBananaModel, setNanoBananaModel] = useState("nano-banana-pro");
  const [referencePhotos, setReferencePhotos] = useState([]); // { url, file }[]
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // ── generation state ──────────────────────────────────────────────────────
  const { activeGeneration, isGenerating, startGeneration, pollForCompletion, reset } =
    useActiveGeneration();

  // ── history ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── models ────────────────────────────────────────────────────────────────
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ["user-models"],
    queryFn: () => modelAPI.getAll(),
    staleTime: 30_000,
  });
  const models = modelsData?.models ?? [];
  const selectedModel = models.find((m) => m.id === selectedModelId) ?? null;

  // Auto-select first model
  useEffect(() => {
    if (!selectedModelId && models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, selectedModelId]);

  // ── fetch history ─────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await creatorStudioAPI.getHistory({ limit: 12 });
      setHistory(data.generations ?? []);
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── AI enhance prompt ─────────────────────────────────────────────────────
  const handleEnhance = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }
    setIsEnhancing(true);
    try {
      const data = await creatorStudioAPI.enhancePrompt({
        modelId: selectedModelId,
        prompt: prompt.trim(),
      });
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        setUseCustomPrompt(true);
        toast.success("Prompt enhanced!");
      }
    } catch {
      toast.error("Failed to enhance prompt");
    } finally {
      setIsEnhancing(false);
    }
  };

  // ── reference photo upload ────────────────────────────────────────────────
  const handleReferenceUploaded = ({ url }) => {
    if (referencePhotos.length >= 8) {
      toast.error("Maximum 8 reference photos");
      return;
    }
    setReferencePhotos((prev) => [...prev, { url }]);
  };

  const removeReference = (idx) => {
    setReferencePhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedModelId) {
      toast.error("Select a model first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }

    startGeneration({ status: "processing", type: "creator-studio" });

    try {
      const data = await creatorStudioAPI.generate({
        modelId: selectedModelId,
        prompt: prompt.trim(),
        referencePhotos: referencePhotos.map((r) => r.url),
        aspectRatio,
        resolution,
        nanoBananaModel,
        useCustomPrompt,
      });

      if (!data.success) {
        throw new Error(data.message || "Generation failed");
      }

      startGeneration({ ...data.generation });
      pollForCompletion(data.generation.id, {
        onSuccess: (gen) => {
          toast.success("Image generated!");
          refreshUser?.();
          fetchHistory();
          queryClient.invalidateQueries({ queryKey: ["generations"] });
        },
        onFailure: (gen) => {
          toast.error(gen.errorMessage || "Generation failed — credits refunded");
        },
      });
    } catch (err) {
      reset();
      toast.error(err.response?.data?.message || err.message || "Generation failed");
    }
  };

  const creditsLeft = user?.credits ?? 0;
  // Mirror backend pricing defaults; actual cost is determined server-side
  const COST = resolution === "4K" ? 25 : 20;

  return (
    <div className="flex h-full min-h-screen bg-[#0a0a0f]">
      {/* ── Left Panel: Controls ─────────────────────────────────────────────── */}
      <div className="w-full max-w-[420px] flex-shrink-0 flex flex-col border-r border-white/[0.06] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Creator Studio</h1>
              <p className="text-xs text-slate-400">NanoBanana Pro · Ultra Realism</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Model Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
              AI Model
            </label>
            <button
              onClick={() => setModelSelectorOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
            >
              {selectedModel ? (
                <>
                  {selectedModel.photo1Url && (
                    <img src={selectedModel.photo1Url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedModel.name || "Unnamed"}</p>
                    <p className="text-xs text-slate-500">Selected model</p>
                  </div>
                </>
              ) : (
                <span className="text-sm text-slate-400 flex-1 text-left">
                  {modelsLoading ? "Loading models…" : "Select a model"}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${modelSelectorOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {modelSelectorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#0d0d16] overflow-hidden max-h-[280px] overflow-y-auto">
                    {models.length === 0 ? (
                      <p className="text-sm text-slate-500 p-4 text-center">No models yet</p>
                    ) : (
                      models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedModelId(m.id); setModelSelectorOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left border-b border-white/[0.04] last:border-0 ${
                            selectedModelId === m.id ? "bg-purple-500/10" : ""
                          }`}
                        >
                          {m.photo1Url && (
                            <img src={m.photo1Url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{m.name || "Unnamed"}</p>
                            <p className="text-xs text-slate-500">
                              {[m.photo1Url, m.photo2Url, m.photo3Url].filter(Boolean).length} photo{[m.photo1Url, m.photo2Url, m.photo3Url].filter(Boolean).length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {selectedModelId === m.id && (
                            <CheckCircle2 className="w-4 h-4 text-purple-400 ml-auto flex-shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Prompt
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUseCustomPrompt((v) => !v)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${
                    useCustomPrompt
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-white/[0.05] text-slate-400 border border-white/[0.08]"
                  }`}
                >
                  {useCustomPrompt ? "Custom" : "AI Enhanced"}
                </button>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene, pose, outfit, environment…"
                rows={4}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.05] transition-all"
              />
            </div>
            <button
              onClick={handleEnhance}
              disabled={isEnhancing || !prompt.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(79,70,229,0.2) 100%)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#c4b5fd",
              }}
            >
              {isEnhancing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Enhance with AI · 10 cr
            </button>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`flex-1 min-w-[60px] px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    aspectRatio === ar.value
                      ? "bg-purple-600 text-white"
                      : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                  }`}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            <span>Advanced Settings</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-5"
              >
                {/* Resolution */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
                    Resolution
                  </label>
                  <div className="flex gap-2">
                    {RESOLUTIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setResolution(r.value)}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                          resolution === r.value
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                        }`}
                      >
                        <div>{r.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* NanoBanana Model */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 block">
                    Engine
                  </label>
                  <div className="flex gap-2">
                    {NB_MODELS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setNanoBananaModel(m.value)}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                          nanoBananaModel === m.value
                            ? "bg-purple-600 text-white"
                            : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                        }`}
                      >
                        <div>{m.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom reference photos */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      Custom References
                    </label>
                    <span className="text-[10px] text-slate-500">{referencePhotos.length}/8 · overrides model photos</span>
                  </div>

                  {referencePhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {referencePhotos.map((ref, i) => (
                        <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-white/[0.08]">
                          <img src={ref.url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeReference(i)}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {referencePhotos.length < 8 && (
                    <FileUpload
                      type="image"
                      onUpload={handleReferenceUploaded}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedModelId || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: isGenerating
                ? "rgba(124,58,237,0.3)"
                : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: isGenerating ? "none" : "0 0 24px rgba(124,58,237,0.4)",
              color: "white",
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate · {COST} cr
              </>
            )}
          </button>

          {/* Credits indicator */}
          <p className="text-center text-xs text-slate-500">
            {creditsLeft} credits available
          </p>
        </div>
      </div>

      {/* ── Right Panel: Preview + History ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Live Preview */}
        <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
          {/* Active generation */}
          {(isGenerating || activeGeneration) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Live Preview</p>
              <LivePreviewPanel
                type="image"
                latestGeneration={activeGeneration}
                onDownload={() => {}}
              />
            </div>
          )}

          {/* Empty state */}
          {!isGenerating && !activeGeneration && (
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Wand2 className="w-7 h-7 text-purple-400" />
                </div>
                <p className="text-white font-medium">Ready to create</p>
                <p className="text-sm text-slate-500 mt-1">Configure your prompt and hit Generate</p>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Creations
                </p>
                <button
                  onClick={fetchHistory}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {history.map((gen) => (
                  <HistoryCard key={gen.id} gen={gen} />
                ))}
              </div>
            </div>
          )}

          {historyLoading && history.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ gen }) {
  const [expanded, setExpanded] = useState(false);
  const isProcessing = gen.status === "processing";
  const isFailed = gen.status === "failed";
  const isCompleted = gen.status === "completed";

  return (
    <>
      <div
        className="relative group rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] cursor-pointer aspect-square"
        onClick={() => isCompleted && setExpanded(true)}
      >
        {isCompleted && gen.outputUrl ? (
          <img src={gen.outputUrl} alt="" className="w-full h-full object-cover" />
        ) : isProcessing ? (
          <div className="w-full h-full flex items-center justify-center bg-purple-500/5">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400/60" />
          </div>
        )}

        {isCompleted && gen.outputUrl && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-[9px] text-slate-300 truncate">{gen.prompt || "No prompt"}</p>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gen.outputUrl}
                alt=""
                className="max-w-full max-h-[90vh] rounded-xl object-contain"
              />
              <button
                onClick={() => setExpanded(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <a
                href={`/api/download?url=${encodeURIComponent(gen.outputUrl)}&filename=creator-studio-${gen.id}.jpg`}
                download
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-3.5 h-3.5" />
                Save
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
