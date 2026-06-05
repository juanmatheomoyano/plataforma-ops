import { useState } from "react"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/core/auth/useAuth"
import client from "@/core/api/client"
import { ExecutionPanel } from "./components/ExecutionPanel"
import { FiltrosPanel, EMPTY_FILTROS } from "./components/FiltrosPanel"
import { HistorialTable } from "./components/HistorialTable"
import { OperacionSelector } from "./components/OperacionSelector"
import { ReadValidacionConfig, TODOS_GRUPOS } from "./components/ReadValidacionConfig"
import { ResultsTable } from "./components/ResultsTable"
import { ScopeSelector } from "./components/ScopeSelector"

const WRITE_ROLES = ["admin"]

const EMPTY_CREATE = {
  rule_name_prefix: "",
  ps_names: [],
  levels: [],
  cuotas: "",
  begin_date: "",
  begin_time: "",
  end_date: "",
  end_time: "",
  enabled: true,
}

const EMPTY_UPDATE = {
  begin_date: "",
  end_date: "",
  cuotas: "",
  enabled: undefined,
  level: "",
}

// Argentina = UTC-3; converts a local AR date+time string to ISO UTC
function arToUtc(date, time) {
  if (!date) return null
  const t = time || "00:00"
  return new Date(`${date}T${t}:00-03:00`).toISOString()
}

function buildFiltrosPayload(filtros) {
  const f = {}

  if (filtros.brands.length > 0) f.brands = filtros.brands
  if (filtros.levels.length > 0) {
    f.levels = filtros.levels
    f.levels_mode = filtros.levels_mode
  }
  if (filtros.estado !== "todos") f.estado = filtros.estado
  if (filtros.nombre) f.nombre = filtros.nombre
  if (filtros.connector && filtros.connector !== "todos") f.connector = filtros.connector
  if (filtros.cuotas) {
    const parsed = filtros.cuotas
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n))
    if (parsed.length > 0) {
      f.cuotas = parsed
      f.cuotas_mode = filtros.cuotas_mode
    }
  }
  if (filtros.fecha_mode !== "todos") {
    f.fecha_mode = filtros.fecha_mode
    if (filtros.fecha_ini_date) f.fecha_ini_date = filtros.fecha_ini_date
    if (filtros.fecha_fin_date) f.fecha_fin_date = filtros.fecha_fin_date
  }
  if (filtros.horario_ini) {
    f.horario_ini = filtros.horario_ini
    f.horario_ini_mode = filtros.horario_ini_mode
  }
  if (filtros.horario_fin) {
    f.horario_fin = filtros.horario_fin
    f.horario_fin_mode = filtros.horario_fin_mode
  }

  return f
}

export default function CrudMediosPage() {
  const { hasRole } = useAuth()
  const canRunReal = hasRole(WRITE_ROLES)

  const [sellerIds, setSellerIds] = useState([])
  const [filtros, setFiltros] = useState(EMPTY_FILTROS)
  const [opConfig, setOpConfig] = useState({
    operacion: null,
    dryRun: true,
    accionCreate: EMPTY_CREATE,
    accionUpdate: EMPTY_UPDATE,
  })

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [execError, setExecError] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedGrupos, setSelectedGrupos] = useState(TODOS_GRUPOS.map((g) => g.key))
  const [selectedEventoIds, setSelectedEventoIds] = useState([])
  const [eventoColumns, setEventoColumns] = useState([])
  const [loadingEventos, setLoadingEventos] = useState(false)

  const isRealWriteOp =
    opConfig.operacion && opConfig.operacion !== "R" && !opConfig.dryRun

  const canExecute =
    !!opConfig.operacion &&
    (!isRealWriteOp || canRunReal) &&
    !loading

  const filtrosDisabled = opConfig.operacion === "C"

  function handleExecuteClick() {
    if (opConfig.operacion === "D" && !opConfig.dryRun) {
      setConfirmOpen(true)
      return
    }
    handleExecute()
  }

  async function handleExecute() {
    setLoading(true)
    setResult(null)
    setExecError(null)

    const body = {
      operacion: opConfig.operacion,
      scope: { seller_ids: sellerIds },
      filtros: buildFiltrosPayload(filtros),
      dry_run: opConfig.dryRun,
    }

    if (opConfig.operacion === "C" && opConfig.accionCreate) {
      const ac = opConfig.accionCreate
      if (!ac.ps_names.length || !ac.levels.length) {
        setExecError("Seleccioná al menos una firma y un level para crear reglas.")
        setLoading(false)
        return
      }
      const cuotasList = ac.cuotas
        ? ac.cuotas.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
        : []
      body.accion_create = {
        rule_name_prefix: ac.rule_name_prefix || "",
        ps_names: ac.ps_names,
        levels: ac.levels,
        cuotas: cuotasList,
        begin_date: arToUtc(ac.begin_date, ac.begin_time || "00:00"),
        end_date: arToUtc(ac.end_date, ac.end_time || "23:59"),
        enabled: ac.enabled,
      }
    }

    if (opConfig.operacion === "U" && opConfig.accionUpdate) {
      const au = opConfig.accionUpdate
      const patch = {}
      if (au.begin_date) patch.begin_date = au.begin_date
      if (au.end_date) patch.end_date = au.end_date
      if (au.cuotas) {
        const parsed = au.cuotas.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
        if (parsed.length > 0) patch.cuotas = parsed
      }
      if (au.level) patch.level = au.level
      if (au.enabled !== undefined) patch.enabled = au.enabled
      if (Object.keys(patch).length > 0) body.accion_update = patch
    }

    try {
      const { data } = await client.post("/crud-medios/execute", body)
      setResult(data)
      if (data.total_errors > 0) {
        toast.error(`Completado con ${data.total_errors} error${data.total_errors !== 1 ? "es" : ""}`)
      } else {
        toast.success(`${data.total_matched} reglas procesadas`)
      }

      if (body.operacion === "R") {
        _loadEventoColumns(body.scope, selectedEventoIds)
      }
    } catch (err) {
      const msg = err.response?.data?.detail ?? "Error al ejecutar la operación"
      setExecError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function _utcToArtStr(isoStr) {
    if (!isoStr) return null
    const d = new Date(isoStr)
    const art = new Date(d.getTime() - 3 * 60 * 60 * 1000)
    return art.toISOString().slice(0, 19)
  }

  async function _loadEventoColumns(scope, eventoIds) {
    if (!eventoIds.length) { setEventoColumns([]); return }
    setEventoColumns([])
    setLoadingEventos(true)
    try {
      const { data: vigentes } = await client.get("/eventos/vigentes")
      const seleccionados = vigentes.filter((e) => eventoIds.includes(e.id))
      if (!seleccionados.length) return

      const cols = []
      for (const evento of seleccionados) {
        try {
          const { data: val } = await client.post("/crud-medios/validate-evento", {
            scope,
            filtros: {},
            evento: {
              nombre: evento.nombre,
              cuotas_requeridas: evento.cuotas_requeridas,
              max_cuota: evento.max_cuota,
              fecha_ini_art: _utcToArtStr(evento.fecha_ini),
              fecha_fin_art: _utcToArtStr(evento.fecha_fin),
            },
          })
          const resultMap = {}
          for (const r of val.results) resultMap[r.seller_id] = r.estado_general
          cols.push({ evento, resultMap })
        } catch {
          // evento individual falla → skip
        }
      }
      setEventoColumns(cols)
    } catch {
      // sin vigentes → silencioso
    } finally {
      setLoadingEventos(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">CRUD Medios de Pago</h1>
        <p className="text-sm text-muted-foreground">Gestión masiva de reglas de pago VTEX</p>
      </div>

      <Tabs defaultValue="ejecutar">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="ejecutar">Ejecutar</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* ── Tab Ejecutar ── */}
        <TabsContent value="ejecutar" className="space-y-4">
          <Card className="border-border bg-card p-5 space-y-5">
            <ScopeSelector onChange={setSellerIds} />
            <div className="border-t border-border" />

            {/* 1. Selector de operación */}
            <OperacionSelector
              {...opConfig}
              onChange={setOpConfig}
            />

            {/* 2. Validación (solo Read) — justo después del selector */}
            {opConfig.operacion === "R" && (
              <>
                <div className="border-t border-border" />
                <ReadValidacionConfig
                  selectedGrupos={selectedGrupos}
                  onGruposChange={setSelectedGrupos}
                  selectedEventos={selectedEventoIds}
                  onEventosChange={setSelectedEventoIds}
                />
              </>
            )}

            <div className="border-t border-border" />

            {/* 3. Filtros — deshabilitados para C */}
            <div className="relative">
              {filtrosDisabled && (
                <div className="absolute top-2 right-3 z-10 pointer-events-none">
                  <span className="rounded-full bg-amber-900/80 border border-amber-700 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Los filtros no aplican a Crear
                  </span>
                </div>
              )}
              <div className={filtrosDisabled ? "pointer-events-none opacity-40" : ""}>
                <FiltrosPanel filtros={filtros} onChange={setFiltros} />
              </div>
            </div>

            {/* 4. Dry Run (solo para operaciones de escritura) */}
            {opConfig.operacion && opConfig.operacion !== "R" && (
              <>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Dry Run</p>
                    <p className="text-xs text-muted-foreground">Simulación — no realiza cambios reales en VTEX</p>
                  </div>
                  <Switch
                    checked={opConfig.dryRun}
                    onCheckedChange={(v) => setOpConfig((prev) => ({ ...prev, dryRun: v }))}
                  />
                </div>
              </>
            )}
          </Card>

          {isRealWriteOp && !canRunReal && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
              Solo <strong>admin</strong> o <strong>analista senior</strong> pueden ejecutar operaciones reales. Podés usar Dry Run.
            </div>
          )}

          <Card className="border-border bg-card p-5">
            <ExecutionPanel
              canExecute={canExecute}
              loading={loading}
              result={result}
              error={execError}
              onExecute={handleExecuteClick}
            />
          </Card>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="border-red-800 bg-card text-card-foreground sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Confirmar eliminación real
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-foreground/80">
                  Estás por <strong className="text-red-400">eliminar reglas de pago en producción</strong>.
                  Esta acción no se puede deshacer.
                </p>
                <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-xs text-red-300 space-y-1">
                  <p>• Los cambios son <strong>inmediatos e irreversibles</strong></p>
                  <p>• Afecta a todos los sellers del scope seleccionado</p>
                  <p>• Usá <strong>Dry Run</strong> primero si no estás seguro</p>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  className="border-border text-foreground/80 hover:bg-accent"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-red-700 text-white hover:bg-red-600"
                  onClick={() => { setConfirmOpen(false); handleExecute() }}
                >
                  Sí, eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {result && (result.rows.length > 0 || result.dashboard?.length > 0) && (
            <Card className="border-border bg-card p-5">
              <ResultsTable
                rows={result.rows}
                dashboard={result.dashboard}
                operacion={opConfig.operacion}
                scope={{ seller_ids: sellerIds }}
                selectedGrupos={selectedGrupos}
                eventoColumns={eventoColumns}
                loadingEventos={loadingEventos}
              />
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Historial ── */}
        <TabsContent value="historial">
          <Card className="border-border bg-card p-5">
            <HistorialTable />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
