/**
 * Header consistente para páginas de módulo.
 *
 *  eyebrow  · ── ── ──
 *  Título grande (display font, extrabold, tracking-tightest)
 *  Subtítulo opcional
 *                                       [ acciones ]
 */
export function PageHeader({ eyebrow, title, subtitle, actions, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tightest text-foreground truncate">
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

/** Wrapper de página con max-width + padding consistente + fade-in */
export function PageContainer({ children, className = "" }) {
  return (
    <div className={`mx-auto max-w-7xl px-6 py-8 animate-fade-in ${className}`}>
      {children}
    </div>
  )
}
