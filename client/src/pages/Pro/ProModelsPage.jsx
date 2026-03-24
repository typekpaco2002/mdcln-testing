import React, { useState } from "react";
import { User, Plus } from "lucide-react";
import { useCachedModels } from "../../hooks/useCachedModels";
import { getThumbnailUrl } from "../../utils/imageUtils";
import CreateModelModal from "../../components/CreateModelModal";
import toast from "react-hot-toast";

const LOCALE_STORAGE_KEY = "app_locale";

const COPY = {
  en: {
    title: "Models",
    subtitle: "Create and manage your models.",
    addModel: "Add model",
    loading: "Loading models…",
    emptyTitle: "No models yet",
    emptySubtitle: "Create your first model to get started.",
    emptyCta: "Create your first model",
    statusProcessing: "Processing…",
    statusReady: "Ready",
    toastNotEnoughCredits: "Not enough credits",
  },
  ru: {
    title: "Модели",
    subtitle: "Создавайте и управляйте своими моделями.",
    addModel: "Добавить модель",
    loading: "Загрузка моделей…",
    emptyTitle: "Моделей пока нет",
    emptySubtitle: "Создайте свою первую модель, чтобы начать работу.",
    emptyCta: "Создать первую модель",
    statusProcessing: "Обработка…",
    statusReady: "Готово",
    toastNotEnoughCredits: "Недостаточно кредитов",
  },
};

function resolveLocale() {
  try {
    const qsLang = new URLSearchParams(window.location.search).get("lang");
    const normalizedQs = String(qsLang || "").toLowerCase();
    if (normalizedQs === "ru" || normalizedQs === "en") {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalizedQs);
      return normalizedQs;
    }
    const saved = String(localStorage.getItem(LOCALE_STORAGE_KEY) || "").toLowerCase();
    if (saved === "ru" || saved === "en") return saved;
    const browser = String(navigator.language || "").toLowerCase();
    return browser.startsWith("ru") ? "ru" : "en";
  } catch {
    return "en";
  }
}

export default function ProModelsPage() {
  const [locale] = useState(resolveLocale);
  const copy = COPY[locale] || COPY.en;
  const { models, isLoading, refetch, invalidateModels } = useCachedModels();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="p-8 md:p-10">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1" data-pro-heading style={{ color: "var(--pro-text)" }}>
            {copy.title}
          </h1>
          <p className="text-sm" style={{ color: "var(--pro-text-muted)" }}>
            {copy.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-bg)] hover:opacity-90"
          style={{
            background: "var(--pro-accent)",
            color: "var(--pro-bg)",
          }}
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          {copy.addModel}
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--pro-text-muted)" }}>
          {copy.loading}
        </p>
      ) : models.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed p-12 md:p-16 text-center animate-fade-in"
          style={{
            borderColor: "var(--pro-border)",
            background: "var(--pro-surface)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--pro-surface-elevated)", border: "1px solid var(--pro-border)" }}
          >
            <User className="w-7 h-7" style={{ color: "var(--pro-text-muted)" }} aria-hidden />
          </div>
          <p className="font-medium mb-1" style={{ color: "var(--pro-text)" }}>
            {copy.emptyTitle}
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--pro-text-muted)" }}>
            {copy.emptySubtitle}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-bg)]"
            style={{
              background: "var(--pro-accent)",
              color: "var(--pro-bg)",
            }}
          >
            <Plus className="w-4 h-4" aria-hidden />
            {copy.emptyCta}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {models.map((m) => (
            <div
              key={m.id}
              className="rounded-xl overflow-hidden border transition-all duration-200 hover:border-[var(--pro-border-strong)] focus-within:ring-2 focus-within:ring-[var(--pro-accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--pro-bg)]"
              style={{
                background: "var(--pro-surface)",
                borderColor: "var(--pro-border)",
              }}
            >
              <div className="aspect-[3/4] relative overflow-hidden" style={{ background: "var(--pro-surface-elevated)" }}>
                <img
                  src={getThumbnailUrl(m.photo1Url) || ""}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate" style={{ color: "var(--pro-text)" }}>
                  {m.name}
                </p>
                <p className="text-xs" style={{ color: "var(--pro-text-muted)" }}>
                  {m.status === "processing" ? copy.statusProcessing : copy.statusReady}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateModelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          invalidateModels();
          refetch();
          setShowCreateModal(false);
        }}
        onNeedCredits={() => toast.error(copy.toastNotEnoughCredits)}
      />
    </div>
  );
}
