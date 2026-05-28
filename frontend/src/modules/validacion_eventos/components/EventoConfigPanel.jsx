import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CUOTAS_OPCIONES = [1, 3, 6, 9, 12, 18, 24]
const MAX_CUOTA_OPCIONES = [1, 3, 6, 9, 12, 18, 24]

export function EventoConfigPanel({ value, onChange }) {
  function set(field, val) {
    onChange({ ...value, [field]: val })
  }

  function toggleCuota(c) {
    const current = value.cuotas_requeridas || []
    const next = current.includes(c)
      ? current.filter((x) => x !== c)
      : [...current, c].sort((a, b) => a - b)
    set("cuotas_requeridas", next)
  }

  const cuotas = value.cuotas_requeridas || []
  const maxCuota = value.max_cuota

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-sm">Nombre del evento</Label>
        <Input
          value={value.nombre || ""}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Hot Sale 2026"
          className="border-slate-600 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300 text-sm">Cuotas requeridas</Label>
        <p className="text-xs text-slate-500">Las reglas deben cubrir exactamente estas cuotas</p>
        <div className="flex flex-wrap gap-2">
          {CUOTAS_OPCIONES.map((c) => {
            const selected = cuotas.includes(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCuota(c)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "border-indigo-600 bg-indigo-900/50 text-indigo-300"
                    : "border-slate-600 bg-slate-800/40 text-slate-400 hover:bg-slate-700",
                ].join(" ")}
              >
                {c === 1 ? "1 pago" : `${c} cuotas`}
              </button>
            )
          })}
        </div>
        {cuotas.length === 0 && (
          <p className="text-xs text-amber-400">Seleccioná al menos una cuota</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-300 text-sm">Máximo de cuotas</Label>
        <select
          value={maxCuota || ""}
          onChange={(e) => set("max_cuota", Number(e.target.value))}
          className="w-40 rounded-md border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:outline-none"
        >
          <option value="">Seleccioná...</option>
          {MAX_CUOTA_OPCIONES.map((c) => (
            <option key={c} value={c}>{c === 1 ? "1 pago" : `${c} cuotas`}</option>
          ))}
        </select>
        {maxCuota && cuotas.length > 0 && maxCuota < Math.max(...cuotas) && (
          <p className="text-xs text-amber-400">
            El máximo debe ser ≥ {Math.max(...cuotas)} (max de cuotas requeridas)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-sm">Inicio del evento (ART)</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={value.fecha_ini_date || ""}
              onChange={(e) => set("fecha_ini_date", e.target.value)}
              className="border-slate-600 bg-slate-800/60 text-slate-100 flex-1"
            />
            <Input
              type="time"
              value={value.fecha_ini_time || "00:00"}
              onChange={(e) => set("fecha_ini_time", e.target.value)}
              className="border-slate-600 bg-slate-800/60 text-slate-100 w-28"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-300 text-sm">Fin del evento (ART)</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={value.fecha_fin_date || ""}
              onChange={(e) => set("fecha_fin_date", e.target.value)}
              className="border-slate-600 bg-slate-800/60 text-slate-100 flex-1"
            />
            <Input
              type="time"
              value={value.fecha_fin_time || "23:59"}
              onChange={(e) => set("fecha_fin_time", e.target.value)}
              className="border-slate-600 bg-slate-800/60 text-slate-100 w-28"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
