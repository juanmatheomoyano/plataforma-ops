import { useState } from "react"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"

const GRUPOS = [
  "Tarjetas en 1 pago",
  "Tarjetas en 6 cuotas",
  "Tarjetas en 9 cuotas",
  "Tarjetas en 12 cuotas",
  "Tarjetas en 18 cuotas",
  "Tarjetas en 24 cuotas",
]

const ESTADO_CELL = {
  "Ok (vigente)":    { td: "bg-emerald-50 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300", label: "Ok" },
  "Ok (programado)": { td: "bg-blue-50 dark:bg-blue-900/50",       text: "text-blue-700 dark:text-blue-300",       label: "Prog." },
  "Ok (inactiva)":   { td: "bg-muted/40 dark:bg-slate-700/40",     text: "text-muted-foreground dark:text-slate-400", label: "Inact." },
  "A corregir":      { td: "bg-red-50 dark:bg-red-900/50",         text: "text-red-700 dark:text-red-300",         label: "✗" },
  "No configurado":  { td: "",                                      text: "text-muted-foreground/60",               label: "—" },
}

const FILTER_CHIP = {
  "Ok (vigente)":    { active: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700", dot: "bg-emerald-500 dark:bg-emerald-400" },
  "Ok (programado)": { active: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-700",                   dot: "bg-blue-500 dark:bg-blue-400" },
  "Ok (inactiva)":   { active: "bg-muted text-muted-foreground border-border",                                                                            dot: "bg-muted-foreground" },
  "A corregir":      { active: "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/60 dark:text-red-300 dark:border-red-700",                         dot: "bg-red-500 dark:bg-red-400" },
  "No configurado":  { active: "bg-muted text-muted-foreground border-border",                                                                            dot: "bg-muted-foreground" },
}

function MotivosRow({ motivos, colSpan }) {
  if (!motivos || motivos.length === 0) return null
  return (
    <tr className="border-b border-border/30 bg-red-50 dark:bg-red-950/20">
      <td colSpan={colSpan} className="px-4 py-2">
        <ul className="space-y-0.5">
          {motivos.map((m, i) => (
            <li key={i} className="text-xs text-red-600 dark:text-red-300/80">
              <span className="text-red-500 mr-1">•</span>{m}
            </li>
          ))}
        </ul>
      </td>
    </tr>
  )
}

const EVENTO_CELL = {
  "Ok":             { td: "bg-emerald-50 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300", label: "Ok" },
  "A corregir":     { td: "bg-red-50 dark:bg-red-900/50",         text: "text-red-700 dark:text-red-300",         label: "✗" },
  "No configurado": { td: "",                                      text: "text-muted-foreground/60",               label: "—" },
  "Error":          { td: "bg-amber-50 dark:bg-amber-900/40",     text: "text-amber-700 dark:text-amber-300",     label: "!" },
}

export function DashboardTable({ dashboard, grupos = GRUPOS, eventoColumns = [], loadingEventos = false }) {
  const [expandedSeller, setExpandedSeller] = useState(null)
  const [filterEstado, setFilterEstado] = useState("")

  if (!dashboard || dashboard.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">Sin datos de dashboard</p>
    )
  }

  const stats = { "Ok (vigente)": 0, "Ok (programado)": 0, "Ok (inactiva)": 0, "A corregir": 0, "No configurado": 0 }
  for (const d of dashboard) {
    for (const g of grupos) {
      const estado = d.grupos?.[g]?.estado || "No configurado"
      if (estado in stats) stats[estado]++
    }
  }

  const filtered = filterEstado
    ? dashboard.filter((d) =>
        grupos.some((g) => (d.grupos?.[g]?.estado || "No configurado") === filterEstado)
      )
    : dashboard

  const allMotivos = (d) =>
    grupos.flatMap((g) => d.grupos?.[g]?.motivos || [])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(stats).map(([estado, count]) => {
          const style = FILTER_CHIP[estado] || FILTER_CHIP["No configurado"]
          const active = filterEstado === estado
          return (
            <button
              key={estado}
              onClick={() => setFilterEstado(active ? "" : estado)}
              className={[
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active ? style.active : "border-border bg-muted/60 text-muted-foreground hover:bg-accent",
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
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Seller
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Activas
              </th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Max cuotas
              </th>
              {grupos.map((g) => (
                <th key={g} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {g.replace("Tarjetas en ", "")}
                </th>
              ))}
              {loadingEventos && (
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                </th>
              )}
              {eventoColumns.map(({ evento }) => (
                <th key={evento.id} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-primary/80 whitespace-nowrap border-l border-primary/20 bg-primary/5">
                  {evento.nombre}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8" />
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
                    className="border-b border-border/40 transition-colors hover:brightness-[0.97] dark:hover:brightness-110"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-foreground">{d.seller_id}</span>
                        {d.seller_name !== d.seller_id && (
                          <span className="text-xs text-muted-foreground truncate max-w-[180px]">{d.seller_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-foreground/80">{d.totales}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-foreground/80">{d.activas}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-foreground/80">
                      {d.max_cuotas_activas > 0 ? d.max_cuotas_activas : <span className="text-muted-foreground">—</span>}
                    </td>
                    {grupos.map((g) => {
                      const estado = d.grupos?.[g]?.estado || "No configurado"
                      const style = ESTADO_CELL[estado] || ESTADO_CELL["No configurado"]
                      return (
                        <td key={g} className={`px-3 py-2.5 text-center text-xs font-medium ${style.td} ${style.text}`}>
                          {style.label}
                        </td>
                      )
                    })}
                    {loadingEventos && (
                      <td className="px-3 py-2.5 text-center text-muted-foreground/40">…</td>
                    )}
                    {eventoColumns.map(({ evento, resultMap }) => {
                      const estado = resultMap[d.seller_id] || "No configurado"
                      const style = EVENTO_CELL[estado] || EVENTO_CELL["No configurado"]
                      return (
                        <td key={evento.id} className={`px-3 py-2.5 text-center text-xs font-medium border-l border-primary/10 ${style.td} ${style.text}`}>
                          {style.label}
                        </td>
                      )
                    })}
                    <td className="px-2 py-2.5 text-center">
                      {hasMotivos && (
                        <button
                          onClick={() => setExpandedSeller(isExpanded ? null : d.seller_id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={isExpanded ? "Ocultar motivos" : "Ver motivos"}
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasMotivos && (
                    <MotivosRow motivos={motivos} colSpan={GRUPOS.length + 5 + eventoColumns.length + (loadingEventos ? 1 : 0)} />
                  )}
                </>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={GRUPOS.length + 5 + eventoColumns.length} className="py-10 text-center text-sm text-muted-foreground">
                  Sin resultados para el filtro seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} de {dashboard.length} seller{dashboard.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}
