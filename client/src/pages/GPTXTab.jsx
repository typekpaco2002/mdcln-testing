/**
 * GPT-X Tab — AI generation assistant with chat interface.
 * User picks their model, types a natural language request, Grok enhances
 * the prompt, and the result appears as an inline image in the chat.
 * From there: make a video, or use the image as a reference for the next generation.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Sparkles, Trash2, Plus,
  ChevronDown, X, Copy, Download, Check, Loader2, AlertCircle,
  Wand2, Camera, Film, ChevronLeft, Menu, Search,
  Pin, RotateCcw, Square, Pencil,
} from "@/components/icons";
import api from "../services/api";
import { useReducedMotion } from "../hooks/useReducedMotion";
import toast from "react-hot-toast";

// ─── helpers ─────────────────────────────────────────────────────────────────

function parseOutputUrl(raw) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p[0] : raw;
  } catch {
    return raw;
  }
}

function relativeTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

// Bucket a conversation's updatedAt into a sidebar group.
function getDayBucket(iso) {
  const d = new Date(iso).getTime();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (d >= startOfDay) return "Today";
  if (d >= startOfDay - dayMs) return "Yesterday";
  if (d >= startOfDay - 7 * dayMs) return "Previous 7 days";
  if (d >= startOfDay - 30 * dayMs) return "Previous 30 days";
  return "Earlier";
}

const BUCKET_ORDER = ["Pinned", "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Earlier"];

const PIN_KEY = "gptx.pinnedConvs";
const DRAFT_KEY = "gptx.drafts";
const LAST_MODEL_KEY = "gptx.lastModelByConv";

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function safeSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// Empty-state quickstart prompts — categorized so users can grab one in <1s.
const PROMPT_CATEGORIES = [
  {
    label: "Portrait",
    examples: [
      "Close-up portrait, studio lighting, dark background",
      "Mirror selfie at night, soft warm light",
    ],
  },
  {
    label: "Lifestyle",
    examples: [
      "Sitting on a café terrace in Paris, golden hour",
      "Curled up on the couch with a book, cozy lighting",
    ],
  },
  {
    label: "Outdoor",
    examples: [
      "On the beach at sunset, casual outfit",
      "Mountain trail at sunrise, fresh morning light",
    ],
  },
  {
    label: "Editorial",
    examples: [
      "High-fashion editorial, neutral tones, sharp shadows",
      "Minimal black-and-white street style shot",
    ],
  },
];

// ─── sub-components ──────────────────────────────────────────────────────────

function ConvItem({ conv, active, pinned, onClick, onDelete, onPin }) {
  return (
    <div
      className={`group relative w-full rounded-xl transition-all ${
        active
          ? "bg-white/[0.08]"
          : "hover:bg-white/[0.04]"
      }`}
    >
      <button
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-label={`Open chat: ${conv.title}`}
        className="w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-1.5 min-w-0"
      >
        {pinned && (
          <Pin className="w-2.5 h-2.5 mt-1 text-slate-500 shrink-0 fill-slate-500" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-[12.5px] font-medium truncate leading-tight ${active ? "text-white" : "text-slate-300 group-hover:text-slate-100"}`}>
            {conv.title}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">{relativeTime(conv.updatedAt)}</p>
        </div>
      </button>
      {/* Hover/touch action rail */}
      <div className="absolute right-1 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onPin(conv.id); }}
          className="tap-target-min p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
          title={pinned ? "Unpin" : "Pin to top"}
          aria-label={pinned ? "Unpin conversation" : "Pin conversation to top"}
        >
          <Pin className={`w-3 h-3 ${pinned ? "fill-current" : ""}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
          className="tap-target-min p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-rose-400 transition-colors"
          title="Delete chat"
          aria-label="Delete conversation"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function GenerationImage({ url, onMakeVideo, onUseAsRef, canVideo, videoLoading, isCopied, onCopy, onDownload }) {
  return (
    <div className="mt-2 space-y-2">
      <div className="relative group rounded-xl overflow-hidden inline-block max-w-[320px] w-full">
        <img src={url} alt="Generated" className="w-full rounded-xl object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl pointer-events-none" />
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={onCopy}
            className="tap-target-min p-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90 transition-colors"
            title="Copy URL"
            aria-label={isCopied ? "URL copied" : "Copy image URL"}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDownload}
            className="tap-target-min p-1.5 rounded-lg bg-black/70 text-white hover:bg-black/90 transition-colors"
            title="Download image"
            aria-label="Download image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {canVideo && (
          <button
            onClick={onMakeVideo}
            disabled={videoLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={videoLoading ? "Video being created" : "Make a video from this image"}
          >
            {videoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Film className="w-3 h-3" />}
            {videoLoading ? "Creating video…" : "Make video"}
          </button>
        )}
        <button
          onClick={onUseAsRef}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] transition-colors"
          aria-label="Use as reference for next generation"
        >
          <Camera className="w-3 h-3" />
          Use as reference
        </button>
      </div>
    </div>
  );
}

function UserMessage({ msg, isLatest, onEditRetry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => { toast.error("Could not copy to clipboard"); });
  };

  return (
    <div className="group flex justify-end items-start gap-2">
      <div className="flex flex-col items-end gap-1">
        <div
          className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-[13px] text-white whitespace-pre-wrap break-words"
          style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          {msg.content}
        </div>
        {/* Action row — always visible on touch (sm:opacity-0), hover-revealed on desktop. */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="tap-target-min p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            title={copied ? "Copied" : "Copy"}
            aria-label={copied ? "Copied" : "Copy message"}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          {isLatest && (
            <button
              onClick={() => onEditRetry(msg)}
              className="tap-target-min p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Edit & resubmit"
              aria-label="Edit and resubmit message"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ msg, onMakeVideo, onUseAsRef, models, onRegenerate, onCancelPending, regeneratingId }) {
  const [isCopied, setIsCopied] = useState(false);
  const gen = msg._gen;
  const videoGen = msg._videoGen;
  const model = models?.find(m => m.id === msg._modelId);
  const canVideo = model?.nsfwUnlocked;
  const isPending = !gen || (gen.status !== "completed" && gen.status !== "failed");
  const isRegenerating = regeneratingId === msg.id;

  const handleCopy = () => {
    const url = parseOutputUrl(gen?.outputUrl);
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => { toast.error("Could not copy to clipboard"); });
  };

  const handleDownload = async () => {
    const url = parseOutputUrl(gen?.outputUrl);
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `gptx-${msg.id.slice(0, 8)}.jpg`;
      a.click();
    } catch {
      window.open(url, "_blank");
    }
  };

  // Header / avatar shared across states
  const Avatar = (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
      style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      aria-hidden="true"
    >
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  );

  // Loading / processing state
  if (isPending) {
    const isFresh = !gen;
    const stage = isFresh ? "Enhancing prompt" : "Generating image";
    return (
      <div className="group flex items-start gap-2.5 max-w-[85%]" aria-live="polite" aria-busy="true">
        {Avatar}
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" aria-hidden="true" />
          <span className="text-[12.5px] text-slate-300">{stage}…</span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">~30s</span>
          <button
            onClick={() => onCancelPending(msg.id)}
            className="tap-target-min ml-1 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Stop waiting and dismiss"
            aria-label="Stop waiting for this generation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Failed
  if (gen.status === "failed") {
    return (
      <div className="group flex items-start gap-2.5 max-w-[85%]">
        {Avatar}
        <div className="flex flex-col gap-1.5">
          <div
            className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span className="text-[12.5px] text-rose-300">{gen.errorMessage || "Generation failed."}</span>
          </div>
          <button
            onClick={() => onRegenerate(msg)}
            disabled={isRegenerating}
            className="tap-target-min self-start gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            aria-label="Try this prompt again"
          >
            {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Try again
          </button>
        </div>
      </div>
    );
  }

  const imageUrl = parseOutputUrl(gen.outputUrl);

  return (
    <div className="group flex items-start gap-2.5" aria-live="polite">
      {Avatar}
      <div className="space-y-1 max-w-[380px] flex-1 min-w-0">
        {msg.content && (
          <p className="text-[12.5px] text-slate-300 mb-1">{msg.content}</p>
        )}
        {imageUrl && (
          <GenerationImage
            url={imageUrl}
            canVideo={canVideo}
            videoLoading={msg._videoLoading}
            isCopied={isCopied}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onMakeVideo={() => onMakeVideo(msg, imageUrl)}
            onUseAsRef={() => onUseAsRef(imageUrl)}
          />
        )}
        {/* Video section */}
        {msg.videoGenId && (
          <div className="mt-2">
            {!videoGen || videoGen.status !== "completed" ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] text-slate-400"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                aria-live="polite"
                aria-busy="true"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-fuchsia-400" aria-hidden="true" />
                Creating video… this takes ~60s
              </div>
            ) : (
              <video
                src={parseOutputUrl(videoGen.outputUrl)}
                controls
                playsInline
                className="w-full max-w-[320px] rounded-xl border border-white/10"
              />
            )}
          </div>
        )}
        {/* Per-message hover actions */}
        <div className="flex items-center gap-1 pt-1 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onRegenerate(msg)}
            disabled={isRegenerating}
            className="tap-target-min p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            title="Regenerate this response"
            aria-label="Regenerate this response"
          >
            {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          </button>
          {imageUrl && (
            <button
              onClick={handleCopy}
              className="tap-target-min p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              title={isCopied ? "Copied" : "Copy image URL"}
              aria-label={isCopied ? "URL copied" : "Copy image URL"}
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function GPTXTab() {
  const prefersReducedMotion = useReducedMotion();

  // Conversations & active state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]); // messages for active conv
  const [showSidebar, setShowSidebar] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState(() => new Set(safeLoad(PIN_KEY, [])));
  // Cached first user-message preview per conv id, populated when we load a
  // conversation (or send the first message in a new one). Used by sidebar
  // search so users can match on chat content, not just titles. State (not
  // ref) so the filter memo recomputes when a new preview arrives.
  const [previewMap, setPreviewMap] = useState({});

  // Input state
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isNsfw, setIsNsfw] = useState(false);
  const [engine, setEngine] = useState("seedream"); // SFW only
  const [videoDuration, setVideoDuration] = useState(5);
  const [referenceImageUrl, setReferenceImageUrl] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);

  // Pending generation polling: { [aiMessageId]: { generationId, videoGenId } }
  const pendingRef = useRef({});
  const pollTimerRef = useRef(null);
  // Tracks whether to auto-scroll on new messages (stick to bottom only if the
  // user is already near the bottom — don't fight a user scrolling up).
  const stickToBottomRef = useRef(true);
  // Monotonic send-attempt sequence. Each doSend captures its sequence at
  // start; if the ref advances (because Stop was pressed or a newer send
  // started), the in-flight invocation bails out. This is more robust than a
  // shared boolean flag, which could get reset by a rapid Stop→Send sequence.
  const sendSeqRef = useRef(0);
  // AbortController for the in-flight /gptx/send + generation requests so Stop
  // actually cancels network work instead of just hiding the UI.
  const sendAbortRef = useRef(null);
  // Mirror of activeConvId, kept fresh via effect, so async loadConversation
  // closures (and the model-persist wrapper) always see the current value,
  // not whichever convId the closure captured at the time it was created.
  const activeConvIdRef = useRef(null);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);
  // Per-message busy sets — ref-based (not state) so sub-frame double-clicks
  // are blocked without waiting for a setState flush. Used for Make-Video and
  // Regenerate, which would otherwise double-charge the user.
  const videoBusyRef = useRef(new Set());
  const regenBusyRef = useRef(new Set());

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch user models
  const { data: modelsData } = useQuery({
    queryKey: ["gptx-models"],
    queryFn: () => api.get("/models").then(r => r.data.models || []),
    staleTime: 30000,
  });
  const models = modelsData || [];
  const hasModels = models.length > 0;
  const selectedModel = models.find(m => m.id === selectedModelId);

  // Restore the saved model for the active conversation on every conv switch
  // (or default to the first model on first load). Guarded by a ref so this
  // doesn't re-fire on every selectedModelId change — that's what caused the
  // round-1 regression where switching conv A→B clobbered B's saved model.
  const lastRestoredConvIdRef = useRef(undefined);
  useEffect(() => {
    if (!hasModels) return;
    if (lastRestoredConvIdRef.current === activeConvId) return;
    lastRestoredConvIdRef.current = activeConvId;
    const lastByConv = safeLoad(LAST_MODEL_KEY, {});
    const remembered = activeConvId ? lastByConv[activeConvId] : null;
    const target = remembered && models.find(m => m.id === remembered) ? remembered : models[0].id;
    setSelectedModelId(target);
  }, [hasModels, activeConvId, models]);

  // setSelectedModelId + persist in one shot. Persistence happens only on
  // explicit user changes (the model <select>), never on restore — mirrors the
  // setInputTextAndPersist pattern. Round-1 had a [selectedModelId, activeConvId]
  // effect here that wrote the previous conv's model into the new conv's slot
  // on every switch; this wrapper makes that race impossible. We read the
  // current convId from a ref so a stale closure can never write to the wrong
  // conv's slot.
  const setSelectedModelAndPersist = useCallback((id) => {
    setSelectedModelId(id);
    if (!id) return;
    const convId = activeConvIdRef.current;
    if (!convId) return;
    const lastByConv = safeLoad(LAST_MODEL_KEY, {});
    lastByConv[convId] = id;
    safeSave(LAST_MODEL_KEY, lastByConv);
  }, []);

  // Update NSFW based on selected model
  useEffect(() => {
    if (selectedModel) {
      setIsNsfw(Boolean(selectedModel.nsfwUnlocked));
    }
  }, [selectedModel]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
    // Empty deps — only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get("/gptx/conversations");
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  // Load messages + resume pending generation polling when active conv changes.
  // Also handles draft restore and clears stale reference-image / search state.
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      // Restore "new chat" draft if any.
      const drafts = safeLoad(DRAFT_KEY, {});
      setInputText(drafts.__new__ || "");
      setReferenceImageUrl(null);
      return;
    }
    loadConversation(activeConvId);
    // Restore per-conv draft on switch.
    const drafts = safeLoad(DRAFT_KEY, {});
    setInputText(drafts[activeConvId] || "");
    setReferenceImageUrl(null);
    // Ensure we stick to bottom for the freshly loaded conv.
    stickToBottomRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  // setInputText + persist draft in one shot. Doing this synchronously
  // (instead of from a [inputText, activeConvId] effect) avoids a subtle race
  // where the previous conversation's draft text gets written into the newly
  // active conversation's storage slot during a switch.
  const setInputTextAndPersist = useCallback((text) => {
    setInputText(text);
    const drafts = safeLoad(DRAFT_KEY, {});
    const key = activeConvId || "__new__";
    if (text) drafts[key] = text;
    else delete drafts[key];
    safeSave(DRAFT_KEY, drafts);
  }, [activeConvId]);

  const loadConversation = async (convId) => {
    // Capture the convId at entry. Every async write back to state/refs is
    // gated on activeConvIdRef.current still matching — without this guard,
    // a slow conv-A fetch landing after the user switches to conv B will
    // clobber B's messages and pollute pendingRef with A's generation ids.
    const myConvId = convId;
    try {
      const { data } = await api.get(`/gptx/conversations/${convId}`);
      if (activeConvIdRef.current !== myConvId) return;
      const conv = data.conversation;
      const msgs = conv.messages || [];
      setMessages(msgs);

      // Cache the first user-message preview for sidebar search content match.
      const firstUserMsg = msgs.find(m => m.role === "user");
      if (firstUserMsg?.content) {
        setPreviewMap(prev => prev[myConvId] === firstUserMsg.content ? prev : { ...prev, [myConvId]: firstUserMsg.content });
      }

      // Resume polling for any assistant messages that have a generationId
      // but no completed status yet — fixes the "stuck loading" bug that
      // occurs when a user switches conversations mid-generation and back.
      const newPending = {};
      await Promise.allSettled(msgs.map(async m => {
        if (m.role !== "assistant") return;
        const updates = {};
        let stillImage = false;
        let stillVideo = false;
        if (m.generationId) {
          try {
            const r = await api.get(`/generations/${m.generationId}`);
            updates._gen = r.data.generation;
            if (r.data.generation?.status !== "completed" && r.data.generation?.status !== "failed") {
              stillImage = true;
            }
          } catch { /* ignore */ }
        }
        if (m.videoGenId) {
          try {
            const r = await api.get(`/generations/${m.videoGenId}`);
            updates._videoGen = r.data.generation;
            if (r.data.generation?.status !== "completed" && r.data.generation?.status !== "failed") {
              stillVideo = true;
            }
          } catch { /* ignore */ }
        }
        if (activeConvIdRef.current !== myConvId) return;
        if (Object.keys(updates).length) {
          setMessages(prev => prev.map(p => p.id === m.id ? { ...p, ...updates } : p));
        }
        if (stillImage || stillVideo) {
          newPending[m.id] = {
            ...(stillImage ? { generationId: m.generationId } : {}),
            ...(stillVideo ? { videoGenId: m.videoGenId } : {}),
          };
        }
      }));
      if (activeConvIdRef.current !== myConvId) return;
      pendingRef.current = { ...pendingRef.current, ...newPending };
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  // ─── Scroll management ─────────────────────────────────────────────────────

  // Track whether the user is near the bottom; if so, auto-scroll on new
  // content. If they've scrolled up, leave them alone.
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 150;
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, prefersReducedMotion]);

  // ─── Polling ───────────────────────────────────────────────────────────────

  const pollGenerations = useCallback(async () => {
    const pending = pendingRef.current;
    const entries = Object.entries(pending);
    if (entries.length === 0) return;

    await Promise.allSettled(
      entries.map(async ([aiMsgId, { generationId, videoGenId }]) => {
        // Poll image gen
        if (generationId) {
          try {
            const { data } = await api.get(`/generations/${generationId}`);
            const gen = data.generation;
            if (gen && (gen.status === "completed" || gen.status === "failed")) {
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, _gen: gen } : m
              ));
              if (gen.status === "completed") {
                // clear image poll, keep video poll if present
                if (!videoGenId) {
                  const newPending = { ...pendingRef.current };
                  delete newPending[aiMsgId];
                  pendingRef.current = newPending;
                } else {
                  pendingRef.current = { ...pendingRef.current, [aiMsgId]: { videoGenId } };
                }
              } else {
                // Failed — stop polling this entry.
                const newPending = { ...pendingRef.current };
                delete newPending[aiMsgId];
                pendingRef.current = newPending;
              }
            }
          } catch { /* keep polling */ }
        }

        // Poll video gen
        if (videoGenId && !generationId) {
          try {
            const { data } = await api.get(`/generations/${videoGenId}`);
            const gen = data.generation;
            if (gen && (gen.status === "completed" || gen.status === "failed")) {
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, _videoGen: gen, _videoLoading: false } : m
              ));
              const newPending = { ...pendingRef.current };
              delete newPending[aiMsgId];
              pendingRef.current = newPending;
            }
          } catch { /* keep polling */ }
        }
      })
    );
  }, []);

  useEffect(() => {
    pollTimerRef.current = setInterval(pollGenerations, 4000);
    return () => clearInterval(pollTimerRef.current);
  }, [pollGenerations]);

  // ─── Conversation list grouping / search ───────────────────────────────────

  const filteredGroupedConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? conversations.filter(c => {
          const titleHit = (c.title || "").toLowerCase().includes(q);
          if (titleHit) return true;
          const preview = previewMap[c.id];
          return preview ? preview.toLowerCase().includes(q) : false;
        })
      : conversations;

    const groups = {};
    for (const c of filtered) {
      const bucket = pinnedIds.has(c.id) ? "Pinned" : getDayBucket(c.updatedAt);
      if (!groups[bucket]) groups[bucket] = [];
      groups[bucket].push(c);
    }
    return BUCKET_ORDER
      .filter(b => groups[b]?.length > 0)
      .map(b => ({ label: b, items: groups[b] }));
  }, [conversations, searchQuery, pinnedIds, previewMap]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleNewConversation = async () => {
    try {
      const { data } = await api.post("/gptx/conversations");
      setConversations(prev => [data.conversation, ...prev]);
      setActiveConvId(data.conversation.id);
      setMessages([]);
      // Focus the composer so user can start typing immediately.
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await api.delete(`/gptx/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.id !== convId));
      // Drop any pinned / draft / last-model state for this conv.
      if (pinnedIds.has(convId)) {
        const next = new Set(pinnedIds);
        next.delete(convId);
        setPinnedIds(next);
        safeSave(PIN_KEY, [...next]);
      }
      const drafts = safeLoad(DRAFT_KEY, {});
      if (drafts[convId]) {
        delete drafts[convId];
        safeSave(DRAFT_KEY, drafts);
      }
      const lastByConv = safeLoad(LAST_MODEL_KEY, {});
      if (lastByConv[convId]) {
        delete lastByConv[convId];
        safeSave(LAST_MODEL_KEY, lastByConv);
      }
      setPreviewMap(prev => {
        if (!(convId in prev)) return prev;
        const next = { ...prev };
        delete next[convId];
        return next;
      });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleTogglePin = (convId) => {
    const next = new Set(pinnedIds);
    if (next.has(convId)) next.delete(convId);
    else next.add(convId);
    setPinnedIds(next);
    safeSave(PIN_KEY, [...next]);
  };

  // Resize textarea to fit content, capped at ~5 lines.
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [inputText, autoResizeTextarea]);

  const handleSend = async () => {
    if (!inputText.trim() || sending || !selectedModelId) return;
    if (!activeConvId) {
      // Auto-create conversation then send
      try {
        const { data } = await api.post("/gptx/conversations");
        setConversations(prev => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        await doSend(data.conversation.id);
      } catch {
        toast.error("Failed to start conversation");
      }
      return;
    }
    await doSend(activeConvId);
  };

  const doSend = async (convId, overrideText = null) => {
    const msgText = (overrideText ?? inputText).trim();
    if (!msgText) return;
    const refUrl = referenceImageUrl;
    setInputTextAndPersist("");
    setReferenceImageUrl(null);
    setSending(true);
    // Claim a fresh send sequence so any prior in-flight doSend bails.
    const mySeq = ++sendSeqRef.current;
    // Abort any prior in-flight send and arm a fresh controller for this one
    // so Stop actually cancels the network request server-side instead of
    // just hiding the UI.
    try { sendAbortRef.current?.abort(); } catch { /* ignore */ }
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    sendAbortRef.current = controller;

    // Optimistic user message
    const tempUserId = `temp-u-${Date.now()}`;
    const tempAiId = `temp-a-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: tempUserId, role: "user", content: msgText, createdAt: new Date().toISOString() },
      { id: tempAiId, role: "assistant", content: "", createdAt: new Date().toISOString(), _loading: true, _modelId: selectedModelId },
    ]);
    stickToBottomRef.current = true;

    const isCancelled = () => sendSeqRef.current !== mySeq;

    try {
      // Step 1: Grok enhance + save messages
      const { data: sendData } = await api.post("/gptx/send", {
        message: msgText,
        conversationId: convId,
        modelId: selectedModelId,
        modelName: selectedModel?.name || "AI model",
        isNsfw,
        referenceImageUrl: refUrl || undefined,
      }, controller ? { signal: controller.signal } : undefined);

      // If Stop was pressed (or a newer send took over) while the request was
      // in flight, drop the optimistic placeholders and bail.
      if (isCancelled()) {
        setMessages(prev => prev.filter(m => m.id !== tempUserId && m.id !== tempAiId));
        return;
      }

      const { aiMessageId, conversationId, enhancedPrompt, aspectRatio, title } = sendData;

      // Update conversation title
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, title, updatedAt: new Date().toISOString() } : c
      ));
      // Seed the search-preview cache for this conv on its first message so
      // sidebar content-search hits a freshly-sent message without needing
      // a follow-up loadConversation round-trip.
      setPreviewMap(prev => (prev[conversationId] ? prev : { ...prev, [conversationId]: msgText }));
      if (conversationId !== convId) setActiveConvId(conversationId);

      // Step 2: Trigger generation
      let generationId = null;
      try {
        const aspectMap = { "9:16": "768x1344", "16:9": "1344x768", "1:1": "1024x1024", "3:4": "768x1024", "4:3": "1024x768" };
        const resolutionStr = aspectMap[aspectRatio] || "1024x1024";

        let genResp;
        if (isNsfw) {
          genResp = await api.post("/nsfw/generate-advanced", {
            modelId: selectedModelId,
            model: "nano-banana",
            prompt: enhancedPrompt,
            aspectRatio: resolutionStr,
            referencePhotos: refUrl ? [refUrl] : [],
          });
        } else {
          genResp = await api.post("/generate/advanced", {
            modelId: selectedModelId,
            engine,
            prompt: enhancedPrompt,
            referencePhotos: refUrl ? [refUrl] : [],
          });
        }
        generationId = genResp.data.generationId;
      } catch (genErr) {
        toast.error("Generation failed — credits not charged if error was on our side.");
        console.error("Generation error:", genErr);
      }

      // Step 3: Attach generationId to AI message in DB
      if (generationId) {
        await api.patch(`/gptx/messages/${aiMessageId}`, { generationId }).catch(() => {});
      }

      // Replace optimistic messages with real ones and start polling
      setMessages(prev => prev.map(m => {
        if (m.id === tempAiId) {
          return { ...m, id: aiMessageId, _loading: false, _modelId: selectedModelId, generationId: generationId || null };
        }
        if (m.id === tempUserId) {
          return { ...m, content: msgText };
        }
        return m;
      }));

      if (generationId) {
        pendingRef.current = { ...pendingRef.current, [aiMessageId]: { generationId } };
      }

    } catch (err) {
      const aborted = err?.name === "CanceledError" || err?.name === "AbortError" || err?.code === "ERR_CANCELED";
      if (!isCancelled() && !aborted) {
        toast.error("Something went wrong. Please try again.");
      }
      setMessages(prev => prev.filter(m => m.id !== tempUserId && m.id !== tempAiId));
    } finally {
      // Only flip sending=false / clear the abort ref if no newer send has
      // started. Otherwise the newer send owns the state.
      if (sendSeqRef.current === mySeq) {
        setSending(false);
        if (sendAbortRef.current === controller) sendAbortRef.current = null;
      }
    }
  };

  // Stop the in-flight send. The AbortController cancels the /gptx/send HTTP
  // request client-side so axios drops the response; but the backend can
  // still finish Grok enhancement + image generation server-side (this app
  // does not expose a mid-stream cancellation endpoint), so the toast is
  // worded carefully so we don't lie to the user about billing.
  const handleStopSend = () => {
    if (!sending) return;
    sendSeqRef.current++; // invalidate any in-flight send
    try { sendAbortRef.current?.abort(); } catch { /* ignore */ }
    sendAbortRef.current = null;
    setSending(false);
    setMessages(prev => prev.filter(m => !String(m.id).startsWith("temp-")));
    toast("Stopped — response may still complete server-side", { icon: "■" });
  };

  // Dismiss a pending generation placeholder (the gen may still complete
  // server-side, but the user won't see it until they reload that chat).
  const handleCancelPending = (msgId) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    const next = { ...pendingRef.current };
    delete next[msgId];
    pendingRef.current = next;
  };

  // Regenerate: resubmit the user prompt immediately preceding this assistant
  // message. Ref-based busy guard blocks sub-frame double-clicks (same fix
  // shape as handleMakeVideo); regeneratingId state is still used for UI.
  const handleRegenerate = async (assistantMsg) => {
    const msgId = assistantMsg.id;
    if (regenBusyRef.current.has(msgId)) return;
    if (sending) return;
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx <= 0) return;
    const prev = messages[idx - 1];
    if (!prev || prev.role !== "user") return;
    regenBusyRef.current.add(msgId);
    setRegeneratingId(msgId);
    try {
      // Remove the failed/old assistant message so the new one appears in order.
      setMessages(curr => curr.filter(m => m.id !== msgId));
      await doSend(activeConvId, prev.content);
    } finally {
      regenBusyRef.current.delete(msgId);
      setRegeneratingId(null);
    }
  };

  // Edit-and-retry: pull the user message back into the composer so they can
  // tweak it. We don't auto-delete the original — user submits the edit and
  // a new exchange is appended.
  const handleEditRetry = (userMsg) => {
    setInputTextAndPersist(userMsg.content);
    textareaRef.current?.focus();
    // Move cursor to end after focus paints.
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }, 30);
  };

  const handleMakeVideo = async (msg, imageUrl) => {
    if (!selectedModelId) return;
    const msgId = msg.id;
    // Ref-based busy guard — blocks sub-frame double-taps that would otherwise
    // both pass a state-based check before either setState flush completes and
    // double-charge the user. State guards (msg._videoLoading / msg.videoGenId)
    // are still respected for the loaded-from-DB case.
    if (videoBusyRef.current.has(msgId)) return;
    if (msg._videoLoading || msg.videoGenId) return;
    videoBusyRef.current.add(msgId);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, _videoLoading: true } : m));

    try {
      const { data } = await api.post("/nsfw/generate-video", {
        modelId: selectedModelId,
        imageUrl,
        duration: videoDuration,
      });
      const videoGenId = data.generationId;

      await api.patch(`/gptx/messages/${msgId}`, { videoGenId }).catch(() => {});

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, videoGenId } : m));
      pendingRef.current = { ...pendingRef.current, [msgId]: { videoGenId } };
      toast.success(`Video started! ${data.creditsUsed} credits used`);
    } catch (err) {
      toast.error("Video generation failed");
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, _videoLoading: false } : m));
    } finally {
      videoBusyRef.current.delete(msgId);
    }
  };

  const handleUseAsRef = (url) => {
    setReferenceImageUrl(url);
    textareaRef.current?.focus();
    toast.success("Image set as reference — describe what to create next");
  };

  // Composer key handling: Enter sends, Shift+Enter newline, ArrowUp at empty
  // input recalls the most recent user message. The ArrowUp recall guards
  // against modifier combos (Cmd/Ctrl/Shift/Alt-Up for selection / nav) and
  // active IME composition so it never pre-empts a real keyboard intent.
  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (
      e.key === "ArrowUp" &&
      e.target.value === "" &&
      e.target.selectionStart === 0 &&
      !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
      !e.nativeEvent.isComposing
    ) {
      const lastUser = [...messages].reverse().find(m => m.role === "user");
      if (lastUser?.content) {
        e.preventDefault();
        setInputTextAndPersist(lastUser.content);
      }
    }
  };

  // Global Cmd/Ctrl+K focuses sidebar search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!showSidebar) setShowSidebar(true);
        setTimeout(() => searchInputRef.current?.focus(), 80);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSidebar]);

  // Compute "latest user message" so only that one gets the Edit & Retry pencil.
  const latestUserMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].id;
    }
    return null;
  }, [messages]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const composerDisabled = !hasModels;
  const sendDisabled = !inputText.trim() || sending || composerDisabled;
  const placeholder = !hasModels
    ? "Add a model in the Models tab to start"
    : referenceImageUrl
      ? "Describe what to create from this reference…"
      : activeConvId
        ? "Describe what you want to create…"
        : "Describe what you want to create — Enter to send";

  return (
    <div
      className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden rounded-2xl relative"
      style={{ background: "var(--bg-content)", border: "1px solid var(--border-subtle)" }}
    >

      {/* ── Conversation sidebar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.aside
            key="sidebar"
            initial={prefersReducedMotion ? { opacity: 1, width: 260 } : { width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1, width: 260 } : { width: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="flex-shrink-0 flex flex-col overflow-hidden border-r absolute md:relative inset-y-0 left-0 md:z-auto"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-content)",
              zIndex: "var(--z-sidebar)",
            }}
            aria-label="Chat conversations"
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
              <span className="text-[11px] uppercase tracking-widest text-slate-500 font-medium">Chats</span>
              <button
                onClick={handleNewConversation}
                className="tap-target-min p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                title="New chat"
                aria-label="Start a new chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Search */}
            <div className="px-2 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") setSearchQuery(""); }}
                  placeholder="Search chats… (⌘K)"
                  aria-label="Search chats"
                  className="w-full pl-7 pr-7 py-1.5 rounded-lg text-[11.5px] focus:outline-none transition-colors placeholder-slate-600"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-primary)",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="tap-target-min absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-3 scrollbar-thin">
              {filteredGroupedConversations.length === 0 ? (
                <p className="text-[11px] text-slate-600 text-center py-6 px-2">
                  {searchQuery ? `No chats match “${searchQuery}”` : "No chats yet. Start below!"}
                </p>
              ) : (
                filteredGroupedConversations.map(group => (
                  <div key={group.label} className="space-y-0.5">
                    <p className="px-2 pt-1 text-[9.5px] uppercase tracking-widest text-slate-600 font-medium">
                      {group.label}
                    </p>
                    {group.items.map(c => (
                      <ConvItem
                        key={c.id}
                        conv={c}
                        active={c.id === activeConvId}
                        pinned={pinnedIds.has(c.id)}
                        onClick={() => {
                          setActiveConvId(c.id);
                          // Close sidebar on small screens once a chat is picked.
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            setShowSidebar(false);
                          }
                        }}
                        onDelete={handleDeleteConversation}
                        onPin={handleTogglePin}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile sidebar scrim */}
      {showSidebar && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setShowSidebar(false)}
          className="md:hidden absolute inset-0 bg-black/40"
          style={{ left: 260, zIndex: "var(--z-overlay)" }}
        />
      )}

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
            aria-label={showSidebar ? "Hide chat sidebar" : "Show chat sidebar"}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }} aria-hidden="true">
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white truncate">GPT-X Studio</span>
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase shrink-0"
              style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
            >Beta</span>
          </div>

          {/* Video duration selector (right side) */}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-500 hidden sm:inline">Video:</span>
            <div role="group" aria-label="Video duration" className="flex items-center gap-1">
              {[5, 8].map(d => (
                <button
                  key={d}
                  onClick={() => setVideoDuration(d)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                    videoDuration === d
                      ? "bg-white/[0.08] border-white/20 text-white"
                      : "border-white/[0.06] text-slate-500 hover:text-white hover:border-white/15"
                  }`}
                  aria-pressed={videoDuration === d}
                  aria-label={`Video duration ${d} seconds`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin"
        >
          {!activeConvId && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-5 pb-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.1))", border: "1px solid rgba(124,58,237,0.2)" }}
                aria-hidden="true"
              >
                <Wand2 className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">AI Generation Assistant</h3>
                <p className="text-[12.5px] text-slate-500 max-w-xs">
                  Describe what you want to create. Grok will enhance your idea and generate it with your chosen model.
                </p>
              </div>
              <div className="w-full max-w-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROMPT_CATEGORIES.map(cat => (
                    <div key={cat.label} className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium px-1">{cat.label}</p>
                      <div className="space-y-1.5">
                        {cat.examples.map(ex => (
                          <button
                            key={ex}
                            onClick={() => {
                              setInputTextAndPersist(ex);
                              setTimeout(() => textareaRef.current?.focus(), 30);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-[11.5px] text-slate-400 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map(msg => {
            if (msg.role === "user") {
              return (
                <UserMessage
                  key={msg.id}
                  msg={msg}
                  isLatest={msg.id === latestUserMsgId}
                  onEditRetry={handleEditRetry}
                />
              );
            }
            return (
              <AssistantMessage
                key={msg.id}
                msg={msg}
                models={models}
                onMakeVideo={handleMakeVideo}
                onUseAsRef={handleUseAsRef}
                onRegenerate={handleRegenerate}
                onCancelPending={handleCancelPending}
                regeneratingId={regeneratingId}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="shrink-0 px-3 pb-3 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>

          {/* Reference image strip */}
          {referenceImageUrl && (
            <div
              className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Camera className="w-3.5 h-3.5 text-violet-400 shrink-0" aria-hidden="true" />
              <img src={referenceImageUrl} alt="Reference" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-[11px] text-slate-400 flex-1 truncate">Using as reference</span>
              <button
                onClick={() => setReferenceImageUrl(null)}
                className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                title="Remove reference image"
                aria-label="Remove reference image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Model + settings row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Model selector */}
            <div className="relative">
              <label className="sr-only" htmlFor="gptx-model-select">Model</label>
              <select
                id="gptx-model-select"
                value={selectedModelId}
                onChange={e => setSelectedModelAndPersist(e.target.value)}
                className="h-8 pl-2.5 pr-7 rounded-lg text-[11.5px] font-medium appearance-none cursor-pointer transition-colors focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
              >
                {models.length === 0 && <option value="">No models</option>}
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" aria-hidden="true" />
            </div>

            {/* NSFW toggle */}
            {selectedModel?.nsfwUnlocked && (
              <button
                onClick={() => setIsNsfw(n => !n)}
                className={`h-8 px-3 rounded-lg text-[11px] font-medium border transition-colors ${
                  isNsfw
                    ? "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300"
                    : "bg-white/[0.03] border-white/10 text-slate-500 hover:text-slate-300"
                }`}
                aria-pressed={isNsfw}
                aria-label="Toggle NSFW mode"
              >
                NSFW
              </button>
            )}

            {/* Engine selector (SFW only) */}
            {!isNsfw && (
              <div
                className="flex gap-1 p-0.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                role="group"
                aria-label="Image engine"
              >
                {[{ v: "seedream", label: "Seedream" }, { v: "nano-banana", label: "Nano" }].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setEngine(v)}
                    className={`px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-all ${
                      engine === v ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                    aria-pressed={engine === v}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {!hasModels && (
              <span className="text-[11px] text-slate-500">Add a model in the Models tab first</span>
            )}
          </div>

          {/* Text input row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputTextAndPersist(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={placeholder}
                disabled={composerDisabled}
                rows={1}
                aria-label="Message composer"
                className="w-full resize-none rounded-xl px-4 py-2.5 text-[13px] placeholder-slate-500 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "var(--text-primary)",
                  minHeight: 44,
                  maxHeight: 180,
                }}
              />
            </div>
            {/* Single button whose role swaps between Send and Stop based on
                `sending`. Rendering one element (instead of two sibling-swapped
                buttons) keeps DOM identity stable, so keyboard focus survives
                the transition — users no longer get punted back to <body>. */}
            <button
              onClick={sending ? handleStopSend : handleSend}
              disabled={sending ? false : sendDisabled}
              className="h-11 w-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={
                sending
                  ? { background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)" }
                  : { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }
              }
              title={sending ? "Stop" : "Send (Enter)"}
              aria-label={sending ? "Stop generating" : "Send message"}
            >
              {sending
                ? <Square className="w-3.5 h-3.5 text-rose-300 fill-rose-300" />
                : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            <span className="hidden sm:inline">Grok enhances your prompt • Enter to send • Shift+Enter for new line • ↑ to recall last message</span>
            <span className="sm:hidden">Grok enhances your prompt before generation</span>
          </p>
        </div>
      </div>
    </div>
  );
}
