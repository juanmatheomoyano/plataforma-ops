import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const GRUPOS = [
  "Tarjetas en 1 pago",
  "Tarjetas en 6 cuotas",
  "Tarjetas en 9 cuotas",
  "Tarjetas en 12 cuotas",
  "Tarjetas en 18 cuotas",
  "Tarjetas en 24 cuotas",
]

const ESTADO_STYLE = {
  "Ok (vigente)":    { bg: "bg-emerald-900/40 text-emerald-300 border-emerald-700",  dot: "bg-emerald-400" },
  "Ok (programado)": { bg: "bg-blue-900/40 text-blue-300 border-blue-700",           dot: "bg-blue-400" },
  "Ok (inactiva)":   { bg: "bg-slate-800 text-slate-400 border-slate-600",           dot: "bg-slate-500" },
  "A corregir":      { bg: "bg-red-900/40 text-red-300 border-red-700",              dot: "bg-red-400" },
  "No configurado":  { bg: "bg-slate-900 text-slate-600 border-slate-700",           dot: "bg-slate-700" },
}

function EstadoCell({ estado }) {
  const style = ESTADO_STYLE[estado] || ESTADO_STYLE["No configurado"]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {estado || "No configurado"}
    </span>
  )
}

function MotivosRow({ motivos, colSpan }) {
  if (!motivos || motivos.length === 0) return null
  return (
    <tr className="border-b border-slate-700/30 bg-red-950/20">
      <td colSpan={colSpan} className="px-4 py-2">
        <ul className="space-y-0.5">
          {motivos.map((m, i) => (
            <li key={i} className="text-xs text-red-300/80">
              <span className="text-red-500 mr-1">•</span>{m}
            </li>
          ))}
        </ul>
      </td>
    </tr>
  )
}

export function DashboardTable({ dashboard }) {
  const [expandedSeller, setExpandedSeller] = useState(null)
  const [filterEstado, setFilterEstado] = useState("")

  if (!dashboard || dashboard.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">Sin datos de dashboard</p>
    )
  }

  // Count totals per estado across all sellers x groups
  const stats = { "Ok (vigente)": 0, "Ok (programado)": 0, "Ok (inactiva)": 0, "A corregir": 0, "No configurado": 0 }
  for (const d of dashboard) {
    for (const g of GRUPOS) {
      const estado = d.grupos?.[g]?.estado || "No configurado"
      if (estado in stats) stats[estado]++
    }
  }

  const filtered = filterEstado
    ? dashboard.filter((d) =>
        GRUPOS.some((g) => (d.grupos?.[g]?.estado || "No configurado") === filterEstado)
      )
    : dashboard

  const allMotivos = (d) =>
    GRUPOS.flatMap((g) => d.grupos?.[g]?.motivos || [])

  return (
    <div className="space-y-3">
      {/* Legend + filter */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(stats).map(([estado, count]) => {
          const style = ESTADO_STYLE[estado] || ESTADO_STYLE["No configurado"]
          const active = filterEstado === estado
          return (
            <button
              key={estado}
              onClick={() => setFilterEstado(active ? "" : estado)}
              className={[
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? style.bg : "border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-700",
              ].join(" ")}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {estado} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
        {filterEstado && (
          <button
            onClick={() => setFilterEstado("")}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                Seller
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Activas
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Max cuotas
              </th>
              {GRUPOS.map((g) => (
                <th key={g} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  {g.replace("Tarjetas en ", "")}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const motivos = allMotivos(d)
              const hasMotivos = motivos.length > 0
              const isExpanded = expandedSeller === d.seller_id
              return (
                <>
                  <tr
                    key={d.seller_id}
                    className="border-b border-slate-700/40 transition-colors hover:bg-slate-700/20"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-slate-200">{d.seller_id}</span>
                        {d.seller_name !== d.seller_id && (
                          <span className="text-xs text-slate-500 truncate max-w-[180px]">{d.seller_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-300">{d.totales}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-300">{d.activas}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-300">
                      {d.max_cuotas_activas > 0 ? d.max_cuotas_activas : <span className="text-slate-600">—</span>}
                    </td>
                    {GRUPOS.map((g) => (
                      <td key={g} className="px-3 py-2.5 text-center">
                        <EstadoCell estado={d.grupos?.[g]?.estado || "No configurado"} />
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-center">
                      {hasMotivos && (
                        <button
                          onClick={() => setExpandedSeller(isExpanded ? null : d.seller_id)}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                          title={isExpanded ? "Ocultar motivos" : "Ver motivos"}
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasMotivos && (
                    <MotivosRow motivos={motivos} colSpan={GRUPOS.length + 5} />
                  )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={GRUPOS.length + 5} className="py-10 text-center text-sm text-slate-500">
                  Sin resultados para el filtro seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600">
        {filtered.length} de {dashboard.length} seller{dashboard.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}
