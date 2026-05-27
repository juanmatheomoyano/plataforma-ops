import { useState } from "react"
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react"
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

const LEVEL_CHIPS = [
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

const ALL_LEVEL_VALUES = LEVEL_CHIPS.map((l) => l.value)

export const EMPTY_FILTROS = {
  brands: [],
  levels: [],
  levels_mode: "include",
  estado: "todos",
  nombre: "",
  connector: "todos",
  cuotas: "",
  cuotas_mode: "exacta",
  fecha_mode: "todos",
  fecha_ini_date: "",
  fecha_fin_date: "",
  horario_ini: "",
  horario_ini_mode: "include",
  horario_fin: "",
  horario_fin_mode: "include",
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
    <div className="space-y-2">
      <Label className="text-xs font-medium text-slate-400">{label}</Label>
      {children}
    </div>
  )
}

function isBrandChecked(brand, brands) {
  return brands.length === 0 || brands.includes(brand.toLowerCase())
}

function isLevelSelected(value, levels) {
  return levels.length === 0 || levels.includes(value)
}

export function FiltrosPanel({ filtros, onChange }) {
  const [open, setOpen] = useState(false)

  function set(field, value) {
    onChange({ ...filtros, [field]: value })
  }

  function toggleBrand(brand) {
    const lower = brand.toLowerCase()
    if (filtros.brands.length === 0) {
      set("brands", BRANDS.map((b) => b.toLowerCase()).filter((b) => b !== lower))
    } else if (filtros.brands.includes(lower)) {
      const next = filtros.brands.filter((b) => b !== lower)
      set("brands", next)
    } else {
      const next = [...filtros.brands, lower]
      set("brands", next.length === BRANDS.length ? [] : next)
    }
  }

  function toggleLevel(value) {
    if (filtros.levels.length === 0) {
      set("levels", ALL_LEVEL_VALUES.filter((v) => v !== value))
    } else if (filtros.levels.includes(value)) {
      const next = filtros.levels.filter((v) => v !== value)
      set("levels", next)
    } else {
      const next = [...filtros.levels, value]
      set("levels", next.length === ALL_LEVEL_VALUES.length ? [] : next)
    }
  }

  const hasActiveFilters =
    filtros.brands.length > 0 ||
    filtros.levels.length > 0 ||
    filtros.estado !== "todos" ||
    filtros.nombre ||
    (filtros.connector && filtros.connector !== "todos") ||
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
        <div className="border-t border-slate-700 px-4 pb-5 pt-4 space-y-5">

          {/* Row 1: Brand + Estado + Nombre */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

            {/* Brand */}
            <FieldRow label="Brand">
              <div className="flex flex-col gap-2">
                {BRANDS.map((brand) => (
                  <label key={brand} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBrandChecked(brand, filtros.brands)}
                      onChange={() => toggleBrand(brand)}
                      className="h-3.5 w-3.5 rounded border-slate-600 accent-blue-500"
                    />
                    <span className="text-xs text-slate-300">{brand}</span>
                  </label>
                ))}
              </div>
            </FieldRow>

            {/* Estado */}
            <FieldRow label="Estado">
              <Select value={filtros.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100 h-9 text-xs">
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
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-9 text-xs"
              />
            </FieldRow>
          </div>

          {/* Row 2: Levels — full width */}
          <FieldRow label="Levels">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {LEVEL_CHIPS.map(({ label, value }) => {
                const selected = isLevelSelected(value, filtros.levels)
                return (
                  <button
                    key={value}
                    onClick={() => toggleLevel(value)}
                    className={[
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      selected
                        ? "border-blue-600 bg-blue-900/50 text-blue-300"
                        : "border-slate-600 bg-slate-800 text-slate-500 hover:text-slate-300",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <ToggleGroup
              value={filtros.levels_mode}
              onChange={(v) => set("levels_mode", v)}
              options={[
                { value: "include", label: "Incluir seleccionados" },
                { value: "exclude", label: "Excluir seleccionados" },
              ]}
            />
          </FieldRow>

          {/* Row 3: Conector + Cuotas + Fecha */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

            {/* Conector */}
            <FieldRow label="Conector">
              <Select value={filtros.connector} onValueChange={(v) => set("connector", v)}>
                <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100 h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Payway">Payway</SelectItem>
                  <SelectItem value="Decidir">Decidir</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            {/* Cuotas */}
            <FieldRow label="Cuotas">
              <Input
                value={filtros.cuotas}
                onChange={(e) => set("cuotas", e.target.value)}
                placeholder="ej: 1, 3, 6, 9, 12"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-9 text-xs"
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
                <SelectTrigger className="border-slate-600 bg-slate-900 text-slate-100 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="entre">Rango</SelectItem>
                  <SelectItem value="sin_fecha">Sin fecha</SelectItem>
                </SelectContent>
              </Select>
              {filtros.fecha_mode === "entre" && (
                <div className="flex gap-2 mt-1">
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
          </div>

          {/* Row 4: Horarios */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Horario inicio */}
            <FieldRow label="Horario inicio (HH:MM)">
              <Input
                value={filtros.horario_ini}
                onChange={(e) => set("horario_ini", e.target.value)}
                placeholder="ej: 08:00"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-9 text-xs"
              />
              <ToggleGroup
                value={filtros.horario_ini_mode}
                onChange={(v) => set("horario_ini_mode", v)}
                options={[
                  { value: "include", label: "Incluye" },
                  { value: "exclude", label: "Excluye" },
                ]}
              />
            </FieldRow>

            {/* Horario fin */}
            <FieldRow label="Horario fin (HH:MM)">
              <Input
                value={filtros.horario_fin}
                onChange={(e) => set("horario_fin", e.target.value)}
                placeholder="ej: 20:00"
                className="border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-600 h-9 text-xs"
              />
              <ToggleGroup
                value={filtros.horario_fin_mode}
                onChange={(v) => set("horario_fin_mode", v)}
                options={[
                  { value: "include", label: "Incluye" },
                  { value: "exclude", label: "Excluye" },
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
