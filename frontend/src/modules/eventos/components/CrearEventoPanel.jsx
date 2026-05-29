import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import client from "@/core/api/client"
import { ScopeSelector } from "@/modules/crud_medios/components/ScopeSelector"
import { CUOTA_PRESETS } from "@/modules/validacion_eventos/components/EventoConfigPanel"

const EMPTY = {
  nombre: "",
  max_cuota: null,
  fecha_ini_date: "",
  fecha_ini_time: "00:00",
  fecha_fin_date: "",
  fecha_fin_time: "23:59",
}

export function CrearEventoPanel({ onCreado }) {
  const [form, setForm] = useState(EMPTY)
  const [sellerIds, setSellerIds] = useState([])
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  function artStr(date, time) {
    if (!date) return null
    return `${date}T${time || "00:00"}:00`
  }

  function validate() {
    if (!form.nombre.trim()) return "Ingresá un nombre para el evento"
    if (!form.max_cuota) return "Seleccioná el nivel de cuotas"
    if (!form.fecha_ini_date) return "Ingresá la fecha de inicio"
    if (!form.fecha_fin_date) return "Ingresá la fecha de fin"
    if (form.fecha_ini_date > form.fecha_fin_date) return "La fecha de inicio debe ser antes que el fin"
    return null
  }

  async function handleCrear() {
    const err = validate()
    if (err) { toast.error(err); return }

    setSaving(true)
    try {
      const preset = CUOTA_PRESETS[form.max_cuota]
      await client.post("/eventos/", {
        nombre: form.nombre,
        fecha_ini_art: artStr(form.fecha_ini_date, form.fecha_ini_time),
        fecha_fin_art: artStr(form.fecha_fin_date, form.fecha_fin_time),
        cuotas_requeridas: preset?.set ?? [],
        max_cuota: form.max_cuota,
        scope_seller_ids: sellerIds,
      })
      toast.success("Evento creado correctamente")
      setForm(EMPTY)
      setSellerIds([])
      onCreado?.()
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Error al crear el evento")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label className="text-foreground text-sm">Nombre del evento</Label>
        <Input
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Hot Sale 2026"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground max-w-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground text-sm">Cuotas del evento</Label>
        <p className="text-xs text-muted-foreground">
          Cuotas altas (9+) que se requieren para este evento.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(CUOTA_PRESETS).map(([max, preset]) => {
            const selected = form.max_cuota === Number(max)
            return (
              <button
                key={max}
                type="button"
                onClick={() => set("max_cuota", Number(max))}
                className={[
                  "flex flex-col items-start rounded-lg border px-4 py-2.5 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                    : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                ].join(" ")}
              >
                <span className="text-sm font-semibold">{preset.label}</span>
                <span className={`text-xs mt-0.5 ${selected ? "text-primary/70" : "text-muted-foreground/60"}`}>
                  {preset.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">Inicio del evento (ART)</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={form.fecha_ini_date}
              onChange={(e) => set("fecha_ini_date", e.target.value)}
              className="border-border bg-background text-foreground flex-1"
            />
            <Input
              type="time"
              value={form.fecha_ini_time}
              onChange={(e) => set("fecha_ini_time", e.target.value)}
              className="border-border bg-background text-foreground w-28"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">Fin del evento (ART)</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={form.fecha_fin_date}
              onChange={(e) => set("fecha_fin_date", e.target.value)}
              className="border-border bg-background text-foreground flex-1"
            />
            <Input
              type="time"
              value={form.fecha_fin_time}
              onChange={(e) => set("fecha_fin_time", e.target.value)}
              className="border-border bg-background text-foreground w-28"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-foreground text-sm mb-3 block">Scope (opcional)</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Sellers a los que aplica este evento. Dejá vacío para incluir todos.
        </p>
        <ScopeSelector onChange={setSellerIds} />
      </div>

      <div className="border-t border-border/60 pt-4">
        <Button
          onClick={handleCrear}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {saving
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</>
            : <><Save className="mr-2 h-4 w-4" /> Crear evento</>
          }
        </Button>
      </div>
    </div>
  )
}
