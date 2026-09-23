/**
 * Provincia Ops · Modelo A "Escudo"
 * Wordmark completo con monograma PO. Se adapta a tema claro/oscuro.
 *
 * Variantes:
 *   variant="wordmark" (default) — monograma + "Provincia Ops"
 *   variant="mark"                — solo monograma PO
 *   variant="stacked"             — monograma + wordmark + tagline debajo
 *
 * Props:
 *   size: "sm" | "md" | "lg" | "xl"  → controla la escala global
 *   tagline: bool                     → muestra "OPERACIONES ECOMMERCE" (solo stacked)
 *   inverted: bool                    → fuerza colores oscuros (para uso sobre fondo claro
 *                                       incluso cuando el dark mode global está activo)
 */

const SIZES = {
  sm: { icon: 28, radius: 8, mono: 13, word: 18 },
  md: { icon: 36, radius: 10, mono: 16, word: 22 },
  lg: { icon: 52, radius: 14, mono: 22, word: 30 },
  xl: { icon: 84, radius: 22, mono: 34, word: 48 },
}

/**
 * theme:
 *   "auto"    → sigue dark mode global (light: tinta / dark: bg claro)
 *   "on-dark" → siempre claro (uso sobre fondos oscuros: sidebar, hero, login)
 *   "on-light"→ siempre oscuro (uso sobre fondos claros)
 */
export function Logo({
  variant = "wordmark",
  size = "md",
  tagline = false,
  theme = "auto",
  className = "",
}) {
  const s = SIZES[size] ?? SIZES.md

  const wordCls =
    theme === "on-dark"
      ? "text-brand-bg"
      : theme === "on-light"
      ? "text-brand-ink"
      : "text-brand-ink dark:text-brand-bg"

  const accentCls =
    theme === "on-dark"
      ? "text-brand-cyan-light"
      : theme === "on-light"
      ? "text-brand-cyan"
      : "text-brand-cyan dark:text-brand-cyan-light"

  const taglineCls =
    theme === "on-dark"
      ? "text-brand-slate-light"
      : theme === "on-light"
      ? "text-brand-slate"
      : "text-brand-slate dark:text-brand-slate-light"

  return (
    <div
      className={[
        "inline-flex items-center gap-3 select-none",
        variant === "stacked" ? "flex-col items-start gap-2" : "",
        className,
      ].join(" ")}
    >
      <ProvinciaMark size={s.icon} radius={s.radius} monoSize={s.mono} />

      {variant !== "mark" && (
        <div className="flex flex-col leading-none">
          <span
            className={[
              "font-display font-extrabold tracking-tightest leading-none",
              wordCls,
            ].join(" ")}
            style={{ fontSize: `${s.word}px` }}
          >
            Provincia<span className={accentCls}> Ops</span>
          </span>

          {tagline && (
            <span
              className={["eyebrow mt-2", taglineCls].join(" ")}
              style={{ letterSpacing: "0.22em" }}
            >
              Operaciones ecommerce
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/** Solo el escudo verde con "PO" — reusable para avatares/sidebar collapsed */
export function ProvinciaMark({ size = 40, radius = 10, monoSize = 15 }) {
  const inset = 1
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Provincia Ops"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={`po-grad-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26B554" />
          <stop offset="100%" stopColor="#1F9E48" />
        </linearGradient>
      </defs>
      <rect
        x={inset}
        y={inset}
        width={size - inset * 2}
        height={size - inset * 2}
        rx={radius}
        fill={`url(#po-grad-${size})`}
      />
      {/* Inner highlight sutil — le da profundidad sin verse "chunky" */}
      <rect
        x={inset}
        y={inset}
        width={size - inset * 2}
        height={size - inset * 2}
        rx={radius}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
      <text
        x="50%"
        y="50%"
        dy="0.06em"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans','Encode Sans',system-ui,sans-serif"
        fontWeight="800"
        fontSize={monoSize}
        letterSpacing="-1"
      >
        PO
      </text>
    </svg>
  )
}
