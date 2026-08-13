import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExecutionPanel({ canExecute, loading, result, error, progress, onExecute }) {
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (loading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [loading])

  return (
    <div className="space-y-3">
      {/* Execute button */}
      <Button
        onClick={onExecute}
        disabled={!canExecute || loading}
        className="w-full h-11 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress && progress.total > 0
              ? `Procesando ${progress.processed}/${progress.total}… ${elapsed}s`
              : progress
                ? `Iniciando… ${elapsed}s`
                : `Consultando sellers… ${elapsed}s`}
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Ejecutar
          </>
        )}
      </Button>

      {/* Progress bar (async ops) */}
      {loading && progress && progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.floor((progress.processed / progress.total) * 100))}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {progress.status === "pending"
              ? "Cargando en cola…"
              : `${progress.processed} de ${progress.total} sellers procesados`}
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Result summary */}
      {result && !loading && (
        <div className="rounded-lg border border-border bg-muted/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground/80">
              Completado en {result.duration_secs.toFixed(2)}s
            </span>
            {result.dry_run && (
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                DRY RUN
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{result.total_sellers}</p>
              <p className="text-xs text-muted-foreground">Sellers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{result.total_matched}</p>
              <p className="text-xs text-muted-foreground">Matched</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{result.total_success}</p>
              <p className="text-xs text-muted-foreground">Éxitos</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${result.total_errors > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                {result.total_errors}
              </p>
              <p className="text-xs text-muted-foreground">Errores</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
