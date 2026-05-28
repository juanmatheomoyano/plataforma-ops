import { useState } from "react"
import { toast } from "sonner"
import { CalendarCheck, Download, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import client from "@/core/api/client"
import { ScopeSelector } from "@/modules/crud_medios/components/ScopeSelector"
import { EventoConfigPanel, CUOTA_PRESETS } from "./components/EventoConfigPanel"
import { EventoResultsTable } from "./components/EventoResultsTable"

const EMPTY_EVENTO = {
  nombre: "",
  max_cuota: null,   // 9 | 12 | 18 | 24
  fecha_ini_date: "",
  fecha_ini_time: "00:00",
  fecha_fin_date: "",
  fecha_fin_time: "23:59",
}

function buildArtDatetime(dateStr, timeStr) {
  if (!dateStr) return null
  return `${dateStr}T${timeStr || "00:00"}:00`
}

export default function ValidacionEventosPage() {
  const [sellerIds, setSellerIds] = useState([])
  const [eventoConfig, setEventoConfig] = useState(EMPTY_EVENTO)
  const [loading, setLoading] = useState(false)
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
      const ok = data.sellers_ok
      const mal = data.sellers_a_corregir + data.sellers_no_configurado
      if (mal > 0) {
        toast.error(`${mal} seller${mal !== 1 ? "s" : ""} con problemas`)
      } else {
        toast.success(`Todos los sellers OK (${ok})`)
      }
    } catch (e) {
      const msg = e.response?.data?.detail ?? "Error al validar el evento"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Validación de Eventos</h1>
        <p className="text-sm text-slate-400">
          Verificá que los sellers tengan las reglas correctas para un evento específico
        </p>
      </div>

      <Card className="border-slate-700 bg-[#1e293b] p-5 space-y-5">
        <ScopeSelector onChange={setSellerIds} />
        <div className="border-t border-slate-700/60" />

        <div>
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Configuración del evento</h2>
          <EventoConfigPanel value={eventoConfig} onChange={setEventoConfig} />
        </div>

        <div className="border-t border-slate-700/60" />

        <div className="flex items-center gap-3">
          <Button
            onClick={handleValidar}
            disabled={!canExecute}
            className="bg-indigo-700 text-white hover:bg-indigo-600 disabled:opacity-40"
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando...</>
              : <><CalendarCheck className="mr-2 h-4 w-4" /> Validar evento</>
            }
          </Button>
          {result && (
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {exporting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />
              }
              Exportar Excel
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <Card className="border-slate-700 bg-[#1e293b] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Resultados — {result.evento_nombre}
            </h2>
            <span className="text-xs text-slate-500">
              {result.total_sellers} sellers · {result.duration_secs}s
            </span>
          </div>
          <EventoResultsTable results={result.results} eventoNombre={result.evento_nombre} />
        </Card>
      )}
    </div>
  )
}
