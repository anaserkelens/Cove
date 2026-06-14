import type { CSSProperties } from "react";

/**
 * Cove brand mark — a flat-vector recreation of the official logo:
 * a soft mint app-tile holding a cream home, two teal figures, and a
 * checklist with an apricot highlight. Brand colors are fixed (not
 * theme tokens) so the mark stays recognizable in light and dark.
 */

type LogoProps = {
  /** "mark" = tile only; "full" = tile + "Cove" wordmark. */
  variant?: "mark" | "full";
  /** Rendered height of the tile in px. */
  size?: number;
  /** Unique-ish suffix for gradient ids when several logos share a page. */
  idPrefix?: string;
  className?: string;
};

export function Logo({
  variant = "full",
  size = 32,
  idPrefix = "cove",
  className,
}: LogoProps) {
  const mark = <CoveMark size={size} idPrefix={idPrefix} />;

  if (variant === "mark") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", lineHeight: 0 }}
      >
        {mark}
      </span>
    );
  }

  const wordSize = size * 0.92;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.32,
        lineHeight: 0,
      }}
    >
      {mark}
      <span
        style={
          {
            fontFamily: "var(--font-quicksand), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: wordSize,
            letterSpacing: "-0.01em",
            color: "var(--brand-ink)",
            lineHeight: 1,
            paddingBottom: size * 0.04,
          } as CSSProperties
        }
      >
        Cove
      </span>
    </span>
  );
}

function CoveMark({ size, idPrefix }: { size: number; idPrefix: string }) {
  const mint = `${idPrefix}-mint`;
  const cream = `${idPrefix}-cream`;
  const gloss = `${idPrefix}-gloss`;
  const tile = `${idPrefix}-tile`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Cove"
      style={{ display: "block", borderRadius: size * 0.25 }}
    >
      <defs>
        <linearGradient id={mint} x1="32" y1="2" x2="32" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e3f3ec" />
          <stop offset="1" stopColor="#c2e5da" />
        </linearGradient>
        <linearGradient id={cream} x1="32" y1="15" x2="32" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdf7ec" />
          <stop offset="1" stopColor="#f4ead6" />
        </linearGradient>
        <radialGradient id={gloss} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 12) rotate(48) scale(46)">
          <stop stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={tile}>
          <rect x="2" y="2" width="60" height="60" rx="16" />
        </clipPath>
      </defs>

      {/* App tile */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${mint})`} />

      <g clipPath={`url(#${tile})`}>
        {/* House frame (deeper mint) */}
        <path
          d="M11 31 L32 12 L53 31 V47 a3 3 0 0 1 -3 3 H14 a3 3 0 0 1 -3 -3 Z"
          fill="#a6dccd"
        />
        {/* Chimney */}
        <rect x="42" y="15" width="5" height="11" rx="2.2" fill="#a6dccd" />
        {/* Cream interior */}
        <path
          d="M15.5 32.2 L32 17.2 L48.5 32.2 V49 H15.5 Z"
          fill={`url(#${cream})`}
        />
        {/* Gable window */}
        <g fill="#a6dccd">
          <rect x="27.9" y="21.4" width="3.5" height="3.5" rx="1" />
          <rect x="32.6" y="21.4" width="3.5" height="3.5" rx="1" />
          <rect x="27.9" y="26.1" width="3.5" height="3.5" rx="1" />
          <rect x="32.6" y="26.1" width="3.5" height="3.5" rx="1" />
        </g>
        {/* Figures — back (lighter), then front (deeper) */}
        <circle cx="38" cy="33.2" r="4.4" fill="#77c4b4" />
        <path d="M30.5 49 C30.5 43 34 40 38.2 40 C42.4 40 46 43 46 49 Z" fill="#77c4b4" />
        <circle cx="28" cy="34" r="5.2" fill="#2c8b79" />
        <path d="M17.5 49 C17.5 42.5 22.2 39.2 28 39.2 C33.8 39.2 38.5 42.5 38.5 49 Z" fill="#2c8b79" />
        {/* Checklist card */}
        <rect x="10" y="43.6" width="44" height="14.4" rx="4" fill="#ffffff" fillOpacity="0.9" />
        {/* Check rows */}
        <circle cx="16.8" cy="48" r="2.7" fill="#2c8b79" />
        <path d="M15.5 48 L16.5 49 L18.2 47" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="16.8" cy="53.6" r="2.7" fill="#2c8b79" />
        <path d="M15.5 53.6 L16.5 54.6 L18.2 52.6" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="21.5" y="46.6" width="14" height="2.8" rx="1.4" fill="#bfe5d9" />
        <rect x="21.5" y="52.2" width="9.5" height="2.8" rx="1.4" fill="#f3bd80" />
        {/* Glossy highlight */}
        <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${gloss})`} />
      </g>
    </svg>
  );
}
