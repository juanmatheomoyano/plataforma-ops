import { useState } from "react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/core/auth/useAuth"
import client from "@/core/api/client"
import { ExecutionPanel } from "./components/ExecutionPanel"
import { FiltrosPanel, EMPTY_FILTROS } from "./components/FiltrosPanel"
import { HistorialTable } from "./components/HistorialTable"
import { OperacionSelector } from "./components/OperacionSelector"
import { ResultsTable } from "./components/ResultsTable"
import { ScopeSelector } from "./components/ScopeSelector"

const WRITE_ROLES = ["admin", "analista_senior"]

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

  const isRealWriteOp =
    opConfig.operacion && opConfig.operacion !== "R" && !opConfig.dryRun

  const canExecute =
    !!opConfig.operacion &&
    (!isRealWriteOp || canRunReal) &&
    !loading

  const filtrosDisabled = opConfig.operacion && opConfig.operacion !== "R"

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
        begin_date: arToUtc(ac.begin_date, ac.begin_time),
        end_date: arToUtc(ac.end_date, ac.end_time),
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
    } catch (err) {
      const msg = err.response?.data?.detail ?? "Error al ejecutar la operación"
      setExecError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">CRUD Medios de Pago</h1>
        <p className="text-sm text-slate-400">Gestión masiva de reglas de pago VTEX</p>
      </div>

      <Tabs defaultValue="ejecutar">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="ejecutar">Ejecutar</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* ── Tab Ejecutar ── */}
        <TabsContent value="ejecutar" className="space-y-4">
          <Card className="border-slate-700 bg-[#1e293b] p-5 space-y-5">
            <ScopeSelector onChange={setSellerIds} />
            <div className="border-t border-slate-700/60" />

            {/* 1. Selector de operación */}
            <OperacionSelector
              {...opConfig}
              onChange={setOpConfig}
            />
            <div className="border-t border-slate-700/60" />

            {/* 2. Filtros — deshabilitados para C/U/D */}
            <div className="relative">
              {filtrosDisabled && (
                <div className="absolute top-2 right-3 z-10 pointer-events-none">
                  <span className="rounded-full bg-amber-900/80 border border-amber-700 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Los filtros aplican solo a Leer
                  </span>
                </div>
              )}
              <div className={filtrosDisabled ? "pointer-events-none opacity-40" : ""}>
                <FiltrosPanel filtros={filtros} onChange={setFiltros} />
              </div>
            </div>

            {/* 3. Dry Run (solo para operaciones de escritura) */}
            {opConfig.operacion && opConfig.operacion !== "R" && (
              <>
                <div className="border-t border-slate-700/60" />
                <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Dry Run</p>
                    <p className="text-xs text-slate-500">Simulación — no realiza cambios reales en VTEX</p>
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

          <Card className="border-slate-700 bg-[#1e293b] p-5">
            <ExecutionPanel
              canExecute={canExecute}
              loading={loading}
              result={result}
              error={execError}
              onExecute={handleExecute}
            />
          </Card>

          {result && result.rows.length > 0 && (
            <Card className="border-slate-700 bg-[#1e293b] p-5">
              <ResultsTable rows={result.rows} />
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Historial ── */}
        <TabsContent value="historial">
          <Card className="border-slate-700 bg-[#1e293b] p-5">
            <HistorialTable />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
