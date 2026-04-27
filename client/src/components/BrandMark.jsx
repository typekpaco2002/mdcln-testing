import { useBranding } from "../hooks/useBranding";

/**
 * Built-in geometric brand mark. Used across the app shell when a custom
 * `branding.logoUrl` is not set or the user wants a consistent in-app icon.
 *
 * The mark is a stacked monogram in precise geometry — reads as ModelClone's
 * "MC" at any size, matches the Linear-style rail aesthetic, and works on
 * both dark and light surfaces via `currentColor`.
 */
export default function BrandMark({
  size = 36,
  className = "",
  title = "ModelClone",
  // Force drawing the built-in mark even if branding.logoUrl is set
  forceSvg = false,
  // When true, render only the glyph (no surrounding square)
  glyphOnly = false,
}) {
  const branding = useBranding();
  const url = !forceSvg ? String(branding?.logoUrl || "").trim() : "";

  if (url) {
    return (
      <img
        src={url}
        alt={branding?.appName || title}
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          objectFit: "contain",
        }}
      />
    );
  }

  if (glyphOnly) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label={title}
      >
        <BrandGlyph />
      </svg>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: 10,
        background:
          "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
        color: "var(--accent-foreground)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
      }}
      role="img"
      aria-label={title}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <BrandGlyph />
      </svg>
    </span>
  );
}

function BrandGlyph() {
  return (
    <>
      <path
        d="M6 24V8l10 10L26 8v16"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="24" r="1.25" fill="currentColor" />
    </>
  );
}
