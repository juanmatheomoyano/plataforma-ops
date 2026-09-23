/**
 * Header consistente para páginas de módulo.
 *
 *  eyebrow  · ── ── ──
 *  Título grande (display font, extrabold, tracking-tightest)
 *  Subtítulo opcional
 *                                       [ acciones ]
 *
 * Responsive: en pantallas chicas (<640px) el título baja de 3xl a 2xl y las
 * acciones pasan debajo del bloque de texto.
 */
export function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 sm:pb-6">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tightest text-foreground truncate sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}

/**
 * Wrapper de página con padding responsive + fade-in.
 * En chicos: padding 4 (16px), en medium+: 6 (24px), 8 vertical.
 */
export function PageContainer({ children, className = "" }) {
  return (
    <div
      className={`mx-auto max-w-7xl px-4 py-6 animate-fade-in sm:px-6 sm:py-8 ${className}`}
    >
      {children}
    </div>
  )
}
