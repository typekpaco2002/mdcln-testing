import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Move,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../services/api";

const ASPECT_OPTIONS = [
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
];

export default function DesignerStudioPage() {
  const [activeTool, setActiveTool] = useState("nano");

  // Nano Banana Pro
  const [nbPrompt, setNbPrompt] = useState("");
  const [nbImageUrls, setNbImageUrls] = useState("");
  const [nbAspect, setNbAspect] = useState("1:1");
  const [nbLoading, setNbLoading] = useState(false);
  const [nbResult, setNbResult] = useState(null);

  // Kling I2V
  const [i2vImageUrl, setI2vImageUrl] = useState("");
  const [i2vPrompt, setI2vPrompt] = useState("");
  const [i2vDuration, setI2vDuration] = useState(5);
  const [i2vUseKling3, setI2vUseKling3] = useState(true);
  const [i2vLoading, setI2vLoading] = useState(false);
  const [i2vResult, setI2vResult] = useState(null);

  // Kling Motion
  const [motImageUrl, setMotImageUrl] = useState("");
  const [motVideoUrl, setMotVideoUrl] = useState("");
  const [motPrompt, setMotPrompt] = useState("");
  const [motUltra, setMotUltra] = useState(true);
  const [motLoading, setMotLoading] = useState(false);
  const [motTaskId, setMotTaskId] = useState(null);
  const [motResult, setMotResult] = useState(null);
  const [motPolling, setMotPolling] = useState(false);

  const runNanoBanana = async (e) => {
    e.preventDefault();
    if (!nbPrompt.trim()) {
      toast.error("Enter a prompt");
      return;
    }
    setNbLoading(true);
    setNbResult(null);
    try {
      const imageUrls = nbImageUrls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http"));
      const res = await api.post("/designer-studio/nano-banana-pro", {
        prompt: nbPrompt.trim(),
        imageUrls: imageUrls.length >= 2 ? imageUrls : undefined,
        aspectRatio: nbAspect,
        resolution: "2K",
      });
      if (res.data.deferred && res.data.taskId) {
        toast("Task queued — polling for result…");
        pollTask(res.data.taskId, setNbResult, setNbLoading);
        return;
      }
      setNbResult(res.data.outputUrl);
      toast.success("Image ready");
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed";
      toast.error(msg);
      setNbLoading(false);
    }
  };

  const runKlingI2v = async (e) => {
    e.preventDefault();
    if (!i2vImageUrl.trim() || !i2vPrompt.trim()) {
      toast.error("Image URL and prompt required");
      return;
    }
    setI2vLoading(true);
    setI2vResult(null);
    try {
      const res = await api.post("/designer-studio/kling-i2v", {
        imageUrl: i2vImageUrl.trim(),
        prompt: i2vPrompt.trim(),
        duration: i2vDuration,
        useKling3: i2vUseKling3,
      });
      if (res.data.deferred && res.data.taskId) {
        toast("Video queued — polling…");
        pollTask(res.data.taskId, setI2vResult, setI2vLoading);
        return;
      }
      setI2vResult(res.data.outputUrl);
      toast.success("Video ready");
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed";
      toast.error(msg);
      setI2vLoading(false);
    }
  };

  const runKlingMotion = async (e) => {
    e.preventDefault();
    if (!motImageUrl.trim() || !motVideoUrl.trim()) {
      toast.error("Image URL and reference video URL required");
      return;
    }
    setMotLoading(true);
    setMotTaskId(null);
    setMotResult(null);
    try {
      const res = await api.post("/designer-studio/kling-motion", {
        imageUrl: motImageUrl.trim(),
        videoUrl: motVideoUrl.trim(),
        prompt: motPrompt.trim() || undefined,
        ultra: motUltra,
      });
      setMotTaskId(res.data.taskId);
      setMotLoading(false);
      toast("Motion task submitted — polling…");
      setMotPolling(true);
      pollTask(res.data.taskId, setMotResult, setMotLoading, () => setMotPolling(false));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed";
      toast.error(msg);
      setMotLoading(false);
    }
  };

  function pollTask(taskId, setOutputUrl, setLoading, onDone) {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/designer-studio/task/${taskId}`);
        const { state, outputUrl, failMsg } = res.data;
        if (state === "success" && outputUrl) {
          clearInterval(interval);
          setOutputUrl(outputUrl);
          if (setLoading) setLoading(false);
          onDone?.();
          toast.success("Done");
          return;
        }
        if (state === "fail") {
          clearInterval(interval);
          if (setLoading) setLoading(false);
          onDone?.();
          toast.error(failMsg || "Task failed");
        }
      } catch {
        // keep polling
      }
    }, 5000);
    // stop after 15 min
    setTimeout(() => {
      clearInterval(interval);
      if (setLoading) setLoading(false);
      onDone?.();
    }, 15 * 60 * 1000);
  }

  const tools = [
    {
      id: "nano",
      label: "Image Generation",
      desc: "Text-to-image or identity-preserving image from prompt + optional reference images.",
      icon: ImageIcon,
    },
    {
      id: "i2v",
      label: "Image to Video",
      desc: "Animate a single image with a motion prompt. 2.6 or 3.0.",
      icon: Video,
    },
    {
      id: "motion",
      label: "Motion Control",
      desc: "Apply motion from a reference video to your image. 2.6 or 3.0.",
      icon: Move,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Admin
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg font-semibold tracking-tight">Designer Studio</h1>
            </div>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">
            Direct access — image generation, image-to-video &amp; motion tools (admin only)
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Tool tabs — Higgsfield-style step context */}
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3">Choose tool</p>
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  activeTool === t.id
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image generation */}
        {activeTool === "nano" && (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              Image Generation
            </h2>
            <p className="mb-6 text-xs text-slate-500">{tools[0].desc}</p>
            <form onSubmit={runNanoBanana} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Prompt your vision
                </label>
                <textarea
                  value={nbPrompt}
                  onChange={(e) => setNbPrompt(e.target.value)}
                  placeholder="Describe the image…"
                  rows={3}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Bring your assets (optional) — 2+ image URLs for identity
                </label>
                <textarea
                  value={nbImageUrls}
                  onChange={(e) => setNbImageUrls(e.target.value)}
                  placeholder="One URL per line or comma-separated"
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Aspect ratio
                </label>
                <select
                  value={nbAspect}
                  onChange={(e) => setNbAspect(e.target.value)}
                  className="rounded-xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white focus:border-amber-500/50 focus:outline-none"
                >
                  {ASPECT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={nbLoading}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
              >
                {nbLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Generate image
                  </>
                )}
              </button>
            </form>
            {nbResult && (
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/40 p-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Result</p>
                <img src={nbResult} alt="Generated" className="max-h-80 rounded-lg object-contain" />
                <a
                  href={nbResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
                >
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </section>
        )}

        {/* Image to video */}
        {activeTool === "i2v" && (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
              <Video className="w-4 h-4 text-violet-400" />
              Image to Video
            </h2>
            <p className="mb-6 text-xs text-slate-500">{tools[1].desc}</p>
            <form onSubmit={runKlingI2v} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Image URL
                </label>
                <input
                  type="url"
                  value={i2vImageUrl}
                  onChange={(e) => setI2vImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Motion prompt
                </label>
                <textarea
                  value={i2vPrompt}
                  onChange={(e) => setI2vPrompt(e.target.value)}
                  placeholder="Describe the motion…"
                  rows={2}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                    Duration (s)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={10}
                    value={i2vDuration}
                    onChange={(e) => setI2vDuration(Number(e.target.value))}
                    className="w-24 rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-sm text-white focus:border-violet-500/50 focus:outline-none"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={i2vUseKling3}
                    onChange={(e) => setI2vUseKling3(e.target.checked)}
                    className="rounded border-white/20 bg-black/40 text-violet-500 focus:ring-violet-500/50"
                  />
                  <span className="text-sm text-slate-300">Use 3.0 model</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={i2vLoading}
                className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
              >
                {i2vLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating video…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Generate video
                  </>
                )}
              </button>
            </form>
            {i2vResult && (
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/40 p-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Result</p>
                <video src={i2vResult} controls className="max-h-80 w-full rounded-lg" />
                <a
                  href={i2vResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
                >
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </section>
        )}

        {/* Motion control */}
        {activeTool === "motion" && (
          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xl">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
              <Move className="w-4 h-4 text-cyan-400" />
              Motion Control
            </h2>
            <p className="mb-6 text-xs text-slate-500">{tools[2].desc}</p>
            <form onSubmit={runKlingMotion} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Image URL (subject)
                </label>
                <input
                  type="url"
                  value={motImageUrl}
                  onChange={(e) => setMotImageUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Reference video URL (motion source)
                </label>
                <input
                  type="url"
                  value={motVideoUrl}
                  onChange={(e) => setMotVideoUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-slate-500">
                  Prompt (optional)
                </label>
                <input
                  type="text"
                  value={motPrompt}
                  onChange={(e) => setMotPrompt(e.target.value)}
                  placeholder="e.g. No distortion, natural motion"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={motUltra}
                  onChange={(e) => setMotUltra(e.target.checked)}
                  className="rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-500/50"
                />
                <span className="text-sm text-slate-300">Use 3.0 motion model</span>
              </label>
              <button
                type="submit"
                disabled={motLoading}
                className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
              >
                {motLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Generate motion video
                  </>
                )}
              </button>
            </form>
            {motTaskId && !motResult && (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200">
                {motPolling ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>Task {motTaskId} — {motPolling ? "polling for result…" : "waiting…"}</span>
              </div>
            )}
            {motResult && (
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/40 p-4">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Result</p>
                <video src={motResult} controls className="max-h-80 w-full rounded-lg" />
                <a
                  href={motResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
