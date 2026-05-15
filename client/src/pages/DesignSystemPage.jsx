// Hidden, dev-only design-system page used by the Figma exporter / capture pipeline.
// Renders one of every reusable component AND every meaningful state on a long
// scrollable page so it can be captured into Figma as a complete component library.
//
// Theming: the current `useTheme()` value drives light/dark; the export pipeline
// renders this page once per theme.
//
// To add a component: import it (or inline the markup) and place an example in
// the appropriate <Section>. Keep mock props minimal; goal is visual coverage,
// not feature parity.

import { useTheme } from "../hooks/useTheme.jsx";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import BrandMark from "../components/BrandMark";
import {
  GlassPanel,
  GlassCard,
  GlassButton,
  RadialGlow,
  FluidMotion,
  AuroraBackdrop,
} from "../components/ui/glass";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Cpu,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Folder,
  Gift,
  Heart,
  Home as HomeIcon,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  Play,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Users,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ──────────────────────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <section
      data-ds-section={title}
      style={{
        padding: "36px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function Row({ children, gap = 12, wrap = true, align = "center" }) {
  return (
    <div
      style={{
        display: "flex",
        gap,
        flexWrap: wrap ? "wrap" : "nowrap",
        alignItems: align,
      }}
    >
      {children}
    </div>
  );
}

function Col({ children, gap = 12 }) {
  return <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>;
}

function Demo({ label, children, w = "auto" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: w }}>
      {children}
      {label && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function Surface({ children, padding = 16, w = "auto", h, style, glow }) {
  return (
    <GlassPanel
      strength="strong"
      rim
      glow={glow}
      style={{ padding, width: w, minHeight: h, ...style }}
    >
      {children}
    </GlassPanel>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Reusable mini-components (inline so we don't depend on stateful real ones)
// ──────────────────────────────────────────────────────────────────────────────

function Btn({ variant = "primary", size = "md", icon, iconRight, disabled, loading, children, style }) {
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 12, h: 30, iconSize: 14 },
    md: { padding: "10px 16px", fontSize: 13, h: 38, iconSize: 16 },
    lg: { padding: "12px 20px", fontSize: 14, h: 44, iconSize: 18 },
  };
  const s = sizes[size];
  const variants = {
    primary: { bg: "var(--brand-500, #a78bfa)", color: "#fff", border: "1px solid transparent" },
    secondary: { bg: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-medium)" },
    ghost: { bg: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" },
    danger: {
      bg: "color-mix(in srgb, var(--danger) 15%, transparent)",
      color: "var(--danger)",
      border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)",
    },
    success: {
      bg: "color-mix(in srgb, var(--success) 15%, transparent)",
      color: "var(--success)",
      border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
    },
    link: { bg: "transparent", color: "var(--brand-500, #a78bfa)", border: "1px solid transparent" },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      disabled={disabled || loading}
      className={variant === "primary" ? "btn-primary" : ""}
      style={{
        padding: s.padding,
        fontSize: s.fontSize,
        height: s.h,
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: 8,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      {loading ? <Loader2 style={{ width: s.iconSize, height: s.iconSize }} className="animate-spin" /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

function Pill({ tone = "neutral", children, closable, icon }) {
  const tones = {
    neutral: { bg: "var(--bg-surface)", color: "var(--text-primary)", border: "var(--border-medium)" },
    info: { bg: "color-mix(in srgb, #3b82f6 12%, transparent)", color: "#3b82f6", border: "color-mix(in srgb, #3b82f6 32%, transparent)" },
    success: { bg: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)", border: "color-mix(in srgb, var(--success) 32%, transparent)" },
    warning: { bg: "color-mix(in srgb, #f59e0b 12%, transparent)", color: "#f59e0b", border: "color-mix(in srgb, #f59e0b 32%, transparent)" },
    danger: { bg: "color-mix(in srgb, var(--danger) 12%, transparent)", color: "var(--danger)", border: "color-mix(in srgb, var(--danger) 32%, transparent)" },
    brand: { bg: "color-mix(in srgb, var(--brand-500, #a78bfa) 14%, transparent)", color: "var(--brand-500, #a78bfa)", border: "color-mix(in srgb, var(--brand-500, #a78bfa) 32%, transparent)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}
    >
      {icon}
      {children}
      {closable && <X style={{ width: 11, height: 11, cursor: "pointer", opacity: 0.7 }} />}
    </span>
  );
}

function Avatar({ src, initials, size = 36, status, ring }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: src ? `center/cover no-repeat url(${src})` : "color-mix(in srgb, var(--brand-500, #a78bfa) 35%, var(--bg-surface))",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: Math.round(size * 0.38),
          border: ring ? `2px solid var(--brand-500, #a78bfa)` : "1px solid var(--border-medium)",
          boxShadow: ring ? "0 0 0 3px var(--bg-page)" : "none",
        }}
      >
        {!src && initials}
      </div>
      {status && (
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: Math.max(8, size * 0.28),
            height: Math.max(8, size * 0.28),
            borderRadius: 999,
            background:
              status === "online" ? "var(--success)" : status === "busy" ? "var(--danger)" : "#9ca3af",
            border: "2px solid var(--bg-elevated)",
          }}
        />
      )}
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
        {children}
      </label>
      {hint && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</div>}
    </div>
  );
}

function ProgressBar({ value, tone = "brand", showLabel }) {
  const colorMap = {
    brand: "var(--brand-500, #a78bfa)",
    success: "var(--success)",
    danger: "var(--danger)",
  };
  return (
    <div style={{ width: "100%" }}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
          <span>{showLabel}</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}%</span>
        </div>
      )}
      <div style={{ height: 6, borderRadius: 999, background: "var(--bg-surface)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: colorMap[tone] || colorMap.brand,
            transition: "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}

function Skeleton({ w, h, radius = 6 }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, color-mix(in srgb, var(--text-muted) 8%, transparent) 0%, color-mix(in srgb, var(--text-muted) 16%, transparent) 50%, color-mix(in srgb, var(--text-muted) 8%, transparent) 100%)",
      }}
    />
  );
}

function Toast({ tone = "info", title, body, action }) {
  const tones = {
    success: { color: "var(--success)", icon: <CheckCircle2 style={{ width: 18, height: 18 }} /> },
    error: { color: "var(--danger)", icon: <XCircle style={{ width: 18, height: 18 }} /> },
    warning: { color: "#f59e0b", icon: <AlertTriangle style={{ width: 18, height: 18 }} /> },
    info: { color: "var(--text-primary)", icon: <Info style={{ width: 18, height: 18 }} /> },
  };
  const t = tones[tone] || tones.info;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-medium)",
        boxShadow: "0 10px 32px var(--shadow-ambient)",
        minWidth: 260,
        maxWidth: 380,
      }}
    >
      <span style={{ color: t.color, paddingTop: 1 }}>{t.icon}</span>
      <div style={{ flex: 1, fontSize: 13 }}>
        {title && <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>}
        {body && <div style={{ color: "var(--text-muted)", marginTop: title ? 2 : 0 }}>{body}</div>}
      </div>
      {action && <Btn variant="ghost" size="sm">{action}</Btn>}
    </div>
  );
}

function Banner({ tone = "info", title, body, dismissible = true }) {
  const tones = {
    success: { color: "var(--success)", icon: <CheckCircle2 style={{ width: 16, height: 16 }} />, ring: "color-mix(in srgb, var(--success) 32%, transparent)" },
    error: { color: "var(--danger)", icon: <XCircle style={{ width: 16, height: 16 }} />, ring: "color-mix(in srgb, var(--danger) 32%, transparent)" },
    warning: { color: "#f59e0b", icon: <AlertTriangle style={{ width: 16, height: 16 }} />, ring: "color-mix(in srgb, #f59e0b 32%, transparent)" },
    info: { color: "#3b82f6", icon: <Info style={{ width: 16, height: 16 }} />, ring: "color-mix(in srgb, #3b82f6 32%, transparent)" },
  };
  const t = tones[tone];
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 10,
        background: `color-mix(in srgb, ${t.color} 8%, var(--bg-elevated))`,
        border: `1px solid ${t.ring}`,
      }}
    >
      <span style={{ color: t.color, paddingTop: 2 }}>{t.icon}</span>
      <div style={{ flex: 1, fontSize: 13 }}>
        {title && <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{title}</div>}
        {body && <div style={{ color: "var(--text-muted)", marginTop: title ? 4 : 0 }}>{body}</div>}
      </div>
      {dismissible && (
        <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        paddingBottom: 80,
        position: "relative",
        overflow: "hidden",
      }}
      data-design-system="true"
      data-theme-active={theme}
    >
      <AuroraBackdrop variant="default" />

      {/* Header — glass with violet edge glow */}
      <div
        className="motion-spring"
        style={{
          padding: "20px 24px",
          background: "var(--glass-fill-elevated)",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          borderBottom: "1px solid var(--glass-border-strong)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <BrandMark />
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em" }}>
                Aurora · ModelClone Design System
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Theme: <strong style={{ color: "var(--text-primary)" }}>{theme}</strong> · glass + violet glow + fluid motion
              </div>
            </div>
          </div>
          <Row gap={8}>
            <Pill tone="success" icon={<Check style={{ width: 11, height: 11 }} />}>render ok</Pill>
            <Pill tone="brand" icon={<Sparkles style={{ width: 11, height: 11 }} />}>{theme} mode</Pill>
          </Row>
        </div>
      </div>

      {/* 00 · AURORA — the new aesthetic */}
      <Section title="00 · Aurora — the new design language" subtitle="Glass surfaces · ambient violet glow · spring-easing motion">
        <FluidMotion>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <GlassCard glow="medium">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                Glass surface · medium glow
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
                Translucent depth
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                Surfaces use backdrop-blur for depth without weight. Borders are hairline-thin.
              </div>
            </GlassCard>

            <GlassCard glow="strong">
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                Strong glow · accent
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6, color: "var(--accent)" }}>
                Ambient violet
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                Radial glows wash through the UI — no big colored blocks, just subtle light.
              </div>
            </GlassCard>

            <GlassCard interactive>
              <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>
                Spring motion
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>
                Hover this card →
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <GlassButton size="sm" variant="accent" glow>Primary</GlassButton>
                <GlassButton size="sm" variant="outline">Outline</GlassButton>
                <GlassButton size="sm" variant="ghost">Ghost</GlassButton>
              </div>
            </GlassCard>
          </div>
        </FluidMotion>
      </Section>

      {/* TYPOGRAPHY */}
      <Section title="01 · Typography" subtitle="Display, headings, body, code">
        <Col gap={10}>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em" }}>Display 48 / 800</div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>Display 36 / 700 — The quick brown fox</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Heading 28 / 700</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>Heading 22 / 600</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Subheading 18 / 600</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Body large 15 / 500 — body copy for prose-heavy contexts.</div>
          <div style={{ fontSize: 13, color: "var(--text-primary)" }}>Body 13 / regular — default UI text.</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Caption 12 — supplementary text in muted tone.</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>mono 11 — `code-style label-string`</div>
        </Col>
      </Section>

      {/* COLOR TOKENS */}
      <Section title="02 · Color tokens" subtitle="CSS custom properties — bound in Figma to design tokens">
        <Row gap={14}>
          {[
            { v: "--bg-page", label: "Page" },
            { v: "--bg-surface", label: "Surface" },
            { v: "--bg-elevated", label: "Elevated" },
            { v: "--text-primary", label: "Text primary" },
            { v: "--text-muted", label: "Text muted" },
            { v: "--border-subtle", label: "Border subtle" },
            { v: "--border-medium", label: "Border medium" },
            { v: "--success", label: "Success" },
            { v: "--danger", label: "Danger" },
            { v: "--brand-500", label: "Brand", fallback: "#a78bfa" },
          ].map((s) => (
            <div key={s.v} style={{ width: 130 }}>
              <div
                style={{
                  width: "100%",
                  height: 56,
                  borderRadius: 10,
                  background: s.fallback ? `var(${s.v}, ${s.fallback})` : `var(${s.v})`,
                  border: "1px solid var(--border-subtle)",
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-primary)", marginTop: 8, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{s.v}</div>
            </div>
          ))}
        </Row>
      </Section>

      {/* BUTTONS */}
      <Section title="03 · Buttons" subtitle="Variants × sizes × states">
        <Col gap={20}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>VARIANTS</div>
            <Row>
              <Btn variant="primary">Primary</Btn>
              <Btn variant="secondary">Secondary</Btn>
              <Btn variant="ghost">Ghost</Btn>
              <Btn variant="danger">Destructive</Btn>
              <Btn variant="success">Success</Btn>
              <Btn variant="link">Link button</Btn>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>SIZES</div>
            <Row>
              <Btn size="sm">Small</Btn>
              <Btn size="md">Medium</Btn>
              <Btn size="lg">Large</Btn>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>STATES</div>
            <Row>
              <Btn>Default</Btn>
              <Btn loading>Loading</Btn>
              <Btn disabled>Disabled</Btn>
              <Btn icon={<Plus style={{ width: 16, height: 16 }} />}>With icon</Btn>
              <Btn iconRight={<ArrowRight style={{ width: 16, height: 16 }} />}>Icon right</Btn>
              <Btn variant="secondary" icon={<Download style={{ width: 16, height: 16 }} />}>Download</Btn>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>ICON-ONLY</div>
            <Row>
              {[Settings, Heart, Share2, MoreHorizontal, Trash2, RefreshCw].map((I, i) => (
                <button
                  key={i}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-medium)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <I style={{ width: 16, height: 16 }} />
                </button>
              ))}
            </Row>
          </div>
        </Col>
      </Section>

      {/* INPUTS */}
      <Section title="04 · Inputs" subtitle="Text fields, textareas, with affixes, validation states">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18, maxWidth: 900 }}>
          <Demo label="Default">
            <FieldLabel>Email</FieldLabel>
            <Input placeholder="you@modelclone.app" />
          </Demo>
          <Demo label="With value">
            <FieldLabel>Username</FieldLabel>
            <Input value="martin_studio" readOnly />
          </Demo>
          <Demo label="Focused">
            <FieldLabel>Search</FieldLabel>
            <Input
              placeholder="Type to search…"
              autoFocus
              style={{ borderColor: "color-mix(in srgb, var(--brand-500, #a78bfa) 60%, transparent)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--brand-500, #a78bfa) 18%, transparent)" }}
            />
          </Demo>
          <Demo label="Disabled">
            <FieldLabel>Plan tier</FieldLabel>
            <Input value="Pro Monthly" disabled />
          </Demo>
          <Demo label="Error">
            <FieldLabel>Card number</FieldLabel>
            <Input
              value="4242 4242 4242"
              style={{ borderColor: "color-mix(in srgb, var(--danger) 60%, transparent)" }}
            />
            <div style={{ fontSize: 11, color: "var(--danger)" }}>Card number is incomplete.</div>
          </Demo>
          <Demo label="Success">
            <FieldLabel>Coupon</FieldLabel>
            <Input
              value="LAUNCH50"
              style={{ borderColor: "color-mix(in srgb, var(--success) 60%, transparent)" }}
            />
            <div style={{ fontSize: 11, color: "var(--success)" }}>Coupon applied — 50% off first month.</div>
          </Demo>
          <Demo label="With prefix icon">
            <FieldLabel>Find a model</FieldLabel>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: 10, width: 14, height: 14, color: "var(--text-muted)" }} />
              <Input placeholder="Search models…" style={{ paddingLeft: 32 }} />
            </div>
          </Demo>
          <Demo label="With suffix">
            <FieldLabel>Domain</FieldLabel>
            <div style={{ display: "flex" }}>
              <Input placeholder="my-studio" style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
              <span style={{
                display: "inline-flex", alignItems: "center", padding: "0 12px",
                background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
                borderLeft: "none", borderTopRightRadius: 8, borderBottomRightRadius: 8,
                fontSize: 12, color: "var(--text-muted)",
              }}>.modelclone.app</span>
            </div>
          </Demo>
          <Demo label="Textarea">
            <FieldLabel>Prompt</FieldLabel>
            <textarea
              rows={4}
              defaultValue={"elegant portrait, soft window light,\nfilm grain, shot on 35mm, sharp eyes"}
              style={{
                width: "100%", padding: "8px 12px",
                background: "var(--bg-surface)", color: "var(--text-primary)",
                border: "1px solid var(--border-medium)", borderRadius: 8,
                fontSize: 13, lineHeight: 1.5, resize: "vertical", fontFamily: "var(--font-sans)",
              }}
            />
          </Demo>
        </div>
      </Section>

      {/* FORM CONTROLS */}
      <Section title="05 · Form controls" subtitle="Checkbox, radio, switch, slider, segmented">
        <Col gap={20}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>CHECKBOX</div>
            <Row>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" defaultChecked /> Checked
              </label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" /> Unchecked
              </label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, opacity: 0.5 }}>
                <input type="checkbox" disabled /> Disabled
              </label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13, opacity: 0.5 }}>
                <input type="checkbox" defaultChecked disabled /> Disabled checked
              </label>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>RADIO GROUP</div>
            <Row>
              {["Image", "Video", "Voice"].map((opt, i) => (
                <label key={opt} style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input type="radio" name="ds-radio" defaultChecked={i === 0} /> {opt}
                </label>
              ))}
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>SWITCH / TOGGLE</div>
            <Row>
              {[true, false].map((on, i) => (
                <span
                  key={i}
                  style={{
                    width: 36, height: 20, borderRadius: 999, padding: 2,
                    background: on ? "var(--brand-500, #a78bfa)" : "var(--bg-surface)",
                    border: "1px solid var(--border-medium)",
                    display: "inline-flex", alignItems: "center",
                    justifyContent: on ? "flex-end" : "flex-start",
                  }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.3)" }} />
                </span>
              ))}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>on / off</span>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>SLIDER</div>
            <div style={{ maxWidth: 360 }}>
              <FieldLabel hint="Lower values = more abstract">Creativity</FieldLabel>
              <input type="range" min="0" max="100" defaultValue="68" style={{ width: "100%", accentColor: "var(--brand-500, #a78bfa)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
                <span>0</span><span>68</span><span>100</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>SEGMENTED</div>
            <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--bg-surface)", border: "1px solid var(--border-medium)", borderRadius: 10 }}>
              {["Day", "Week", "Month", "Year"].map((s, i) => (
                <button
                  key={s}
                  style={{
                    padding: "6px 14px", borderRadius: 7, border: "none",
                    background: i === 1 ? "var(--bg-elevated)" : "transparent",
                    boxShadow: i === 1 ? "0 1px 3px var(--shadow-ambient)" : "none",
                    color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >{s}</button>
              ))}
            </div>
          </div>
        </Col>
      </Section>

      {/* DROPDOWN / SELECT (open) */}
      <Section title="06 · Select & Dropdown menu (open state)" subtitle="Captured in their open state for Figma editability">
        <Row gap={28} align="flex-start">
          <Demo label="select (closed)" w={260}>
            <FieldLabel>Model tier</FieldLabel>
            <button style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "9px 12px",
              background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
              borderRadius: 8, fontSize: 13, color: "var(--text-primary)", cursor: "pointer",
            }}>
              <span>Pro</span>
              <ChevronDown style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
            </button>
          </Demo>

          <Demo label="select (open with options)" w={260}>
            <FieldLabel>Model tier</FieldLabel>
            <div style={{ position: "relative" }}>
              <button style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", padding: "9px 12px",
                background: "var(--bg-surface)",
                border: "1px solid color-mix(in srgb, var(--brand-500, #a78bfa) 60%, transparent)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--brand-500, #a78bfa) 18%, transparent)",
                borderRadius: 8, fontSize: 13, color: "var(--text-primary)", cursor: "pointer",
              }}>
                <span>Pro</span>
                <ChevronDown style={{ width: 14, height: 14, color: "var(--text-muted)", transform: "rotate(180deg)" }} />
              </button>
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "var(--bg-elevated)", border: "1px solid var(--border-medium)",
                borderRadius: 10, padding: 4, boxShadow: "0 12px 32px var(--shadow-ambient)", zIndex: 2,
              }}>
                {[
                  { label: "Standard", price: "1,000 cr" },
                  { label: "Pro", price: "5,000 cr", active: true },
                  { label: "Ultra", price: "15,000 cr" },
                  { label: "Custom", price: "—", disabled: true },
                ].map((o) => (
                  <div key={o.label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "7px 10px", borderRadius: 6, fontSize: 13, cursor: o.disabled ? "not-allowed" : "pointer",
                    background: o.active ? "color-mix(in srgb, var(--brand-500, #a78bfa) 14%, transparent)" : "transparent",
                    color: o.active ? "var(--brand-500, #a78bfa)" : "var(--text-primary)",
                    opacity: o.disabled ? 0.45 : 1,
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {o.active && <Check style={{ width: 13, height: 13 }} />}
                      <span style={{ marginLeft: o.active ? 0 : 21 }}>{o.label}</span>
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{o.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </Demo>

          <Demo label="overflow menu (open)" w={220}>
            <FieldLabel>Actions</FieldLabel>
            <div style={{ position: "relative" }}>
              <button style={{
                width: 36, height: 36, borderRadius: 8,
                background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
                color: "var(--text-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <MoreHorizontal style={{ width: 16, height: 16 }} />
              </button>
              <div style={{
                position: "absolute", top: 42, left: 0, minWidth: 200,
                background: "var(--bg-elevated)", border: "1px solid var(--border-medium)",
                borderRadius: 10, padding: 4, boxShadow: "0 12px 32px var(--shadow-ambient)", zIndex: 2,
              }}>
                {[
                  { icon: Edit3, label: "Edit" },
                  { icon: Share2, label: "Share" },
                  { icon: Download, label: "Download" },
                  { divider: true },
                  { icon: Trash2, label: "Delete", danger: true },
                ].map((it, i) => it.divider ? (
                  <div key={i} style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
                ) : (
                  <div key={it.label} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "7px 10px", borderRadius: 6, fontSize: 13, cursor: "pointer",
                    color: it.danger ? "var(--danger)" : "var(--text-primary)",
                  }}>
                    <it.icon style={{ width: 14, height: 14 }} />
                    {it.label}
                  </div>
                ))}
              </div>
            </div>
          </Demo>
        </Row>
      </Section>

      {/* BADGES + PILLS + CHIPS */}
      <Section title="07 · Badges, pills, chips" subtitle="Status communication">
        <Col gap={14}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>BADGE (existing ui/badge)</div>
            <Row>
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>PILL TONES</div>
            <Row>
              <Pill>Neutral</Pill>
              <Pill tone="info">Info</Pill>
              <Pill tone="success" icon={<Check style={{ width: 11, height: 11 }} />}>Active</Pill>
              <Pill tone="warning" icon={<AlertTriangle style={{ width: 11, height: 11 }} />}>Pending</Pill>
              <Pill tone="danger" icon={<XCircle style={{ width: 11, height: 11 }} />}>Failed</Pill>
              <Pill tone="brand" icon={<Sparkles style={{ width: 11, height: 11 }} />}>New</Pill>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>CHIPS (closable)</div>
            <Row>
              <Pill closable>nsfw</Pill>
              <Pill tone="brand" closable>portrait</Pill>
              <Pill tone="info" closable>cinematic</Pill>
              <Pill tone="success" closable>completed</Pill>
            </Row>
          </div>
        </Col>
      </Section>

      {/* AVATARS */}
      <Section title="08 · Avatars" subtitle="With image, with initials, with status, sizes">
        <Col gap={16}>
          <Row>
            <Avatar size={24} initials="MA" />
            <Avatar size={32} initials="JL" />
            <Avatar size={40} initials="SK" status="online" />
            <Avatar size={48} initials="RN" status="busy" />
            <Avatar size={56} initials="DK" status="away" />
            <Avatar size={72} src="https://picsum.photos/seed/aurora/144/144" />
            <Avatar size={48} src="https://picsum.photos/seed/avatar/96/96" ring />
          </Row>
          <Row>
            <div style={{ display: "flex" }}>
              {["AB", "CD", "EF", "GH"].map((i, idx) => (
                <div key={i} style={{ marginLeft: idx === 0 ? 0 : -8 }}>
                  <Avatar size={32} initials={i} />
                </div>
              ))}
              <div style={{
                marginLeft: -8, width: 32, height: 32, borderRadius: 999,
                background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color: "var(--text-muted)", fontWeight: 700,
              }}>+5</div>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>avatar group + overflow</span>
          </Row>
        </Col>
      </Section>

      {/* CARDS */}
      <Section title="09 · Cards" subtitle="Default, with icon, with status, image-led">
        <Row gap={16} wrap align="stretch">
          <Surface w={280}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Default card</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 12 }}>
              A simple elevated card with title, body, and action. Adapts to light/dark via tokens.
            </div>
            <Btn size="sm">Action</Btn>
          </Surface>

          <Surface w={280}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Sparkles style={{ width: 16, height: 16, color: "var(--success)" }} />
              <span style={{ fontWeight: 600 }}>Card with icon</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Highlight cards with an icon for affordance — used on onboarding and feature lists.
            </div>
          </Surface>

          <Surface w={280}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Card with status</span>
              <Pill tone="success" icon={<Check style={{ width: 11, height: 11 }} />}>live</Pill>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Stateful resources (generations, models, jobs) use the status slot in the header.
            </div>
          </Surface>

          <Surface w={280} padding={0} style={{ overflow: "hidden" }}>
            <div style={{ height: 140, background: "center/cover no-repeat url('https://picsum.photos/seed/dscard/560/280')" }} />
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Image-led card</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Used for galleries, model previews, lander modules.</div>
            </div>
          </Surface>

          <Surface w={280}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Loading skeleton card</div>
            <Col gap={8}>
              <Skeleton w="80%" h={12} />
              <Skeleton w="100%" h={12} />
              <Skeleton w="60%" h={12} />
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <Skeleton w={60} h={28} radius={8} />
                <Skeleton w={60} h={28} radius={8} />
              </div>
            </Col>
          </Surface>
        </Row>
      </Section>

      {/* STAT TILES */}
      <Section title="10 · Stat tiles" subtitle="With delta indicators">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { label: "Credits", value: "12,500", delta: "+5,000", up: true, icon: <Wand2 style={{ width: 14, height: 14 }} /> },
            { label: "Models", value: "3", delta: "+1 this week", up: true, icon: <Cpu style={{ width: 14, height: 14 }} /> },
            { label: "Generations today", value: "24", delta: "−12% vs avg", up: false, icon: <ImageIcon style={{ width: 14, height: 14 }} /> },
            { label: "Active subs", value: "1", delta: "Renews Jun 15", up: null, icon: <Star style={{ width: 14, height: 14 }} /> },
          ].map((s) => (
            <Surface key={s.label} padding={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 11, marginBottom: 6 }}>
                {s.icon}
                <span style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>{s.value}</div>
              {s.delta && (
                <div style={{
                  fontSize: 11, marginTop: 4, fontWeight: 600,
                  color: s.up === true ? "var(--success)" : s.up === false ? "var(--danger)" : "var(--text-muted)",
                }}>
                  {s.delta}
                </div>
              )}
            </Surface>
          ))}
        </div>
      </Section>

      {/* LISTS / TABLE */}
      <Section title="11 · Lists & table rows" subtitle="With selection, hover, skeleton">
        <Surface padding={0} style={{ overflow: "hidden" }}>
          <div style={{
            padding: "12px 16px", display: "flex", justifyContent: "space-between",
            background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)",
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            <span>Recent generations</span>
            <span>5 items</span>
          </div>
          {[
            { name: "Aurora · portrait #001", time: "2m ago", status: "completed" },
            { name: "Mira · studio shot", time: "12m ago", status: "completed" },
            { name: "Sienna · video sample", time: "34m ago", status: "processing", hover: true },
            { name: "Aurora · NSFW v2", time: "1h ago", status: "failed" },
            { name: "Creator Studio · hero", time: "3h ago", status: "completed" },
          ].map((row, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 16px",
              background: row.hover ? "color-mix(in srgb, var(--brand-500, #a78bfa) 6%, transparent)" : "transparent",
              borderBottom: i === 4 ? "none" : "1px solid var(--border-subtle)",
              cursor: "pointer",
            }}>
              <input type="checkbox" defaultChecked={i === 0} />
              <div style={{ width: 36, height: 36, borderRadius: 6, background: `center/cover no-repeat url('https://picsum.photos/seed/${row.name}/72/72')` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{row.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.time}</div>
              </div>
              <Pill
                tone={row.status === "completed" ? "success" : row.status === "processing" ? "info" : "danger"}
              >
                {row.status}
              </Pill>
              <button style={{
                background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4,
              }}>
                <MoreHorizontal style={{ width: 16, height: 16 }} />
              </button>
            </div>
          ))}
          <div style={{ padding: "11px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12 }}>
            <Skeleton w={16} h={16} radius={3} />
            <Skeleton w={36} h={36} radius={6} />
            <div style={{ flex: 1 }}>
              <Skeleton w="60%" h={11} />
              <div style={{ height: 6 }} />
              <Skeleton w="30%" h={9} />
            </div>
            <Skeleton w={64} h={20} radius={999} />
          </div>
        </Surface>
      </Section>

      {/* TABS */}
      <Section title="12 · Tabs" subtitle="Horizontal underline + pill style">
        <Col gap={20}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>UNDERLINE TABS</div>
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-medium)" }}>
              {["Overview", "Models", "Generations", "Billing", "Team"].map((t, i) => (
                <button key={t} style={{
                  padding: "10px 16px",
                  background: "transparent", border: "none",
                  borderBottom: i === 1 ? "2px solid var(--brand-500, #a78bfa)" : "2px solid transparent",
                  color: i === 1 ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: i === 1 ? 600 : 500, fontSize: 13, cursor: "pointer",
                  marginBottom: -1,
                }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>PILL TABS</div>
            <div style={{ display: "inline-flex", padding: 4, gap: 2, background: "var(--bg-surface)", border: "1px solid var(--border-medium)", borderRadius: 10 }}>
              {["Image", "Video", "Voice", "Avatar"].map((t, i) => (
                <button key={t} style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: i === 0 ? "var(--bg-elevated)" : "transparent",
                  boxShadow: i === 0 ? "0 1px 3px var(--shadow-ambient)" : "none",
                  color: "var(--text-primary)",
                }}>{t}</button>
              ))}
            </div>
          </div>
        </Col>
      </Section>

      {/* PAGINATION + BREADCRUMBS */}
      <Section title="13 · Pagination & breadcrumbs">
        <Col gap={16}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>BREADCRUMBS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
              <HomeIcon style={{ width: 12, height: 12 }} />
              <span>Dashboard</span>
              <ChevronRight style={{ width: 12, height: 12 }} />
              <span>Models</span>
              <ChevronRight style={{ width: 12, height: 12 }} />
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Aurora</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>PAGINATION</div>
            <Row gap={4}>
              <button style={pgBtn(false, true)}><ChevronLeft style={{ width: 14, height: 14 }} /></button>
              {[1, 2, 3].map((n) => (
                <button key={n} style={pgBtn(n === 2)}>{n}</button>
              ))}
              <span style={{ padding: "0 6px", color: "var(--text-muted)" }}>…</span>
              {[8, 9, 10].map((n) => (
                <button key={n} style={pgBtn(false)}>{n}</button>
              ))}
              <button style={pgBtn(false)}><ChevronRight style={{ width: 14, height: 14 }} /></button>
            </Row>
          </div>
        </Col>
      </Section>

      {/* MODAL preview */}
      <Section title="14 · Modal / Dialog (open state)" subtitle="Rendered inline, not as overlay">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Surface w={520} padding={0} style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Add credits</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Top up your balance · pay once</div>
              </div>
              <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <Col gap={12}>
                {[
                  { name: "Starter", credits: "1,000", price: "$9.90" },
                  { name: "Creator", credits: "5,000", price: "$39.90", popular: true },
                  { name: "Pro Pack", credits: "15,000", price: "$99.90" },
                ].map((p) => (
                  <div
                    key={p.name}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px",
                      background: p.popular ? "color-mix(in srgb, var(--brand-500, #a78bfa) 8%, var(--bg-surface))" : "var(--bg-surface)",
                      border: p.popular
                        ? "1px solid color-mix(in srgb, var(--brand-500, #a78bfa) 60%, transparent)"
                        : "1px solid var(--border-medium)",
                      borderRadius: 10,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        {p.popular && <Pill tone="brand">Popular</Pill>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{p.credits} credits</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{p.price}</div>
                  </div>
                ))}
              </Col>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Btn variant="ghost">Cancel</Btn>
              <Btn variant="primary">Continue to payment</Btn>
            </div>
          </Surface>
        </div>
      </Section>

      {/* DRAWER preview */}
      <Section title="15 · Drawer / side panel" subtitle="Right-side panel — captured inline">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Surface w={380} padding={0}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>Generation settings</span>
              <X style={{ width: 14, height: 14, color: "var(--text-muted)", cursor: "pointer" }} />
            </div>
            <div style={{ padding: 18 }}>
              <Col gap={14}>
                <Demo label="">
                  <FieldLabel>Aspect ratio</FieldLabel>
                  <div style={{ display: "inline-flex", padding: 3, gap: 2, background: "var(--bg-surface)", border: "1px solid var(--border-medium)", borderRadius: 10 }}>
                    {["1:1", "3:4", "9:16", "16:9"].map((s, i) => (
                      <button key={s} style={{
                        padding: "5px 10px", borderRadius: 7, border: "none", fontSize: 11,
                        background: i === 1 ? "var(--bg-elevated)" : "transparent", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer",
                      }}>{s}</button>
                    ))}
                  </div>
                </Demo>
                <Demo label="">
                  <FieldLabel hint="Higher = better quality, more credits">Steps</FieldLabel>
                  <input type="range" min="10" max="60" defaultValue="32" style={{ width: "100%", accentColor: "var(--brand-500, #a78bfa)" }} />
                </Demo>
                <Demo label="">
                  <FieldLabel>Negative prompt</FieldLabel>
                  <textarea
                    rows={3}
                    defaultValue="blurry, low quality, watermark"
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-medium)", borderRadius: 8, fontSize: 12, resize: "vertical", fontFamily: "var(--font-sans)" }}
                  />
                </Demo>
              </Col>
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Estimated: <strong style={{ color: "var(--text-primary)" }}>50 cr</strong></span>
              <Btn>Generate</Btn>
            </div>
          </Surface>
        </div>
      </Section>

      {/* TOASTS */}
      <Section title="16 · Toasts" subtitle="Stack of notification states">
        <Col gap={10}>
          <Toast tone="success" title="Generation finished" body="Aurora · portrait #001 is ready in your gallery." action="View" />
          <Toast tone="error" title="Generation failed" body="The model returned an error. Credits not deducted." />
          <Toast tone="warning" title="Low on credits" body="You have 250 credits left — top up to keep generating." action="Add" />
          <Toast tone="info" title="Subscription renews June 15" body="Your Pro Monthly plan auto-renews in 30 days." />
        </Col>
      </Section>

      {/* BANNERS */}
      <Section title="17 · Banners & alerts" subtitle="Inline page-level messaging">
        <Col gap={10}>
          <Banner tone="info" title="System update" body="We've moved Stripe payments to a new account. No action needed — your subscription stays active." />
          <Banner tone="success" title="Payment received" body="Your $39.90 Creator pack purchase added 5,000 credits." />
          <Banner tone="warning" title="Verify your email" body="Some features are limited until you confirm the email we sent to you@modelclone.app." />
          <Banner tone="error" title="Generation provider degraded" body="WaveSpeed is currently slower than usual. We're queuing your jobs and will retry automatically." />
        </Col>
      </Section>

      {/* PROGRESS */}
      <Section title="18 · Progress, spinners, skeletons">
        <Col gap={20}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>BARS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              <ProgressBar value={28} showLabel="Training (epoch 14/50)" />
              <ProgressBar value={62} tone="success" showLabel="Upload" />
              <ProgressBar value={92} tone="brand" showLabel="Render" />
              <ProgressBar value={100} tone="success" showLabel="Complete" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>SPINNERS</div>
            <Row gap={20}>
              <Loader2 style={{ width: 16, height: 16, color: "var(--text-muted)" }} className="animate-spin" />
              <Loader2 style={{ width: 24, height: 24, color: "var(--brand-500, #a78bfa)" }} className="animate-spin" />
              <Loader2 style={{ width: 36, height: 36, color: "var(--success)" }} className="animate-spin" />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</span>
            </Row>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>SKELETONS</div>
            <Surface w={420}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <Skeleton w={44} h={44} radius={999} />
                <div style={{ flex: 1 }}>
                  <Skeleton w="60%" h={12} />
                  <div style={{ height: 6 }} />
                  <Skeleton w="35%" h={10} />
                </div>
              </div>
              <Skeleton w="100%" h={140} radius={8} />
              <div style={{ height: 12 }} />
              <Skeleton w="90%" h={11} />
              <div style={{ height: 6 }} />
              <Skeleton w="70%" h={11} />
            </Surface>
          </div>
        </Col>
      </Section>

      {/* EMPTY / ERROR / SUCCESS STATES */}
      <Section title="19 · Empty, error, success states">
        <Row gap={16} wrap align="stretch">
          {[
            {
              tone: "muted", icon: <Folder style={{ width: 22, height: 22 }} />,
              title: "No generations yet", body: "Pick a model, write a prompt, and your work will appear here.", cta: "Generate something",
            },
            {
              tone: "danger", icon: <CircleAlert style={{ width: 22, height: 22, color: "var(--danger)" }} />,
              title: "Couldn't load models", body: "We couldn't reach the model service. Retry, or check status.", cta: "Retry",
            },
            {
              tone: "success", icon: <CheckCircle2 style={{ width: 22, height: 22, color: "var(--success)" }} />,
              title: "All caught up", body: "You've reviewed every flagged item — nice work!", cta: "Back to dashboard",
            },
          ].map((e, i) => (
            <Surface key={i} w={300} padding={24} style={{ textAlign: "center" }}>
              <div style={{
                margin: "0 auto 14px", width: 56, height: 56, borderRadius: 999,
                background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)",
              }}>{e.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{e.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14 }}>{e.body}</div>
              <Btn variant={e.tone === "danger" ? "danger" : e.tone === "success" ? "success" : "secondary"} size="sm">{e.cta}</Btn>
            </Surface>
          ))}
        </Row>
      </Section>

      {/* CUSTOM: Generation card */}
      <Section title="20 · Generation card" subtitle="ModelClone-specific: completed, processing, failed, queued">
        <Row gap={14} wrap align="stretch">
          {[
            { status: "completed", img: "https://picsum.photos/seed/g1/360/640", label: "Aurora · portrait", time: "2m", credits: 50 },
            { status: "processing", img: "https://picsum.photos/seed/g2/360/640", label: "Mira · NSFW", time: "queued", credits: 80, progress: 64 },
            { status: "failed", img: null, label: "Sienna · video", time: "1h", credits: 195, error: "model returned 502" },
            { status: "queued", img: null, label: "Aurora · upscale", time: "now", credits: 25, queuePosition: 3 },
          ].map((g, i) => (
            <Surface key={i} w={210} padding={0} style={{ overflow: "hidden" }}>
              <div style={{
                aspectRatio: "9 / 16", width: "100%", position: "relative",
                background: g.img
                  ? `center/cover no-repeat url('${g.img}')`
                  : "linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {g.status === "processing" && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 12, background: "linear-gradient(to top, rgba(0,0,0,.6), transparent 60%)" }}>
                    <ProgressBar value={g.progress} tone="brand" />
                  </div>
                )}
                {g.status === "failed" && <XCircle style={{ width: 30, height: 30, color: "var(--danger)" }} />}
                {g.status === "queued" && (
                  <Col gap={6}>
                    <Clock style={{ width: 24, height: 24, color: "var(--text-muted)", margin: "0 auto" }} />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>queue #{g.queuePosition}</span>
                  </Col>
                )}
                <div style={{ position: "absolute", top: 8, left: 8 }}>
                  <Pill tone={
                    g.status === "completed" ? "success"
                      : g.status === "processing" ? "info"
                      : g.status === "failed" ? "danger"
                      : "neutral"
                  }>{g.status}</Pill>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.label}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{g.time}</span>
                  <span>{g.credits} cr</span>
                </div>
                {g.error && <div style={{ marginTop: 6, fontSize: 11, color: "var(--danger)" }}>{g.error}</div>}
              </div>
            </Surface>
          ))}
        </Row>
      </Section>

      {/* CUSTOM: Model card */}
      <Section title="21 · Model card" subtitle="Training, ready, error">
        <Row gap={14} wrap align="stretch">
          {[
            { name: "Aurora", tier: "Pro", status: "ready", img: "https://picsum.photos/seed/aurora/180/240" },
            { name: "Sienna", tier: "Ultra", status: "training", img: "https://picsum.photos/seed/sienna/180/240", progress: 62 },
            { name: "Riley", tier: "Standard", status: "error", img: null, error: "training failed at epoch 38" },
          ].map((m) => (
            <Surface key={m.name} w={240} padding={0} style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 12, padding: 12 }}>
                <div style={{
                  width: 56, height: 72, borderRadius: 8,
                  background: m.img
                    ? `center/cover no-repeat url('${m.img}')`
                    : "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {!m.img && <User style={{ width: 22, height: 22, color: "var(--text-muted)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <Pill tone="brand">{m.tier}</Pill>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {m.status === "ready" ? "Trained · ready to generate"
                      : m.status === "training" ? `Training · ${m.progress}%`
                      : m.error}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {m.status === "training" && <ProgressBar value={m.progress} tone="brand" />}
                    {m.status === "ready" && <Btn size="sm" icon={<Play style={{ width: 12, height: 12 }} />}>Use</Btn>}
                    {m.status === "error" && <Btn size="sm" variant="danger" icon={<RefreshCw style={{ width: 12, height: 12 }} />}>Retry</Btn>}
                  </div>
                </div>
              </div>
            </Surface>
          ))}
        </Row>
      </Section>

      {/* CUSTOM: Upload zone */}
      <Section title="22 · Upload zones" subtitle="Idle, dragging, uploading, success, error">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {[
            { state: "idle", title: "Drop images here", body: "or click to browse" },
            { state: "dragging", title: "Release to upload", body: "JPEG / PNG / WEBP up to 20MB" },
            { state: "uploading", title: "Uploading…", body: "12 of 25 files", progress: 48 },
            { state: "success", title: "Upload complete", body: "25 of 25 files" },
            { state: "error", title: "Upload failed", body: "3 files exceeded the 20MB limit" },
          ].map((u, i) => {
            const isActive = u.state === "dragging";
            const isError = u.state === "error";
            const isSuccess = u.state === "success";
            return (
              <div key={i} style={{
                padding: 24, borderRadius: 12, textAlign: "center",
                border: `2px dashed ${
                  isActive ? "var(--brand-500, #a78bfa)" :
                  isError ? "color-mix(in srgb, var(--danger) 70%, transparent)" :
                  isSuccess ? "color-mix(in srgb, var(--success) 70%, transparent)" :
                  "var(--border-medium)"
                }`,
                background: isActive ? "color-mix(in srgb, var(--brand-500, #a78bfa) 8%, transparent)"
                  : isError ? "color-mix(in srgb, var(--danger) 5%, transparent)"
                  : isSuccess ? "color-mix(in srgb, var(--success) 5%, transparent)"
                  : "var(--bg-elevated)",
              }}>
                {u.state === "uploading" ? (
                  <Loader2 style={{ width: 28, height: 28, color: "var(--brand-500, #a78bfa)", margin: "0 auto" }} className="animate-spin" />
                ) : u.state === "success" ? (
                  <CheckCircle2 style={{ width: 28, height: 28, color: "var(--success)", margin: "0 auto" }} />
                ) : u.state === "error" ? (
                  <AlertCircle style={{ width: 28, height: 28, color: "var(--danger)", margin: "0 auto" }} />
                ) : (
                  <Upload style={{ width: 28, height: 28, color: "var(--text-muted)", margin: "0 auto" }} />
                )}
                <div style={{ fontWeight: 600, marginTop: 8 }}>{u.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{u.body}</div>
                {u.progress != null && <div style={{ marginTop: 10 }}><ProgressBar value={u.progress} /></div>}
              </div>
            );
          })}
        </div>
      </Section>

      {/* TOOLTIP / POPOVER */}
      <Section title="23 · Tooltip & popover (open)">
        <Row gap={40} align="flex-end">
          <Demo label="tooltip — top">
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", padding: "6px 10px", background: "var(--text-primary)", color: "var(--bg-elevated)", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
                Save this generation
                <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid var(--text-primary)" }} />
              </div>
              <Btn icon={<Heart style={{ width: 14, height: 14 }} />} size="sm" variant="ghost">Save</Btn>
            </div>
          </Demo>
          <Demo label="popover — bottom (open)" w={300}>
            <div style={{ position: "relative" }}>
              <Btn variant="secondary" size="sm" iconRight={<ChevronDown style={{ width: 14, height: 14 }} />}>Filter</Btn>
              <Surface w={280} padding={14} style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 2 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>FILTER</div>
                <Col gap={8}>
                  <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center" }}>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" defaultChecked /> Completed
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>124</span>
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center" }}>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" /> Processing
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>3</span>
                  </label>
                  <label style={{ display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center" }}>
                    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" /> Failed
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>7</span>
                  </label>
                </Col>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 12 }}>
                  <Btn variant="ghost" size="sm">Clear</Btn>
                  <Btn size="sm">Apply</Btn>
                </div>
              </Surface>
            </div>
          </Demo>
        </Row>
      </Section>

      {/* SIDEBAR NAV */}
      <Section title="24 · Sidebar navigation" subtitle="With active, hover, badge">
        <Surface w={260} padding={10}>
          <Col gap={2}>
            {[
              { label: "Dashboard", icon: HomeIcon, active: true },
              { label: "Models", icon: Cpu, badge: 3 },
              { label: "Generations", icon: ImageIcon, badge: 12 },
              { label: "NSFW Studio", icon: Sparkles, hover: true },
              { label: "Flows", icon: Layers },
              { label: "Reels", icon: Play },
              { label: "Voice Studio", icon: Bell },
              { divider: true },
              { label: "Billing", icon: FileText },
              { label: "Settings", icon: Settings },
            ].map((it, i) => it.divider ? (
              <div key={i} style={{ height: 1, background: "var(--border-subtle)", margin: "6px 0" }} />
            ) : (
              <div
                key={it.label}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                  background: it.active
                    ? "color-mix(in srgb, var(--brand-500, #a78bfa) 14%, transparent)"
                    : it.hover ? "var(--bg-surface)" : "transparent",
                  color: it.active ? "var(--brand-500, #a78bfa)" : "var(--text-primary)",
                  fontWeight: it.active ? 600 : 500, fontSize: 13,
                }}
              >
                <it.icon style={{ width: 14, height: 14 }} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                    background: "var(--bg-surface)", border: "1px solid var(--border-medium)",
                    color: "var(--text-muted)",
                  }}>{it.badge}</span>
                )}
              </div>
            ))}
          </Col>
        </Surface>
      </Section>

      {/* GALLERY GRID */}
      <Section title="25 · Gallery grid" subtitle="Hover overlays, selection">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: "1", position: "relative", borderRadius: 8, overflow: "hidden",
              background: `center/cover no-repeat url('https://picsum.photos/seed/grid${i}/220/220')`,
              outline: i === 0 ? "2px solid var(--brand-500, #a78bfa)" : "none",
              outlineOffset: 1,
            }}>
              {i === 0 && (
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  width: 18, height: 18, borderRadius: 999,
                  background: "var(--brand-500, #a78bfa)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Check style={{ width: 12, height: 12 }} />
                </span>
              )}
              {i === 3 && (
                <div style={{
                  position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.65) 0%, transparent 50%)",
                  display: "flex", alignItems: "flex-end", padding: 8,
                }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{
                      width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,.18)", border: "none",
                      backdropFilter: "blur(4px)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    }}><Eye style={{ width: 14, height: 14 }} /></button>
                    <button style={{
                      width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,.18)", border: "none",
                      backdropFilter: "blur(4px)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    }}><Download style={{ width: 14, height: 14 }} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* PRICING CARD */}
      <Section title="26 · Pricing cards" subtitle="Default + popular variant">
        <Row gap={16} wrap align="stretch">
          {[
            { name: "Starter", price: "$9", period: "/mo", features: ["1,000 credits/mo", "Standard models", "Email support"] },
            { name: "Creator", price: "$29", period: "/mo", popular: true, features: ["5,000 credits/mo", "Pro models + LoRA", "Priority support", "Commercial use"] },
            { name: "Studio", price: "$99", period: "/mo", features: ["20,000 credits/mo", "Ultra models + Flows", "Dedicated support", "Team seats", "API access"] },
          ].map((p) => (
            <div
              key={p.name}
              style={{
                width: 260, padding: 22, borderRadius: 14, position: "relative",
                background: p.popular
                  ? "color-mix(in srgb, var(--brand-500, #a78bfa) 10%, var(--bg-elevated))"
                  : "var(--bg-elevated)",
                border: p.popular
                  ? "1.5px solid var(--brand-500, #a78bfa)"
                  : "1px solid var(--border-medium)",
                boxShadow: p.popular ? "0 14px 40px color-mix(in srgb, var(--brand-500, #a78bfa) 22%, transparent)" : "0 8px 24px var(--shadow-ambient)",
              }}
            >
              {p.popular && (
                <span style={{
                  position: "absolute", top: -10, right: 16,
                  padding: "3px 10px", borderRadius: 999,
                  background: "var(--brand-500, #a78bfa)", color: "#fff",
                  fontSize: 11, fontWeight: 700,
                }}>Most popular</span>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.name}</div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>{p.price}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{p.period}</span>
              </div>
              <div style={{ height: 14 }} />
              <Btn variant={p.popular ? "primary" : "secondary"} style={{ width: "100%", justifyContent: "center" }}>Get started</Btn>
              <div style={{ height: 18 }} />
              <Col gap={8}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <Check style={{ width: 14, height: 14, color: "var(--success)" }} />
                    <span>{f}</span>
                  </div>
                ))}
              </Col>
            </div>
          ))}
        </Row>
      </Section>

      {/* FOOTER */}
      <Section title="27 · Footer pattern">
        <Surface padding={20}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 18 }}>
            <div>
              <BrandMark />
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, maxWidth: 260 }}>
                AI-generated images, video and voice for creators. Train your own model in minutes.
              </div>
            </div>
            {[
              { title: "Product", items: ["Models", "NSFW Studio", "Flows", "Pricing"] },
              { title: "Company", items: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", items: ["Terms", "Privacy", "Cookies", "DPA"] },
            ].map((g) => (
              <Col key={g.title} gap={6}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{g.title}</div>
                {g.items.map((it) => (
                  <a key={it} style={{ fontSize: 13, color: "var(--text-primary)", textDecoration: "none" }} href="#">{it}</a>
                ))}
              </Col>
            ))}
          </div>
        </Surface>
      </Section>

      {/* End footer note */}
      <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
        ModelClone — design system reference (rendered in <strong style={{ color: "var(--text-primary)" }}>{theme}</strong> mode) · 27 sections, ~120 components
      </div>
    </div>
  );
}

// ── small style util ─────────────────────────────────────────────────────────
function pgBtn(active, disabled) {
  return {
    width: 32, height: 32, borderRadius: 8,
    background: active ? "var(--brand-500, #a78bfa)" : "var(--bg-surface)",
    color: active ? "#fff" : "var(--text-primary)",
    border: active ? "none" : "1px solid var(--border-medium)",
    fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };
}
