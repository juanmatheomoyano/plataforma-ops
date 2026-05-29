import { useEffect, useState } from "react"
import client from "@/core/api/client"

export const TODOS_GRUPOS = [
  { key: "Tarjetas en 1 pago",    label: "1 pago" },
  { key: "Tarjetas en 6 cuotas",  label: "6 cuotas" },
  { key: "Tarjetas en 9 cuotas",  label: "9 cuotas" },
  { key: "Tarjetas en 12 cuotas", label: "12 cuotas" },
  { key: "Tarjetas en 18 cuotas", label: "18 cuotas" },
  { key: "Tarjetas en 24 cuotas", label: "24 cuotas" },
]

export function ReadValidacionConfig({ selectedGrupos, onGruposChange, selectedEventos, onEventosChange }) {
  const [eventosDisponibles, setEventosDisponibles] = useState([])

  useEffect(() => {
    client.get("/eventos/vigentes")
      .then(({ data }) => setEventosDisponibles(data))
      .catch(() => {})
  }, [])

  function toggleGrupo(key) {
    onGruposChange(
      selectedGrupos.includes(key)
        ? selectedGrupos.filter((k) => k !== key)
        : [...selectedGrupos, key]
    )
  }

  function toggleEvento(id) {
    onEventosChange(
      selectedEventos.includes(id)
        ? selectedEventos.filter((e) => e !== id)
        : [...selectedEventos, id]
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Grupos de cuotas a mostrar
        </p>
        <div className="flex flex-wrap gap-2">
          {TODOS_GRUPOS.map(({ key, label }) => {
            const active = selectedGrupos.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleGrupo(key)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                    : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")}
              >
                {label}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() =>
              selectedGrupos.length === TODOS_GRUPOS.length
                ? onGruposChange([])
                : onGruposChange(TODOS_GRUPOS.map((g) => g.key))
            }
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            {selectedGrupos.length === TODOS_GRUPOS.length ? "Quitar todos" : "Todos"}
          </button>
        </div>
      </div>

      {eventosDisponibles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Eventos vigentes a validar
          </p>
          <div className="flex flex-wrap gap-2">
            {eventosDisponibles.map((e) => {
              const active = selectedEventos.includes(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleEvento(e.id)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600"
                      : "border-border bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                >
                  {e.nombre}
                  <span className="ml-1 opacity-60">
                    ({e.cuotas_requeridas?.[e.cuotas_requeridas.length - 1]}c)
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
