import { useState } from "react"
import { toast } from "sonner"
import { CalendarCheck, Download, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import client from "@/core/api/client"
import { ScopeSelector } from "@/modules/crud_medios/components/ScopeSelector"
import { EventoConfigPanel, CUOTA_PRESETS } from "@/modules/validacion_eventos/components/EventoConfigPanel"
import { EventoResultsTable } from "@/modules/validacion_eventos/components/EventoResultsTable"

const EMPTY_EVENTO = {
  nombre: "",
  max_cuota: null,
  fecha_ini_date: "",
  fecha_ini_time: "00:00",
  fecha_fin_date: "",
  fecha_fin_time: "23:59",
}

function buildArtDatetime(dateStr, timeStr) {
  if (!dateStr) return null
  return `${dateStr}T${timeStr || "00:00"}:00`
}

export function ValidarEventoPanel({ onEventoGuardado }) {
  const [sellerIds, setSellerIds] = useState([])
  const [eventoConfig, setEventoConfig] = useState(EMPTY_EVENTO)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  function buildRequestBody() {
    const preset = CUOTA_PRESETS[eventoConfig.max_cuota]
    return {
      scope: { seller_ids: sellerIds },
      filtros: {},
      evento: {
        nombre: eventoConfig.nombre,
        cuotas_requeridas: preset?.set ?? [],
        max_cuota: eventoConfig.max_cuota,
        fecha_ini_art: buildArtDatetime(eventoConfig.fecha_ini_date, eventoConfig.fecha_ini_time),
        fecha_fin_art: buildArtDatetime(eventoConfig.fecha_fin_date, eventoConfig.fecha_fin_time),
      },
    }
  }

  function validate() {
    if (!eventoConfig.nombre.trim()) return "Ingresá un nombre para el evento"
    if (!eventoConfig.max_cuota) return "Seleccioná el nivel de cuotas del evento"
    return null
  }

  async function handleValidar() {
    const err = validate()
    if (err) { toast.error(err); return }
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const { data } = await client.post("/crud-medios/validate-evento", buildRequestBody())
      setResult(data)
      const mal = data.sellers_a_corregir + data.sellers_no_configurado
      if (mal > 0) {
        toast.error(`${mal} seller${mal !== 1 ? "s" : ""} con problemas`)
      } else {
        toast.success(`Todos los sellers OK (${data.sellers_ok})`)
      }
    } catch (e) {
      const msg = e.response?.data?.detail ?? "Error al validar el evento"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardar() {
    const err = validate()
    if (err) { toast.error(err); return }
    setSaving(true)
    try {
      const body = buildRequestBody()
      await client.post("/eventos/", {
        nombre: eventoConfig.nombre,
        fecha_ini_art: body.evento.fecha_ini_art,
        fecha_fin_art: body.evento.fecha_fin_art,
        cuotas_requeridas: body.evento.cuotas_requeridas,
        max_cuota: body.evento.max_cuota,
        scope_seller_ids: sellerIds,
      })
      toast.success("Evento guardado correctamente")
      onEventoGuardado?.()
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Error al guardar el evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleExportExcel() {
    const err = validate()
    if (err) { toast.error(err); return }
    setExporting(true)
    try {
      const { data } = await client.post(
        "/crud-medios/export-evento",
        buildRequestBody(),
        { responseType: "blob" },
      )
      const url = URL.createObjectURL(new Blob([data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `evento_${eventoConfig.nombre.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al generar el Excel")
    } finally {
      setExporting(false)
    }
  }

  const canExecute = !loading && !!eventoConfig.max_cuota && !!eventoConfig.nombre.trim()

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <ScopeSelector onChange={setSellerIds} />
        <div className="border-t border-border/60" />

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">Configuración del evento</h2>
          <EventoConfigPanel value={eventoConfig} onChange={setEventoConfig} />
        </div>

        <div className="border-t border-border/60" />

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleValidar}
            disabled={!canExecute}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</>
              : <><CalendarCheck className="mr-2 h-4 w-4" /> Validar evento</>
            }
          </Button>

          {result && (
            <>
              <Button
                variant="outline"
                onClick={handleGuardar}
                disabled={saving}
                className="border-primary/60 text-primary hover:bg-primary/10"
              >
                {saving
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />
                }
                Guardar evento
              </Button>
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={exporting}
                className="border-border text-foreground/80 hover:bg-accent"
              >
                {exporting
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Download className="mr-2 h-4 w-4" />
                }
                Exportar Excel
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Resultados — {result.evento_nombre}
            </h2>
            <span className="text-xs text-muted-foreground">
              {result.total_sellers} sellers · {result.duration_secs?.toFixed(1)}s
            </span>
          </div>
          <EventoResultsTable results={result.results} />
        </div>
      )}
    </div>
  )
}
