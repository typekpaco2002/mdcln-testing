import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Loader2, RefreshCw, Copy, Check } from "lucide-react";
import api from "../services/api";
import { toast } from "react-hot-toast";

const DEFAULT_PROMPT = `{trigger}, frontal face portrait photo, looking directly at camera, natural skin texture with slight grain, not plastic or airbrushed, neutral expression, soft natural lighting, clean background, high resolution face detail, professional portrait photography`;

export default function FaceRefTestPage() {
  const navigate = useNavigate();
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [loraStrength, setLoraStrength] = useState(0.7);
  const [nsfwStrength, setNsfwStrength] = useState(0.3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await api.get("/models");
      const nsfwModels = res.data.filter(m => m.nsfwUnlocked && m.loraUrl);
      setModels(nsfwModels);
      if (nsfwModels.length > 0) {
        setSelectedModel(nsfwModels[0]);
      }
    } catch (err) {
      toast.error("Failed to load models");
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      toast.error("Select a model first");
      return;
    }

    setIsGenerating(true);
    try {
      const finalPrompt = prompt.replace("{trigger}", selectedModel.loraTriggerWord);
      
      const res = await api.post("/nsfw/test-face-ref", {
        modelId: selectedModel.id,
        prompt: finalPrompt,
        loraStrength,
        nsfwStrength,
      });

      if (res.data.success) {
        toast.success("Generation started! Polling...");
        pollForResult(res.data.requestId);
      } else {
        toast.error(res.data.message || "Failed to start generation");
        setIsGenerating(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  const pollForResult = async (requestId) => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await api.get(`/nsfw/test-face-ref-status/${requestId}`);
        
        if (res.data.status === "COMPLETED") {
          setResults(prev => [{
            id: Date.now(),
            url: res.data.outputUrl,
            prompt: prompt.replace("{trigger}", selectedModel.loraTriggerWord),
            loraStrength,
            nsfwStrength,
            model: selectedModel.name,
          }, ...prev]);
          toast.success("Done!");
          setIsGenerating(false);
          return;
        }
        
        if (res.data.status === "FAILED") {
          toast.error("Generation failed");
          setIsGenerating(false);
          return;
        }
        
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        console.error("Poll error:", err);
      }
    }
    toast.error("Timeout");
    setIsGenerating(false);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <h1 className="text-2xl font-bold mb-2">Face Reference Prompt Tester</h1>
        <p className="text-slate-400 mb-6">Test and optimize the prompt for generating face reference photos</p>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <label className="text-sm text-slate-300 mb-2 block">Select Model</label>
              <select
                value={selectedModel?.id || ""}
                onChange={(e) => setSelectedModel(models.find(m => m.id === e.target.value))}
                className="w-full p-3 rounded-lg bg-slate-800 border border-white/10 text-white"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.loraTriggerWord})
                  </option>
                ))}
              </select>
              {selectedModel && (
                <p className="text-xs text-cyan-400 mt-2">
                  LoRA: {selectedModel.loraUrl?.substring(0, 60)}...
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-300">Prompt</label>
                <button
                  onClick={copyPrompt}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-2">Use {"{trigger}"} for the trigger word</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full p-3 rounded-lg bg-slate-800 border border-white/10 text-white text-sm font-mono"
              />
              <button
                onClick={() => setPrompt(DEFAULT_PROMPT)}
                className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to default
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="text-sm text-slate-300 mb-2 block">
                  LoRA Strength: {loraStrength}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={loraStrength}
                  onChange={(e) => setLoraStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="text-sm text-slate-300 mb-2 block">
                  NSFW Strength: {nsfwStrength}
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={nsfwStrength}
                  onChange={(e) => setNsfwStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedModel}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: isGenerating
                  ? "rgba(255,255,255,0.1)"
                  : "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Test Generate
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h3 className="text-lg font-semibold mb-4">Results</h3>
            {results.length === 0 ? (
              <p className="text-slate-500 text-center py-12">
                No results yet. Generate some test images!
              </p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {results.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                    <img
                      src={r.url}
                      alt="Result"
                      className="w-full rounded-lg mb-2"
                    />
                    <p className="text-xs text-slate-400 mb-1">
                      <span className="text-cyan-400">Model:</span> {r.model}
                    </p>
                    <p className="text-xs text-slate-400 mb-1">
                      <span className="text-cyan-400">LoRA:</span> {r.loraStrength} | 
                      <span className="text-cyan-400 ml-1">NSFW:</span> {r.nsfwStrength}
                    </p>
                    <p className="text-xs text-slate-500 font-mono break-all">
                      {r.prompt.substring(0, 100)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
