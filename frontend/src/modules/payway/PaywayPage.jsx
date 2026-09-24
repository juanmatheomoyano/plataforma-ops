import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  KeyRound,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer, PageHeader } from "@/components/PageHeader"
import client from "@/core/api/client"

const NUMBER = new Intl.NumberFormat("es-AR")
const POLL_INTERVAL_MS = 2000
const VALIDATE_JOB_KEY = "payway_validate_job_id"
const REPORT_JOB_KEY = "payway_report_job_id"

/**
 * Payway — Fase 1 (Validar) + Fase 2 (Descargar reporte).
 * Rotación de contraseñas queda para v2.2.
 *
 * Estado compartido entre tabs: `validation` (output del /validate) — se usa
 * en la tab "Descargar" para pasar `validated_sites_json` al backend y
 * saltear el paso de descubrimiento de sites.
 */
export default function PaywayPage() {
  const [tab, setTab] = useState("credenciales")
  const [file, setFile] = useState(null)
  const [validation, setValidation] = useState(null) // { ok, total, results: [...] }
  // Permite acceder a la tab de reporte si hay un job activo aunque no haya validación en sesión
  const [reportJobActive, setReportJobActive] = useState(
    () => !!localStorage.getItem(REPORT_JOB_KEY)
  )

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Módulo"
        title="Payway"
        subtitle="Validación de credenciales SAC y descarga de transacciones"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-border bg-muted">
          <TabsTrigger value="credenciales">
            <KeyRound className="mr-2 h-4 w-4" />
            Credenciales
          </TabsTrigger>
          <TabsTrigger value="reporte" disabled={!validation?.ok && !reportJobActive}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Descargar reporte
          </TabsTrigger>
          <TabsTrigger value="rotar" disabled>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Rotar contraseñas
            <span className="ml-2 mono text-[9px] uppercase tracking-widest text-muted-foreground">
              v2.2
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Credenciales ────────────────────────────── */}
        <TabsContent value="credenciales" className="mt-4">
          <CredentialsTab
            file={file}
            onFile={setFile}
            validation={validation}
            onValidation={setValidation}
            onGoNext={() => setTab("reporte")}
          />
        </TabsContent>

        {/* ── Tab: Descargar reporte ───────────────────────── */}
        <TabsContent value="reporte" className="mt-4">
          <ReportTab
            file={file}
            validation={validation}
            onJobActiveChange={setReportJobActive}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

// ─── Tab 1: Credenciales ────────────────────────────────────────────────

function CredentialsTab({ file, onFile, validation, onValidation, onGoNext }) {
  const [validateJob, setValidateJob] = useState(null) // {job_id, status, processed_units, total_units, error_message}
  const [starting, setStarting] = useState(false)
  const inputRef = useRef(null)

  const isValidating = starting || validateJob?.status === "pending" || validateJob?.status === "running"

  // Restore job from localStorage on mount (survives navigation)
  useEffect(() => {
    const savedId = localStorage.getItem(VALIDATE_JOB_KEY)
    if (!savedId) return
    client.get(`/payway/validate-jobs/${savedId}`)
      .then(({ data }) => {
        setValidateJob(data)
        if (data.status === "done" && data.summary) onValidation(data.summary)
      })
      .catch(() => localStorage.removeItem(VALIDATE_JOB_KEY))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll cada 1s mientras corre la validación
  useEffect(() => {
    if (!isValidating || !validateJob?.job_id) return
    let cancelled = false
    const tick = async () => {
      try {
        const { data } = await client.get(`/payway/validate-jobs/${validateJob.job_id}`)
        if (cancelled) return
        setValidateJob(data)
        if (data.status === "done" && data.summary) {
          localStorage.removeItem(VALIDATE_JOB_KEY)
          const s = data.summary
          onValidation(s)
          if (s.ok === 0) toast.error("Ninguna credencial validó correctamente. Revisá el archivo.")
          else if (s.error > 0) toast.warning(`${s.ok}/${s.total} OK. Revisá las que fallaron.`)
          else toast.success(`Todas las credenciales OK — ${s.total_sites} sites detectados.`)
        } else if (data.status === "error") {
          localStorage.removeItem(VALIDATE_JOB_KEY)
          toast.error(data.error_message ?? "Error al validar credenciales")
        }
      } catch { /* sigue polleando */ }
    }
    const t = setInterval(tick, 1000)
    return () => { cancelled = true; clearInterval(t) }
  }, [isValidating, validateJob?.job_id, onValidation])

  async function handleValidate() {
    if (!file) return
    setStarting(true)
    onValidation(null)
    setValidateJob(null)
    localStorage.removeItem(VALIDATE_JOB_KEY)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const { data } = await client.post("/payway/validate", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      localStorage.setItem(VALIDATE_JOB_KEY, data.job_id)
      setValidateJob({ job_id: data.job_id, status: data.status, processed_units: 0, total_units: 0 })
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Error al iniciar validación")
    } finally {
      setStarting(false)
    }
  }

  const pct = validateJob?.total_units > 0
    ? Math.min(100, Math.floor((validateJob.processed_units / validateJob.total_units) * 100))
    : 0

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Archivo PaywayKeys.xlsx
            </Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={isValidating}
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? "Cambiar archivo" : "Seleccionar"}
              </Button>
              {file && (
                <span className="mono text-xs text-muted-foreground truncate max-w-[280px]">
                  {file.name}
                  <button
                    onClick={() => { onFile(null); onValidation(null); setValidateJob(null) }}
                    className="ml-2 rounded-full p-0.5 hover:bg-muted"
                    aria-label="Quitar archivo"
                  >
                    <X className="inline h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={handleValidate}
            disabled={!file || isValidating}
            className="bg-brand-cyan text-white hover:bg-brand-cyan/90"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando…
              </>
            ) : (
              "Validar"
            )}
          </Button>
        </div>

        {isValidating && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="eyebrow text-muted-foreground">Validando credenciales…</span>
              {validateJob?.total_units > 0 && (
                <span className="mono text-xs tabular-nums text-foreground">
                  {validateJob.processed_units} / {validateJob.total_units} ({pct}%)
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={[
                  "h-full transition-all duration-500 ease-out bg-brand-cyan",
                  !validateJob?.total_units ? "animate-pulse w-full" : "",
                ].join(" ")}
                style={validateJob?.total_units > 0 ? { width: `${pct}%` } : undefined}
              />
            </div>
          </div>
        )}

        {validateJob?.status === "error" && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {validateJob.error_message ?? "Error desconocido"}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Formato esperado del xlsx: columna A = usuario SAC, columna B = contraseña, primera fila = header.
          Todo se procesa en memoria — nada se persiste.
        </p>
      </Card>

      {validation && <ValidationResults validation={validation} onGoNext={onGoNext} />}
    </div>
  )
}

function ValidationResults({ validation, onGoNext }) {
  const { total = 0, ok = 0, error = 0, total_sites = 0, results = [] } = validation ?? {}
  return (
    <Card className="border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatBadge label="Total" value={NUMBER.format(total)} tone="ink" />
        <StatBadge label="OK" value={NUMBER.format(ok)} tone="green" />
        <StatBadge label="Error" value={NUMBER.format(error)} tone="red" />
        <StatBadge label="Sites" value={NUMBER.format(total_sites)} tone="cyan" />
        {ok > 0 && (
          <Button
            onClick={onGoNext}
            className="ml-auto bg-brand-ink text-white hover:bg-brand-ink-2"
          >
            Descargar reporte con estas credenciales
            <span aria-hidden className="ml-2">→</span>
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Estado</th>
              <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Usuario</th>
              <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Sites</th>
              <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.username} className="border-b border-border/40 last:border-b-0">
                <td className="px-4 py-2.5">
                  {r.ok ? (
                    <span className="inline-flex items-center gap-1 text-brand-green">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="mono text-[11px] uppercase tracking-widest">OK</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="mono text-[11px] uppercase tracking-widest">Error</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 mono text-xs text-foreground">{r.username}</td>
                <td className="px-4 py-2.5 tabular-nums text-foreground/80">
                  {r.sites_count > 0 ? `${r.sites_count}` : "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {r.ok ? (
                    <span className="truncate">
                      {r.sites.slice(0, 3).map((s) => s.nombre).join(", ")}
                      {r.sites.length > 3 && ` +${r.sites.length - 3}`}
                    </span>
                  ) : (
                    <span className="text-red-500">{r.error}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Tab 2: Descargar reporte ───────────────────────────────────────────

function ReportTab({ file, validation, onJobActiveChange }) {
  const today = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [estadoId, setEstadoId] = useState("0")
  const [estados, setEstados] = useState([])
  const [job, setJob] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    client
      .get("/payway/estados")
      .then(({ data }) => setEstados(data))
      .catch(() => setEstados([{ label: "Todos", id: "0" }]))
  }, [])

  // Restore report job from localStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem(REPORT_JOB_KEY)
    if (!savedId) return
    client.get(`/payway/jobs/${savedId}`)
      .then(({ data }) => setJob(data))
      .catch(() => localStorage.removeItem(REPORT_JOB_KEY))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll cada 2s cuando hay un job corriendo
  useEffect(() => {
    if (!job?.id || (job.status !== "pending" && job.status !== "running")) return
    let cancelled = false
    const tick = async () => {
      try {
        const { data } = await client.get(`/payway/jobs/${job.id}`)
        if (!cancelled) {
          setJob(data)
          if (data.status === "done" || data.status === "error") {
            localStorage.removeItem(REPORT_JOB_KEY)
            onJobActiveChange(false)
          }
        }
      } catch {
        // sigue polleando
      }
    }
    const t = setInterval(tick, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [job?.id, job?.status])

  // Only credentials that validated OK contribute sites
  const validatedSitesJson = useMemo(() => {
    if (!validation?.results) return null
    return JSON.stringify(
      validation.results
        .filter((r) => r.ok)
        .map((r) => ({ username: r.username, sites: r.sites }))
    )
  }, [validation])

  const totalUnitsEstimate = useMemo(() => {
    if (!validation) return 0
    const days = Math.max(1, Math.floor((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1)
    return validation.total_sites * days
  }, [validation, dateFrom, dateTo])

  const handleGenerate = useCallback(async () => {
    if (!file) {
      toast.error("Falta el archivo de credenciales")
      return
    }
    setStarting(true)
    setJob(null)
    localStorage.removeItem(REPORT_JOB_KEY)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("date_from", dateFrom)
      fd.append("date_to", dateTo)
      fd.append("estado_id", estadoId)
      if (validatedSitesJson) fd.append("validated_sites_json", validatedSitesJson)
      const { data } = await client.post("/payway/reports/generate", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      localStorage.setItem(REPORT_JOB_KEY, data.job_id)
      onJobActiveChange(true)
      setJob({ id: data.job_id, status: data.status, processed_units: 0, total_units: totalUnitsEstimate })
      toast.success("Descarga iniciada — puede tardar varios minutos.")
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Error al iniciar la descarga")
    } finally {
      setStarting(false)
    }
  }, [file, dateFrom, dateTo, estadoId, validatedSitesJson, totalUnitsEstimate])

  const handleDownload = useCallback(async () => {
    if (!job?.id) return
    try {
      // Tauri WebView no soporta <a download> — usamos el save dialog nativo
      // + writeFile. En build web puro caeríamos a otro path, pero acá la app
      // siempre corre en Tauri.
      const resp = await client.get(`/payway/jobs/${job.id}/download`, {
        responseType: "arraybuffer",
      })
      // v2.1.2+: el backend arma un ZIP con Consolidado + XLSX por seller + Logs.
      const defaultName = `Payway_Reporte_${dateFrom}_${dateTo}.zip`
      const filePath = await save({
        filters: [{ name: "ZIP", extensions: ["zip"] }],
        defaultPath: defaultName,
      })
      if (!filePath) return // user canceló el diálogo
      await writeFile(filePath, new Uint8Array(resp.data))
      toast.success("Reporte guardado")
    } catch (e) {
      toast.error(e?.response?.data?.detail ?? e?.message ?? "Error al descargar")
    }
  }, [job?.id, dateFrom, dateTo])

  const isRunning = job && (job.status === "pending" || job.status === "running")
  const isDone = job?.status === "done"
  const isError = job?.status === "error"

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card p-6 shadow-soft">
        {!validation?.ok && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Primero validá las credenciales en la pestaña anterior — así ya sabemos qué sites tiene cada usuario.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Desde
            </Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={isRunning || starting}
              className="mt-1.5 h-10"
            />
          </div>
          <div>
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Hasta
            </Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={isRunning || starting}
              className="mt-1.5 h-10"
            />
          </div>
          <div>
            <Label className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Estado
            </Label>
            <select
              value={estadoId}
              onChange={(e) => setEstadoId(e.target.value)}
              disabled={isRunning || starting}
              className="mt-1.5 block h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              {estados.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleGenerate}
              disabled={!validation?.ok || isRunning || starting}
              className="w-full bg-brand-cyan text-white hover:bg-brand-cyan/90"
            >
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando…
                </>
              ) : (
                "Generar reporte"
              )}
            </Button>
          </div>
        </div>

        {validation?.ok && (
          <p className="mt-3 mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Estimado: {NUMBER.format(totalUnitsEstimate)} unidades ({validation.total_sites} sites × {Math.max(1, Math.floor((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1)} días)
          </p>
        )}
      </Card>

      {job && (
        <Card className="border-border bg-card p-6 shadow-soft">
          <JobStatus job={job} />
          {isDone && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-brand-green/30 bg-brand-green/5 p-4">
              <div>
                <p className="font-semibold text-foreground">Reporte listo</p>
                <p className="mt-0.5 mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {NUMBER.format(job.meta?.total_rows ?? 0)} transacciones · {job.meta?.sites_ok} sites OK · {job.meta?.sites_error} con error
                </p>
              </div>
              <Button onClick={handleDownload} className="bg-brand-green text-white hover:bg-brand-green/90">
                <Download className="mr-2 h-4 w-4" />
                Descargar ZIP
              </Button>
            </div>
          )}
          {isError && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-semibold">Error en la descarga</p>
              <p className="mt-1 text-sm">{job.error_message ?? "Error desconocido"}</p>
            </div>
          )}
          {job.meta?.site_results && (isDone || isError) && (
            <SiteResultsTable siteResults={job.meta.site_results} />
          )}
        </Card>
      )}
    </div>
  )
}

function JobStatus({ job }) {
  const pct = Math.min(100, Math.floor((job.processed_units / Math.max(1, job.total_units)) * 100))
  const running = job.status === "pending" || job.status === "running"

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow text-muted-foreground">
          {running ? "Procesando…" : job.status === "done" ? "Completado" : "Con error"}
        </span>
        <span className="mono text-xs text-foreground tabular-nums">
          {NUMBER.format(job.processed_units)} / {NUMBER.format(job.total_units)} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={[
            "h-full transition-all duration-500 ease-out",
            job.status === "error" ? "bg-red-500" : "bg-brand-cyan",
          ].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SiteResultsTable({ siteResults }) {
  const errorRows = siteResults.filter((s) => s.error)
  const okRows = siteResults.filter((s) => !s.error)
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Usuario</th>
            <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Site</th>
            <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Filas</th>
            <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Días OK / Error</th>
            <th className="px-4 py-2.5 text-left eyebrow text-muted-foreground">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {[...errorRows, ...okRows].map((s, i) => (
            <tr key={`${s.username}-${s.idsite}-${i}`} className="border-b border-border/40 last:border-b-0">
              <td className="px-4 py-2.5 mono text-xs">{s.username}</td>
              <td className="px-4 py-2.5 mono text-xs text-muted-foreground">
                {s.idsite || "—"}{s.nombre && ` · ${s.nombre}`}
              </td>
              <td className="px-4 py-2.5 tabular-nums font-medium text-foreground">
                {NUMBER.format(s.rows)}
              </td>
              <td className="px-4 py-2.5 mono text-xs tabular-nums">
                <span className="text-brand-green">{s.days_ok}</span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className={s.days_error > 0 ? "text-red-500" : "text-muted-foreground"}>
                  {s.days_error}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs">
                {s.error ? (
                  <span className="text-red-500">{s.error}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────

function StatBadge({ label, value, tone }) {
  const toneMap = {
    ink: "bg-brand-slate/10 text-brand-ink dark:text-brand-bg",
    green: "bg-brand-green/10 text-brand-green",
    red: "bg-red-500/10 text-red-500",
    cyan: "bg-brand-cyan/10 text-brand-cyan",
  }
  return (
    <div className={`inline-flex flex-col rounded-lg px-3 py-1.5 ${toneMap[tone]}`}>
      <span className="mono text-[10px] uppercase tracking-widest opacity-80">{label}</span>
      <span className="font-display text-lg font-extrabold tabular-nums leading-none">{value}</span>
    </div>
  )
}
