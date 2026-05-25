import { useState } from "react"
import { AlertTriangle, Eye, FilePlus, Pencil, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const OPS = [
  {
    value: "R",
    label: "Read",
    icon: Eye,
    color: "border-blue-700 bg-blue-900/30 text-blue-400",
    activeColor: "border-blue-500 bg-blue-800/50 text-blue-300 ring-2 ring-blue-700",
  },
  {
    value: "C",
    label: "Create",
    icon: FilePlus,
    color: "border-emerald-700 bg-emerald-900/30 text-emerald-400",
    activeColor: "border-emerald-500 bg-emerald-800/50 text-emerald-300 ring-2 ring-emerald-700",
  },
  {
    value: "U",
    label: "Update",
    icon: Pencil,
    color: "border-amber-700 bg-amber-900/30 text-amber-400",
    activeColor: "border-amber-500 bg-amber-800/50 text-amber-300 ring-2 ring-amber-700",
  },
  {
    value: "D",
    label: "Delete",
    icon: Trash2,
    color: "border-red-700 bg-red-900/30 text-red-400",
    activeColor: "border-red-500 bg-red-800/50 text-red-300 ring-2 ring-red-700",
  },
]

function FieldRow({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      {children}
    </div>
  )
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

  return (
    <div className="space-y-4">
      {/* Operation buttons */}
      <div className="grid grid-cols-4 gap-3">
        {OPS.map(({ value, label, icon: Icon, color, activeColor }) => (
          <button
            key={value}
            onClick={() => set("operacion", operacion === value ? null : value)}
            className={[
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
              operacion === value ? activeColor : color,
              "hover:opacity-90",
            ].join(" ")}
          >
            <Icon className="h-6 w-6" />
            <span className="text-sm font-semibold">{label}</span>
          </button>
        ))}
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

      {/* Dry Run toggle */}
      {operacion && (
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-200">Dry Run</p>
            <p className="text-xs text-slate-500">Simulación — no realiza cambios reales en VTEX</p>
          </div>
          <Switch
            checked={dryRun}
            onCheckedChange={(v) => set("dryRun", v)}
          />
        </div>
      )}

      {/* Create subform */}
      {operacion === "C" && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-300">Datos de la nueva regla</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <FieldRow label="Nombre de regla *">
              <Input
                value={accionCreate?.rule_name ?? ""}
                onChange={(e) => setCreate("rule_name", e.target.value)}
                placeholder="ej: Visa x6"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Payment System (brand) *">
              <Input
                value={accionCreate?.ps_name ?? ""}
                onChange={(e) => setCreate("ps_name", e.target.value)}
                placeholder="ej: Visa"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Level *">
              <Input
                type="number"
                min="1"
                value={accionCreate?.level ?? ""}
                onChange={(e) => setCreate("level", parseInt(e.target.value) || "")}
                placeholder="ej: 1"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Cuotas *">
              <Input
                type="number"
                min="1"
                value={accionCreate?.cuotas ?? ""}
                onChange={(e) => setCreate("cuotas", parseInt(e.target.value) || "")}
                placeholder="ej: 6"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Fecha inicio (YYYY-MM-DD)">
              <Input
                type="date"
                value={accionCreate?.begin_date ?? ""}
                onChange={(e) => setCreate("begin_date", e.target.value || null)}
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Fecha fin (YYYY-MM-DD)">
              <Input
                type="date"
                value={accionCreate?.end_date ?? ""}
                onChange={(e) => setCreate("end_date", e.target.value || null)}
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
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
            Cambios a aplicar <span className="font-normal text-slate-500 text-xs">(solo los campos completados se actualizan)</span>
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <FieldRow label="Fecha inicio">
              <Input
                type="date"
                value={accionUpdate?.begin_date ?? ""}
                onChange={(e) => setUpdate("begin_date", e.target.value || null)}
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Fecha fin">
              <Input
                type="date"
                value={accionUpdate?.end_date ?? ""}
                onChange={(e) => setUpdate("end_date", e.target.value || null)}
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Cuotas">
              <Input
                type="number"
                min="1"
                value={accionUpdate?.cuotas ?? ""}
                onChange={(e) => setUpdate("cuotas", parseInt(e.target.value) || null)}
                placeholder="dejar vacío = no cambiar"
                className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
              />
            </FieldRow>
            <FieldRow label="Level">
              <Input
                type="number"
                min="1"
                value={accionUpdate?.level ?? ""}
                onChange={(e) => setUpdate("level", parseInt(e.target.value) || null)}
                placeholder="dejar vacío = no cambiar"
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
