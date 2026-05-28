import { useState } from "react"

const ESTADO_ROW = {
  "Ok":             "bg-emerald-950/50 hover:bg-emerald-950/70",
  "A corregir":     "bg-red-950/40 hover:bg-red-950/60",
  "No configurado": "hover:bg-slate-700/20",
  "Error":          "bg-amber-950/30 hover:bg-amber-950/50",
}

const ESTADO_BADGE = {
  "Ok":             "bg-emerald-900/60 text-emerald-300 border-emerald-700",
  "A corregir":     "bg-red-900/60 text-red-300 border-red-700",
  "No configurado": "bg-slate-800 text-slate-500 border-slate-600",
  "Error":          "bg-amber-900/60 text-amber-300 border-amber-700",
}

const FILTER_CHIP = {
  "Ok":             { active: "bg-emerald-900/60 text-emerald-300 border-emerald-700", dot: "bg-emerald-400" },
  "A corregir":     { active: "bg-red-900/60 text-red-300 border-red-700",             dot: "bg-red-400" },
  "No configurado": { active: "bg-slate-800 text-slate-400 border-slate-600",          dot: "bg-slate-500" },
}

export function EventoResultsTable({ results }) {
  const [filterEstado, setFilterEstado] = useState("")

  if (!results || results.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">Sin resultados</p>
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
      {/* Summary filter chips */}
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
                active ? (style.active || "") : "border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-700",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot || "bg-slate-500"}`} />
              {estado} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
        {filterEstado && (
          <button onClick={() => setFilterEstado("")} className="text-xs text-slate-500 hover:text-slate-300 underline">
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Seller</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Qué corregir</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Reglas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const rowBg = ESTADO_ROW[r.estado_general] || "hover:bg-slate-700/20"
              const badgeCls = ESTADO_BADGE[r.estado_general] || ESTADO_BADGE["No configurado"]
              const showMotivos = r.estado_general === "A corregir" && r.motivos?.length > 0
              return (
                <tr key={r.seller_id} className={`border-b border-slate-700/40 transition-colors ${rowBg}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-slate-200">{r.seller_id}</span>
                      {r.seller_name !== r.seller_id && (
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{r.seller_name}</span>
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
                          <li key={i} className="text-xs text-red-300/90">
                            <span className="text-red-500 mr-1">•</span>{m}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-slate-400">
                    {r.total_rules_evento || <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                  Sin resultados para el filtro seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">{filtered.length} de {results.length} sellers</p>
    </div>
  )
}
