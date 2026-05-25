import { useState } from "react"
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const BRANDS = ["Visa", "Mastercard", "Electron"]

export const EMPTY_FILTROS = {
  brands: [],
  levels: "",
  levels_mode: "include",
  estado: "todos",
  nombre: "",
  connector: "",
  cuotas: "",
  cuotas_mode: "exacta",
  fecha_mode: "todos",
  fecha_ini_date: "",
  fecha_fin_date: "",
  horario_ini: "",
  horario_ini_mode: "gte",
  horario_fin: "",
  horario_fin_mode: "lte",
}

function ToggleGroup({ value, onChange, options }) {
  return (
    <div className="flex rounded-md border border-slate-700 overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            "flex-1 px-2.5 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-slate-700 text-slate-100"
              : "bg-slate-800 text-slate-500 hover:text-slate-300",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      {children}
    </div>
  )
}

export function FiltrosPanel({ filtros, onChange }) {
  const [open, setOpen] = useState(false)

  function set(field, value) {
    onChange({ ...filtros, [field]: value })
  }

  function toggleBrand(brand) {
    const lower = brand.toLowerCase()
    const next = filtros.brands.includes(lower)
      ? filtros.brands.filter((b) => b !== lower)
      : [...filtros.brands, lower]
    set("brands", next)
  }

  const hasActiveFilters =
    filtros.brands.length > 0 ||
    filtros.levels ||
    filtros.estado !== "todos" ||
    filtros.nombre ||
    filtros.connector ||
    filtros.cuotas ||
    filtros.fecha_mode !== "todos" ||
    filtros.horario_ini ||
    filtros.horario_fin

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              activos
            </span>
          )}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="border-t border-slate-700 px-4 pb-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">

            {/* Brands */}
            <FieldRow label="Brand">
              <div className="flex flex-col gap-1.5">
                {BRANDS.map((brand) => (
                  <label key={brand} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filtros.brands.includes(brand.toLowerCase())}
                      onCheckedChange={() => toggleBrand(brand)}
                    />
                    <span className="text-xs text-slate-300">{brand}</span>
                  </label>
                ))}
              </div>
            </FieldRow>

            {/* Levels */}
            <FieldRow label="Levels (separados por coma)">
              <Input
                value={filtros.levels}
                onChange={(e) => set("levels", e.target.value)}
                placeholder="ej: 1, 2, 3"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-8 text-xs"
              />
              <ToggleGroup
                value={filtros.levels_mode}
                onChange={(v) => set("levels_mode", v)}
                options={[
                  { value: "include", label: "Incluir" },
                  { value: "exclude", label: "Excluir" },
                ]}
              />
            </FieldRow>

            {/* Estado */}
            <FieldRow label="Estado">
              <Select value={filtros.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activa</SelectItem>
                  <SelectItem value="inactivo">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Nombre */}
            <FieldRow label="Nombre parcial">
              <Input
                value={filtros.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="ej: Visa x6"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-8 text-xs"
              />
            </FieldRow>

            {/* Conector */}
            <FieldRow label="Conector">
              <Input
                value={filtros.connector}
                onChange={(e) => set("connector", e.target.value)}
                placeholder="ej: Visa"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-8 text-xs"
              />
            </FieldRow>

            {/* Cuotas */}
            <FieldRow label="Cuotas">
              <Input
                value={filtros.cuotas}
                onChange={(e) => set("cuotas", e.target.value)}
                placeholder="ej: 6"
                type="number"
                min="1"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-8 text-xs"
              />
              <ToggleGroup
                value={filtros.cuotas_mode}
                onChange={(v) => set("cuotas_mode", v)}
                options={[
                  { value: "exacta", label: "Exactas" },
                  { value: "contiene", label: "Contiene" },
                ]}
              />
            </FieldRow>

            {/* Fecha */}
            <FieldRow label="Filtro de fecha">
              <Select value={filtros.fecha_mode} onValueChange={(v) => set("fecha_mode", v)}>
                <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entre">Rango</SelectItem>
                  <SelectItem value="sin_fecha">Sin fecha</SelectItem>
                </SelectContent>
              </Select>
              {filtros.fecha_mode === "entre" && (
                <div className="flex gap-2 mt-1.5">
                  <Input
                    type="date"
                    value={filtros.fecha_ini_date}
                    onChange={(e) => set("fecha_ini_date", e.target.value)}
                    className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
                  />
                  <Input
                    type="date"
                    value={filtros.fecha_fin_date}
                    onChange={(e) => set("fecha_fin_date", e.target.value)}
                    className="border-slate-600 bg-slate-900 text-slate-100 h-8 text-xs"
                  />
                </div>
              )}
            </FieldRow>

            {/* Horario inicio */}
            <FieldRow label="Horario inicio (HH:MM)">
              <Input
                value={filtros.horario_ini}
                onChange={(e) => set("horario_ini", e.target.value)}
                placeholder="ej: 08:00"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-8 text-xs"
              />
              <ToggleGroup
                value={filtros.horario_ini_mode}
                onChange={(v) => set("horario_ini_mode", v)}
                options={[
                  { value: "gte", label: "≥" },
                  { value: "lte", label: "≤" },
                  { value: "exact", label: "=" },
                ]}
              />
            </FieldRow>

            {/* Horario fin */}
            <FieldRow label="Horario fin (HH:MM)">
              <Input
                value={filtros.horario_fin}
                onChange={(e) => set("horario_fin", e.target.value)}
                placeholder="ej: 20:00"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-8 text-xs"
              />
              <ToggleGroup
                value={filtros.horario_fin_mode}
                onChange={(v) => set("horario_fin_mode", v)}
                options={[
                  { value: "gte", label: "≥" },
                  { value: "lte", label: "≤" },
                  { value: "exact", label: "=" },
                ]}
              />
            </FieldRow>
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_FILTROS)}
              className="text-xs text-slate-500 hover:text-slate-200"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
