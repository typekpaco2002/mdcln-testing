// Aurora glass primitives — opt-in components that compose the new aesthetic.
// All accept `as` for polymorphic rendering and pass extra props through.
// Designed to be used directly in pages OR as building blocks for richer comps.
//
// See client/src/index.css "AURORA" section for the underlying tokens/classes.

import { forwardRef } from "react";
import { motion } from "framer-motion";

// ──────────────────────────────────────────────────────────────────────────────
// GlassPanel — translucent surface with backdrop blur.
//   <GlassPanel>...</GlassPanel>            // standard glass
//   <GlassPanel strength="strong">          // higher opacity + blur
//   <GlassPanel strength="elevated" rim>    // popovers / modals
// ──────────────────────────────────────────────────────────────────────────────

export const GlassPanel = forwardRef(function GlassPanel(
  {
    as: As = "div",
    strength = "normal",
    rim = false,
    glow = null, // null | "faint" | "medium" | "strong"
    className = "",
    children,
    style,
    ...rest
  },
  ref,
) {
  const strengthClass =
    strength === "strong" ? "glass-strong" :
    strength === "elevated" ? "glass-elevated" :
    "glass";
  const glowClass = glow ? `glow-violet${glow === "faint" ? "-faint" : glow === "strong" ? "-strong" : ""}` : "";
  return (
    <As
      ref={ref}
      className={[strengthClass, rim ? "glass-rim" : "", glowClass, "motion-spring", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      {...rest}
    >
      {children}
    </As>
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// GlassCard — GlassPanel with sane padding + lift-on-hover by default.
// ──────────────────────────────────────────────────────────────────────────────

export const GlassCard = forwardRef(function GlassCard(
  {
    as = "div",
    strength = "normal",
    rim = true,
    glow = null,
    interactive = true,
    padding = 18,
    className = "",
    style,
    children,
    ...rest
  },
  ref,
) {
  return (
    <GlassPanel
      as={as}
      strength={strength}
      rim={rim}
      glow={glow}
      ref={ref}
      className={[interactive ? "motion-lift" : "", className].filter(Boolean).join(" ")}
      style={{ padding, ...style }}
      {...rest}
    >
      {children}
    </GlassPanel>
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// GlassButton — accent / primary / outline / ghost with built-in motion.
// Variants intentionally match the existing .btn-* primitives so it slots in
// anywhere a normal button is used.
// ──────────────────────────────────────────────────────────────────────────────

const BTN_BASE = "motion-spring motion-lift motion-press inline-flex items-center justify-center gap-2 font-semibold rounded-xl";
const BTN_SIZES = {
  sm: "px-3 py-1.5 text-xs h-8",
  md: "px-4 py-2 text-sm h-10",
  lg: "px-5 py-2.5 text-base h-12",
};

export const GlassButton = forwardRef(function GlassButton(
  {
    as: As = "button",
    variant = "accent",
    size = "md",
    glow = false,
    icon,
    iconRight,
    loading = false,
    disabled = false,
    className = "",
    children,
    style,
    ...rest
  },
  ref,
) {
  const variantClass =
    variant === "primary" ? "btn-primary" :
    variant === "accent"  ? "btn-accent" :
    variant === "outline" ? "btn-outline" :
    variant === "ghost"   ? "btn-ghost" :
    "btn-accent";

  return (
    <As
      ref={ref}
      disabled={disabled || loading}
      className={[
        BTN_BASE,
        BTN_SIZES[size] || BTN_SIZES.md,
        variantClass,
        glow ? "glow-pulse" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    >
      {loading ? (
        <span className="animate-spin" style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "999px", display: "inline-block" }} />
      ) : icon}
      {children}
      {iconRight}
    </As>
  );
});

// ──────────────────────────────────────────────────────────────────────────────
// RadialGlow — positioned background blob. Place inside a relative parent.
//   <div style={{ position: 'relative' }}>
//     <RadialGlow position="top-left" intensity="medium" />
//     ...content...
//   </div>
// ──────────────────────────────────────────────────────────────────────────────

const POSITIONS = {
  "top-left":     { top: "-20%", left: "-20%", width: "70%", height: "70%" },
  "top-right":    { top: "-20%", right: "-20%", width: "70%", height: "70%" },
  "bottom-left":  { bottom: "-20%", left: "-20%", width: "70%", height: "70%" },
  "bottom-right": { bottom: "-20%", right: "-20%", width: "70%", height: "70%" },
  center:         { top: "50%", left: "50%", width: "80%", height: "80%", transform: "translate(-50%, -50%)" },
  "top-center":   { top: "-30%", left: "50%", width: "100%", height: "60%", transform: "translateX(-50%)" },
};

const INTENSITY_VAR = {
  faint:  "var(--glow-faint)",
  medium: "var(--glow-medium)",
  strong: "var(--glow-strong)",
};

export function RadialGlow({
  position = "top-left",
  intensity = "medium",
  hue,                        // optional override: "lavender" | "deep" | "indigo"
  className = "",
  style,
}) {
  const pos = POSITIONS[position] || POSITIONS["top-left"];
  const baseColor =
    hue === "lavender" ? "rgba(167, 139, 250, 0.20)" :
    hue === "deep"     ? "rgba(124, 58, 237, 0.18)" :
    hue === "indigo"   ? "rgba(99, 102, 241, 0.18)" :
    INTENSITY_VAR[intensity] || INTENSITY_VAR.medium;

  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 0,
        background: `radial-gradient(circle, ${baseColor} 0%, transparent 70%)`,
        filter: "blur(40px)",
        ...pos,
        ...style,
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FluidMotion — wraps children in a framer-motion entrance with spring physics.
// Use for page heroes, key CTAs, modal content. Falls back to no-motion for
// users with prefers-reduced-motion.
// ──────────────────────────────────────────────────────────────────────────────

export function FluidMotion({
  children,
  delay = 0,
  duration = 0.6,
  y = 16,
  scale = 1,
  className,
  ...rest
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y, scale }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // matches --ease-spring
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FluidStagger — stagger child entrance animations.
// Children should be FluidMotion or motion.* elements.
// ──────────────────────────────────────────────────────────────────────────────

export function FluidStagger({ children, stagger = 0.08, delayStart = 0, className, ...rest }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delayStart } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const fluidItem = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ──────────────────────────────────────────────────────────────────────────────
// AuroraBackdrop — full-bleed page-level violet aurora layer. Drop at the top
// of any page; sits behind everything (z-index: 0) and respects the body
// stacking context. Uses the global CSS aurora as the base; this adds page-
// specific glow accents that can be tuned per route.
// ──────────────────────────────────────────────────────────────────────────────

export function AuroraBackdrop({ variant = "default" }) {
  const variants = {
    default: (
      <>
        <RadialGlow position="top-left"  intensity="medium" hue="lavender" />
        <RadialGlow position="bottom-right" intensity="faint" hue="deep" />
      </>
    ),
    intense: (
      <>
        <RadialGlow position="top-left" intensity="strong" hue="lavender" />
        <RadialGlow position="top-right" intensity="medium" hue="deep" />
        <RadialGlow position="bottom-left" intensity="faint" hue="indigo" />
      </>
    ),
    minimal: (
      <RadialGlow position="top-center" intensity="faint" hue="lavender" />
    ),
    none: null,
  };
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {variants[variant] || variants.default}
    </div>
  );
}
