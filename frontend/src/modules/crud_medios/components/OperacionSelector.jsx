import { AlertTriangle, Eye, FilePlus, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const OPS = [
  {
    value: "C",
    label: "Crear",
    icon: FilePlus,
    color: "border-emerald-700 bg-emerald-900/30 text-emerald-400",
    activeColor: "border-emerald-500 bg-emerald-800/50 text-emerald-300 ring-2 ring-emerald-700",
  },
  {
    value: "R",
    label: "Leer",
    icon: Eye,
    color: "border-blue-700 bg-blue-900/30 text-blue-400",
    activeColor: "border-blue-500 bg-blue-800/50 text-blue-300 ring-2 ring-blue-700",
  },
  {
    value: "U",
    label: "Actualizar",
    icon: Pencil,
    color: "border-amber-700 bg-amber-900/30 text-amber-400",
    activeColor: "border-amber-500 bg-amber-800/50 text-amber-300 ring-2 ring-amber-700",
  },
  {
    value: "D",
    label: "Eliminar",
    icon: Trash2,
    color: "border-red-700 bg-red-900/30 text-red-400",
    activeColor: "border-red-500 bg-red-800/50 text-red-300 ring-2 ring-red-700",
  },
]

const BRANDS_CREATE = [
  { label: "Visa",       value: "visa" },
  { label: "Mastercard", value: "mastercard" },
  { label: "Electron",   value: "electron" },
]

const LEVEL_CHIPS_CREATE = [
  { label: "Classic",    value: "classic" },
  { label: "Gold",       value: "gold" },
  { label: "Gold/Prem",  value: "gold/prem" },
  { label: "Platinum",   value: "platinum" },
  { label: "Black",      value: "black" },
  { label: "Signature",  value: "signature" },
  { label: "Electron",   value: "electron" },
  { label: "Business",   value: "business" },
  { label: "Premier",    value: "premier" },
  { label: "Purchasing", value: "purchasing" },
  { label: "Corporate",  value: "corporate" },
]

function FieldRow({ label, children, hint }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
    </div>
  )
}

function buildNamePreview(prefix, psBrands, levels, cuotasStr) {
  if (!psBrands.length || !levels.length) return null
  const cuotas = cuotasStr
    ? cuotasStr.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
    : []
  const maxC = cuotas.length ? Math.max(...cuotas) : 0
  const examples = []
  for (const brand of psBrands.slice(0, 2)) {
    for (const level of levels.slice(0, 2)) {
      const lp = level.toUpperCase().replace("/", "_").replace(" ", "_")
      const bp = brand.toUpperCase()
      const name = prefix
        ? maxC ? `${prefix}_${bp}_${lp}_${maxC}` : `${prefix}_${bp}_${lp}`
        : maxC ? `${bp}_${lp}_${maxC}` : `${bp}_${lp}`
      examples.push(name)
    }
  }
  const total = psBrands.length * levels.length
  const suffix = total > examples.length ? ` … (+${total - examples.length} más)` : ""
  return examples.join(", ") + suffix
}

export function OperacionSelector({ operacion, dryRun, accionCreate, accionUpdate, onChange }) {
  function set(field, value) {
    onChange({ operacion, dryRun, accionCreate, accionUpdate, [field]: value })
  }

  function setCreate(field, value) {
    onChange({ operacion, dryRun, accionCreate: { ...accionCreate, [field]: value }, accionUpdate })
  }

  function setUpdate(field, value) {
    onChange({ operacion, dryRun, accionCreate, accionUpdate: { ...accionUpdate, [field]: value } })
  }

  function toggleCreateBrand(value) {
    const cur = accionCreate?.ps_names ?? []
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    setCreate("ps_names", next)
  }

  function toggleCreateLevel(value) {
    const cur = accionCreate?.levels ?? []
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    setCreate("levels", next)
  }

  function setUpdateLevel(value) {
    const cur = accionUpdate?.level ?? ""
    setUpdate("level", cur === value ? "" : value)
  }

  const namePreview = operacion === "C"
    ? buildNamePreview(
        accionCreate?.rule_name_prefix ?? "",
        accionCreate?.ps_names ?? [],
        accionCreate?.levels ?? [],
        accionCreate?.cuotas ?? "",
      )
    : null

  return (
    <div className="space-y-4">
      {/* Operation buttons */}
      <div className="grid grid-cols-4 gap-3">
        {OPS.map(({ value, label, icon: Icon, color, activeColor }) => {
          const isActive = operacion === value
          const isDimmed = operacion !== null && !isActive
          return (
            <button
              key={value}
              onClick={() => set("operacion", operacion === value ? null : value)}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                isActive ? activeColor : color,
                isDimmed ? "opacity-25" : "hover:opacity-90",
              ].join(" ")}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Delete warning */}
      {operacion === "D" && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-300">Operación destructiva</p>
            <p className="text-xs text-red-400 mt-0.5">
              Esta acción eliminará las reglas filtradas. Asegurate de usar Dry Run primero para verificar qué se va a borrar.
            </p>
          </div>
        </div>
      )}

      {/* Create subform */}
      {operacion === "C" && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-300">Nueva regla de pago</p>

          {/* Prefix */}
          <FieldRow label="Prefijo del nombre" hint="Se agrega antes del nombre generado automáticamente (opcional)">
            <Input
              value={accionCreate?.rule_name_prefix ?? ""}
              onChange={(e) => setCreate("rule_name_prefix", e.target.value)}
              placeholder="ej: PROMO"
              className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
            />
          </FieldRow>

          {/* Name preview */}
          {namePreview && (
            <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2">
              <p className="text-[10px] text-slate-500 mb-0.5">Nombre(s) generado(s):</p>
              <p className="text-xs text-slate-300 font-mono">{namePreview}</p>
            </div>
          )}

          {/* Brands */}
          <FieldRow label="Firmas *">
            <div className="flex flex-wrap gap-2">
              {BRANDS_CREATE.map(({ label, value }) => {
                const selected = (accionCreate?.ps_names ?? []).includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleCreateBrand(value)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-emerald-600 bg-emerald-900/50 text-emerald-300"
                        : "border-slate-600 bg-slate-800 text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </FieldRow>

          {/* Levels */}
          <FieldRow label="Levels *">
            <div className="flex flex-wrap gap-1.5">
              {LEVEL_CHIPS_CREATE.map(({ label, value }) => {
                const selected = (accionCreate?.levels ?? []).includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleCreateLevel(value)}
                    className={[
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      selected
                        ? "border-emerald-600 bg-emerald-900/50 text-emerald-300"
                        : "border-slate-600 bg-slate-800 text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </FieldRow>

          {/* Cuotas + fechas */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <FieldRow label="Cuotas" hint="ej: 1,3,6,9 — vacío = sin cuotas">
              <Input
                value={accionCreate?.cuotas ?? ""}
                onChange={(e) => setCreate("cuotas", e.target.value)}
                placeholder="1,3,6,9,12"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Fecha inicio">
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={accionCreate?.begin_date ?? ""}
                  onChange={(e) => setCreate("begin_date", e.target.value || "")}
                  className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs flex-1"
                />
                <Input
                  type="time"
                  value={accionCreate?.begin_time ?? ""}
                  onChange={(e) => setCreate("begin_time", e.target.value || "")}
                  className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs w-24"
                />
              </div>
            </FieldRow>
            <FieldRow label="Fecha fin">
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={accionCreate?.end_date ?? ""}
                  onChange={(e) => setCreate("end_date", e.target.value || "")}
                  className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs flex-1"
                />
                <Input
                  type="time"
                  value={accionCreate?.end_time ?? ""}
                  onChange={(e) => setCreate("end_time", e.target.value || "")}
                  className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs w-24"
                />
              </div>
            </FieldRow>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={accionCreate?.enabled ?? true}
              onCheckedChange={(v) => setCreate("enabled", v)}
            />
            <Label className="text-xs text-slate-400">Habilitada</Label>
          </div>
        </div>
      )}

      {/* Update subform */}
      {operacion === "U" && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-300">
            Cambios a aplicar{" "}
            <span className="font-normal text-slate-500 text-xs">(solo los campos completados se actualizan)</span>
          </p>

          {/* Level chips */}
          <FieldRow label="Level">
            <div className="flex flex-wrap gap-1.5">
              {LEVEL_CHIPS_CREATE.map(({ label, value }) => {
                const selected = accionUpdate?.level === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setUpdateLevel(value)}
                    className={[
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      selected
                        ? "border-amber-600 bg-amber-900/50 text-amber-300"
                        : "border-slate-600 bg-slate-800 text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-600">Click para seleccionar, click nuevamente para deseleccionar</p>
          </FieldRow>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <FieldRow label="Cuotas" hint="ej: 1,3,6,9 — vacío = no cambiar">
              <Input
                value={accionUpdate?.cuotas ?? ""}
                onChange={(e) => setUpdate("cuotas", e.target.value)}
                placeholder="1,3,6,9"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Fecha inicio">
              <Input
                type="date"
                value={accionUpdate?.begin_date ?? ""}
                onChange={(e) => setUpdate("begin_date", e.target.value || "")}
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Fecha fin">
              <Input
                type="date"
                value={accionUpdate?.end_date ?? ""}
                onChange={(e) => setUpdate("end_date", e.target.value || "")}
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Estado">
              <select
                value={accionUpdate?.enabled === undefined ? "" : String(accionUpdate.enabled)}
                onChange={(e) => setUpdate("enabled", e.target.value === "" ? undefined : e.target.value === "true")}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
              >
                <option value="">No cambiar</option>
                <option value="true">Habilitar</option>
                <option value="false">Deshabilitar</option>
              </select>
            </FieldRow>
          </div>
        </div>
      )}
    </div>
  )
}
