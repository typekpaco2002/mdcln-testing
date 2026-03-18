import React from "react";
import { Link } from "react-router-dom";
import { User, Sparkles, Video, LayoutDashboard, ArrowRight } from "lucide-react";

const cards = [
  { to: "/pro/models", label: "Models", desc: "Create and manage models", icon: User },
  { to: "/pro/nsfw", label: "NSFW Studio", desc: "LoRA training, model add, NSFW generate", icon: Sparkles },
  { to: "/pro/generation", label: "Generation Studio", desc: "Identity recreate, prompt image, video motion", icon: Video },
];

export default function ProDashboardPage() {
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
            Dashboard
          </h1>
        </div>
        <p className="text-sm max-w-md" style={{ color: "var(--pro-text-muted)" }}>
          Choose a section to get started.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="navigation" aria-label="Pro Studio sections">
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
                Open <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
