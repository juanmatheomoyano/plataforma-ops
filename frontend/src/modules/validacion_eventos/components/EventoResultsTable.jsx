import { useState } from "react"

const ESTADO_ROW = {
  "Ok":             "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/70",
  "A corregir":     "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60",
  "No configurado": "hover:bg-accent/20",
  "Error":          "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50",
}

const ESTADO_BADGE = {
  "Ok":             "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700",
  "A corregir":     "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700",
  "No configurado": "bg-muted text-muted-foreground border-border",
  "Error":          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700",
}

const FILTER_CHIP = {
  "Ok":             { active: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700", dot: "bg-emerald-500 dark:bg-emerald-400" },
  "A corregir":     { active: "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700",             dot: "bg-red-500 dark:bg-red-400" },
  "No configurado": { active: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
}

export function EventoResultsTable({ results }) {
  const [filterEstado, setFilterEstado] = useState("")

  if (!results || results.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados</p>
  }

  const stats = { Ok: 0, "A corregir": 0, "No configurado": 0 }
  for (const r of results) {
    if (r.estado_general in stats) stats[r.estado_general]++
  }

  const filtered = filterEstado
    ? results.filter((r) => r.estado_general === filterEstado)
    : results

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats).map(([estado, count]) => {
          const style = FILTER_CHIP[estado] || {}
          const active = filterEstado === estado
          return (
            <button
              key={estado}
              onClick={() => setFilterEstado(active ? "" : estado)}
              className={[
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? (style.active || "") : "border-border bg-muted/60 text-muted-foreground hover:bg-accent",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot || "bg-muted-foreground"}`} />
              {estado} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
        {filterEstado && (
          <button onClick={() => setFilterEstado("")} className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seller</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qué corregir</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reglas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const rowBg = ESTADO_ROW[r.estado_general] || "hover:bg-accent/20"
              const badgeCls = ESTADO_BADGE[r.estado_general] || ESTADO_BADGE["No configurado"]
              const showMotivos = r.estado_general === "A corregir" && r.motivos?.length > 0
              return (
                <tr key={r.seller_id} className={`border-b border-border/40 transition-colors ${rowBg}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-foreground">{r.seller_id}</span>
                      {r.seller_name !== r.seller_id && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{r.seller_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                      {r.estado_general}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {showMotivos ? (
                      <ul className="space-y-0.5">
                        {r.motivos.map((m, i) => (
                          <li key={i} className="text-xs text-red-600 dark:text-red-300/90">
                            <span className="text-red-500 mr-1">•</span>{m}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                    {r.total_rules_evento || <span className="text-muted-foreground/60">—</span>}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Sin resultados para el filtro seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {results.length} sellers</p>
    </div>
  )
}
