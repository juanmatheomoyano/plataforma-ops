import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Pencil, Power, Trash2, Loader2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import client from "@/core/api/client"
import { CUOTA_PRESETS } from "@/modules/validacion_eventos/components/EventoConfigPanel"

const ESTADO_BADGE = {
  activo:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  inactivo: "bg-muted text-muted-foreground border-border",
}

function formatFecha(isoStr) {
  if (!isoStr) return "—"
  return new Date(isoStr).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

function toArtLocal(isoStr) {
  if (!isoStr) return { date: "", time: "00:00" }
  const d = new Date(isoStr)
  const art = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(d)
  const get = (t) => art.find((p) => p.type === t)?.value ?? ""
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  }
}

function EditModal({ evento, onSave, onClose }) {
  const iniLocal = toArtLocal(evento.fecha_ini)
  const finLocal = toArtLocal(evento.fecha_fin)
  const [form, setForm] = useState({
    nombre: evento.nombre,
    max_cuota: evento.max_cuota,
    fecha_ini_date: iniLocal.date,
    fecha_ini_time: iniLocal.time,
    fecha_fin_date: finLocal.date,
    fecha_fin_time: finLocal.time,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return }
    setSaving(true)
    try {
      const preset = CUOTA_PRESETS[form.max_cuota]
      await client.put(`/eventos/${evento.id}`, {
        nombre: form.nombre,
        max_cuota: form.max_cuota,
        cuotas_requeridas: preset?.set ?? evento.cuotas_requeridas,
        fecha_ini_art: form.fecha_ini_date ? `${form.fecha_ini_date}T${form.fecha_ini_time}:00` : null,
        fecha_fin_art: form.fecha_fin_date ? `${form.fecha_fin_date}T${form.fecha_fin_time}:00` : null,
      })
      toast.success("Evento actualizado")
      onSave()
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Editar evento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground text-sm">Nombre</Label>
          <Input
            value={form.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            className="border-border bg-background text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground text-sm">Cuotas del evento</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CUOTA_PRESETS).map(([max, preset]) => {
              const selected = form.max_cuota === Number(max)
              return (
                <button
                  key={max}
                  type="button"
                  onClick={() => set("max_cuota", Number(max))}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                      : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm">Inicio (ART)</Label>
            <div className="flex gap-2">
              <Input type="date" value={form.fecha_ini_date} onChange={(e) => set("fecha_ini_date", e.target.value)}
                className="border-border bg-background text-foreground flex-1" />
              <Input type="time" value={form.fecha_ini_time} onChange={(e) => set("fecha_ini_time", e.target.value)}
                className="border-border bg-background text-foreground w-24" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm">Fin (ART)</Label>
            <div className="flex gap-2">
              <Input type="date" value={form.fecha_fin_date} onChange={(e) => set("fecha_fin_date", e.target.value)}
                className="border-border bg-background text-foreground flex-1" />
              <Input type="time" value={form.fecha_fin_time} onChange={(e) => set("fecha_fin_time", e.target.value)}
                className="border-border bg-background text-foreground w-24" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="border-border text-foreground/80 hover:bg-accent">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AdministrarEventosPanel({ refreshKey }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await client.get("/eventos/")
      setEventos(data)
    } catch {
      toast.error("Error al cargar eventos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEventos() }, [fetchEventos, refreshKey])

  async function handleToggle(evento) {
    setTogglingId(evento.id)
    try {
      await client.patch(`/eventos/${evento.id}/toggle-active`)
      toast.success(evento.is_active ? "Evento desactivado" : "Evento activado")
      fetchEventos()
    } catch {
      toast.error("Error al cambiar estado")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar este evento? Esta acción no se puede deshacer.")) return
    setDeletingId(id)
    try {
      await client.delete(`/eventos/${id}`)
      toast.success("Evento eliminado")
      fetchEventos()
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando eventos...
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">No hay eventos creados todavía.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Usá "Validar y crear" para guardar el primero.
        </p>
      </div>
    )
  }

  return (
    <>
      {editando && (
        <EditModal
          evento={editando}
          onSave={() => { setEditando(null); fetchEventos() }}
          onClose={() => setEditando(null)}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Inicio</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Fin</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cuotas</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scope</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Creado por</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((e) => {
              const estado = e.is_active ? "activo" : "inactivo"
              const isVigente = e.is_active &&
                new Date(e.fecha_ini) <= new Date() &&
                new Date(e.fecha_fin) >= new Date()
              return (
                <tr key={e.id} className="border-b border-border/40 hover:bg-accent/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{e.nombre}</span>
                      {isVigente && (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold">
                          VIGENTE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatFecha(e.fecha_ini)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatFecha(e.fecha_fin)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-mono text-xs text-foreground/80">
                      {"{"}{e.cuotas_requeridas?.join(", ")}{"}"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {e.scope_seller_ids?.length > 0
                      ? <span>{e.scope_seller_ids.length} seller{e.scope_seller_ids.length !== 1 ? "s" : ""}</span>
                      : <span className="text-muted-foreground/60">Todos</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${ESTADO_BADGE[estado]}`}>
                      {estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {e.creado_por_username || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditando(e)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(e)}
                        disabled={togglingId === e.id}
                        className={[
                          "rounded p-1.5 transition-colors",
                          e.is_active
                            ? "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30"
                            : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
                        ].join(" ")}
                        title={e.is_active ? "Desactivar" : "Activar"}
                      >
                        {togglingId === e.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Power className="h-3.5 w-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        disabled={deletingId === e.id}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Eliminar"
                      >
                        {deletingId === e.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{eventos.length} evento{eventos.length !== 1 ? "s" : ""}</p>
    </>
  )
}
