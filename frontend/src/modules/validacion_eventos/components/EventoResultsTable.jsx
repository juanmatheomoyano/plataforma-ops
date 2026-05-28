import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const ESTADO_STYLE = {
  "Ok":              { bg: "bg-emerald-900/40 text-emerald-300 border-emerald-700", dot: "bg-emerald-400" },
  "A corregir":      { bg: "bg-red-900/40 text-red-300 border-red-700",             dot: "bg-red-400" },
  "No configurado":  { bg: "bg-slate-900 text-slate-600 border-slate-700",          dot: "bg-slate-700" },
  "Error":           { bg: "bg-amber-900/40 text-amber-300 border-amber-700",       dot: "bg-amber-400" },
}

function EstadoChip({ estado }) {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE["Error"]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {estado}
    </span>
  )
}

export function EventoResultsTable({ results, eventoNombre }) {
  const [expanded, setExpanded] = useState(null)
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
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats).map(([estado, count]) => {
          const s = ESTADO_STYLE[estado] || {}
          const active = filterEstado === estado
          return (
            <button
              key={estado}
              onClick={() => setFilterEstado(active ? "" : estado)}
              className={[
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? (s.bg || "") : "border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-700",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot || "bg-slate-500"}`} />
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
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Reglas evento</th>
              <th className="px-2 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const hasMotivos = r.motivos?.length > 0
              const isExpanded = expanded === r.seller_id
              return (
                <>
                  <tr key={r.seller_id} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-slate-200">{r.seller_id}</span>
                        {r.seller_name !== r.seller_id && (
                          <span className="text-xs text-slate-500 truncate max-w-[200px]">{r.seller_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <EstadoChip estado={r.estado_general} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400">
                      {r.total_rules_evento || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {hasMotivos && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : r.seller_id)}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasMotivos && (
                    <tr key={`${r.seller_id}-motivos`} className="border-b border-slate-700/30 bg-red-950/20">
                      <td colSpan={4} className="px-4 py-2">
                        <ul className="space-y-0.5">
                          {r.motivos.map((m, i) => (
                            <li key={i} className="text-xs text-red-300/80">
                              <span className="text-red-500 mr-1">•</span>{m}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </>
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
