import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, Sparkles, Video, LayoutDashboard, ArrowRight } from "lucide-react";

const LOCALE_STORAGE_KEY = "app_locale";

const COPY = {
  en: {
    title: "Dashboard",
    subtitle: "Choose a section to get started.",
    sectionsAriaLabel: "Pro Studio sections",
    modelsLabel: "Models",
    modelsDesc: "Create and manage models",
    nsfwLabel: "NSFW Studio",
    nsfwDesc: "LoRA training, model add, NSFW generate",
    generationLabel: "Generation Studio",
    generationDesc: "Identity recreate, prompt image, video motion",
    open: "Open",
  },
  ru: {
    title: "Панель управления",
    subtitle: "Выберите раздел, чтобы начать работу.",
    sectionsAriaLabel: "Разделы Pro Studio",
    modelsLabel: "Модели",
    modelsDesc: "Создание и управление моделями",
    nsfwLabel: "NSFW Studio",
    nsfwDesc: "Обучение LoRA, добавление моделей, генерация NSFW",
    generationLabel: "Generation Studio",
    generationDesc: "Воссоздание личности, изображение-подсказка, движение видео",
    open: "Открыть",
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

export default function ProDashboardPage() {
  const [locale] = useState(resolveLocale);
  const copy = COPY[locale] || COPY.en;
  const cards = [
    { to: "/pro/models", label: copy.modelsLabel, desc: copy.modelsDesc, icon: User },
    { to: "/pro/nsfw", label: copy.nsfwLabel, desc: copy.nsfwDesc, icon: Sparkles },
    { to: "/pro/generation", label: copy.generationLabel, desc: copy.generationDesc, icon: Video },
  ];

  return (
    <div className="p-8 md:p-10 max-w-4xl">
      <header className="mb-10 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ background: "var(--pro-surface-elevated)", border: "1px solid var(--pro-border)" }}
            aria-hidden
          >
            <LayoutDashboard className="w-5 h-5" style={{ color: "var(--pro-accent)" }} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" data-pro-heading style={{ color: "var(--pro-text)" }}>
            {copy.title}
          </h1>
        </div>
        <p className="text-sm max-w-md" style={{ color: "var(--pro-text-muted)" }}>
          {copy.subtitle}
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="navigation" aria-label={copy.sectionsAriaLabel}>
        {cards.map(({ to, label, desc, icon: Icon }, i) => (
          <Link
            key={to}
            to={to}
            className={`group flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 stagger-item hover:border-[var(--pro-border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-bg)]`}
            style={{
              background: "var(--pro-surface)",
              borderColor: "var(--pro-border)",
            }}
          >
            <div
              className="p-3 rounded-xl shrink-0 transition-colors duration-200 group-hover:bg-[var(--pro-accent)]/10"
              style={{
                background: "var(--pro-surface-elevated)",
                border: "1px solid var(--pro-border-strong)",
              }}
            >
              <Icon className="w-6 h-6 transition-colors duration-200" style={{ color: "var(--pro-accent)" }} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-base mb-0.5 group-hover:text-[var(--pro-accent)] transition-colors duration-200" data-pro-heading style={{ color: "var(--pro-text)" }}>
                {label}
              </h2>
              <p className="text-sm" style={{ color: "var(--pro-text-muted)" }}>
                {desc}
              </p>
              <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" style={{ color: "var(--pro-accent)" }}>
                {copy.open} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
