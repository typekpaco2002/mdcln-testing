// Hidden, dev-only design-system page used by the Figma exporter.
// Renders one of every reusable component on a long scrollable page so the
// html.to.design plugin can capture them as discrete frames in Figma.
//
// Theming: the current `useTheme()` value drives light/dark; the Figma exporter
// renders this page once per theme.
//
// To add a component to the export: import it below and place an example in
// the appropriate <Section>. Keep mock props minimal — the goal is visual
// reference, not feature parity.

import { useTheme } from "../hooks/useTheme.jsx";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import BrandMark from "../components/BrandMark";
import {
  ArrowRight,
  Check,
  Cpu,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";

function Section({ title, children }) {
  return (
    <section
      style={{
        padding: "32px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 16,
            fontFamily: "var(--font-mono)",
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </section>
  );
}

function Swatch({ varName, label }) {
  return (
    <div style={{ width: 140 }}>
      <div
        style={{
          width: "100%",
          height: 56,
          borderRadius: 10,
          background: `var(${varName})`,
          border: "1px solid var(--border-subtle)",
        }}
      />
      <div
        style={{
          fontSize: 11,
          color: "var(--text-primary)",
          marginTop: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {varName}
      </div>
    </div>
  );
}

function Card({ title, body, footer }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-medium)",
        boxShadow: "0 8px 24px var(--shadow-ambient)",
        flex: "1 1 260px",
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{body}</div>
      {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
    </div>
  );
}

export default function DesignSystemPage() {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
      }}
      data-design-system="true"
      data-theme-active={theme}
    >
      {/* Header */}
      <div
        style={{
          padding: "28px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandMark />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                ModelClone Design System
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Theme: {theme} · auto-rendered for Figma export
              </div>
            </div>
          </div>
          <Badge variant="success">render ok</Badge>
        </div>
      </div>

      {/* Typography */}
      <Section title="Typography">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Display 36 / 700 — The quick brown fox
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Heading 24 / 600 — The quick brown fox
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            Subheading 18 / 600 — The quick brown fox
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
            Body 14 / 500 — The quick brown fox jumps over the lazy dog.
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Caption 12 / regular — supplementary text in muted tone.
          </div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            mono 11 — `code-style label-string`
          </div>
        </div>
      </Section>

      {/* Color tokens */}
      <Section title="Color tokens">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Swatch varName="--bg-page" label="Page background" />
          <Swatch varName="--bg-surface" label="Surface" />
          <Swatch varName="--bg-elevated" label="Elevated" />
          <Swatch varName="--text-primary" label="Text primary" />
          <Swatch varName="--text-muted" label="Text muted" />
          <Swatch varName="--border-subtle" label="Border subtle" />
          <Swatch varName="--border-medium" label="Border medium" />
          <Swatch varName="--success" label="Success" />
          <Swatch varName="--danger" label="Danger" />
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn-primary" style={{ padding: "10px 18px", borderRadius: 8 }}>
            Primary
          </button>
          <button
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-medium)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Secondary
          </button>
          <button
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Ghost
          </button>
          <button
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--danger) 15%, transparent)",
              color: "var(--danger)",
              border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Destructive
          </button>
          <button
            disabled
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              fontSize: 13,
              opacity: 0.6,
              cursor: "not-allowed",
            }}
          >
            Disabled
          </button>
          <button
            className="btn-primary"
            style={{ padding: "10px 18px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading
          </button>
          <button
            className="btn-primary"
            style={{ padding: "10px 18px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            With icon
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="Inputs">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
          <Input placeholder="Default input — type something…" />
          <Input placeholder="Disabled" disabled />
          <Input value="With a real value" readOnly />
          <textarea
            placeholder="Multi-line textarea…"
            rows={3}
            className="flex w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            style={{ resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" defaultChecked />
            <span style={{ fontSize: 13 }}>Checkbox checked</span>
            <input type="checkbox" />
            <span style={{ fontSize: 13 }}>Checkbox unchecked</span>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Card
            title="Default card"
            body="A simple elevated card with title and supporting text. Uses surface tokens so it adapts to light/dark."
            footer={
              <button className="btn-primary" style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>
                Action
              </button>
            }
          />
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--success)" }} />
                <span>Card with icon</span>
              </div>
            }
            body="Common pattern for feature highlights and onboarding steps."
          />
          <Card
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Card with status</span>
                <Badge variant="success">live</Badge>
              </div>
            }
            body="Use the status slot for stateful resources (generations, models, jobs)."
          />
        </div>
      </Section>

      {/* Stats */}
      <Section title="Stat tiles">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { label: "Credits", value: "12,500", icon: <Wand2 className="w-4 h-4" /> },
            { label: "Models", value: "3", icon: <Cpu className="w-4 h-4" /> },
            { label: "Generations today", value: "24", icon: <ImageIcon className="w-4 h-4" /> },
            { label: "Active subs", value: "1", icon: <Check className="w-4 h-4" /> },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: 14,
                borderRadius: 10,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 11, marginBottom: 6 }}>
                {s.icon}
                <span style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Toast preview (static) */}
      <Section title="Toast (static preview)">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { kind: "success", text: "Generation finished", color: "var(--success)" },
            { kind: "error", text: "Generation failed: bad input image", color: "var(--danger)" },
            { kind: "info", text: "Subscription renews June 15", color: "var(--text-primary)" },
          ].map((t) => (
            <div
              key={t.kind}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-medium)",
                fontSize: 13,
                display: "flex",
                gap: 10,
                alignItems: "center",
                boxShadow: "0 10px 32px var(--shadow-ambient)",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />
              {t.text}
            </div>
          ))}
        </div>
      </Section>

      {/* Footer */}
      <div
        style={{
          padding: "24px",
          textAlign: "center",
          fontSize: 11,
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        ModelClone — design system reference (rendered in {theme} mode)
      </div>
    </div>
  );
}
