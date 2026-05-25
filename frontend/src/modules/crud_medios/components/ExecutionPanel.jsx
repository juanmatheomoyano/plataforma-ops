import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExecutionPanel({ canExecute, loading, result, error, onExecute }) {
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
        className="w-full h-11 text-sm font-semibold bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-40"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Consultando sellers… {elapsed}s
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Ejecutar
          </>
        )}
      </Button>

      {/* Error */}
      {error && !loading && (
        <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Result summary */}
      {result && !loading && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-200">
              Completado en {result.duration_secs.toFixed(2)}s
            </span>
            {result.dry_run && (
              <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                DRY RUN
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-100">{result.total_sellers}</p>
              <p className="text-xs text-slate-500">Sellers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-100">{result.total_matched}</p>
              <p className="text-xs text-slate-500">Matched</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{result.total_success}</p>
              <p className="text-xs text-slate-500">Éxitos</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${result.total_errors > 0 ? "text-red-400" : "text-slate-400"}`}>
                {result.total_errors}
              </p>
              <p className="text-xs text-slate-500">Errores</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
