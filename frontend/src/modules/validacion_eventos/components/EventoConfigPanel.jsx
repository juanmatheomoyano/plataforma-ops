import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Presets de cuotas: el operador elige max, el set completo se deriva automáticamente
export const CUOTA_PRESETS = {
  9:  { label: "hasta 9 cuotas",  set: [1, 3, 6, 9],           desc: "1 · 3 · 6 · 9" },
  12: { label: "hasta 12 cuotas", set: [1, 3, 6, 9, 12],       desc: "1 · 3 · 6 · 9 · 12" },
  18: { label: "hasta 18 cuotas", set: [1, 3, 6, 9, 12, 18],   desc: "1 · 3 · 6 · 9 · 12 · 18" },
  24: { label: "hasta 24 cuotas", set: [1, 3, 6, 9, 12, 18, 24], desc: "1 · 3 · 6 · 9 · 12 · 18 · 24" },
}

export function EventoConfigPanel({ value, onChange }) {
  function set(field, val) {
    onChange({ ...value, [field]: val })
  }

  const selectedMax = value.max_cuota

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
        <Label className="text-slate-300 text-sm">Cuotas del evento</Label>
        <p className="text-xs text-slate-500">
          La validación comprueba que la <strong className="text-slate-400">unión</strong> de
          reglas activas del seller cubra todas las cuotas requeridas — pueden estar en una
          sola regla o distribuidas en varias.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(CUOTA_PRESETS).map(([max, preset]) => {
            const selected = selectedMax === Number(max)
            return (
              <button
                key={max}
                type="button"
                onClick={() => set("max_cuota", Number(max))}
                className={[
                  "flex flex-col items-start rounded-lg border px-4 py-2.5 text-left transition-colors",
                  selected
                    ? "border-indigo-600 bg-indigo-900/40 text-indigo-200"
                    : "border-slate-600 bg-slate-800/40 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                ].join(" ")}
              >
                <span className="text-sm font-semibold">{preset.label}</span>
                <span className={`text-xs mt-0.5 ${selected ? "text-indigo-400" : "text-slate-600"}`}>
                  {preset.desc}
                </span>
              </button>
            )
          })}
        </div>
        {!selectedMax && (
          <p className="text-xs text-amber-400">Seleccioná el nivel de cuotas del evento</p>
        )}
        {selectedMax && (
          <p className="text-xs text-slate-500">
            Se verifica cobertura de:{" "}
            <span className="text-slate-300 font-mono">
              {"{" + CUOTA_PRESETS[selectedMax].set.join(", ") + "}"}
            </span>
            {" "}(por unión de reglas activas)
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
