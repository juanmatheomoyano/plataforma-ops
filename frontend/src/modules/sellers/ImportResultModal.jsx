import { CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ImportResultModal({ open, onClose, result }) {
  if (!result) return null

  // Supports both old format (exitosos) and new format (actualizados + creados)
  const isUpdateFormat = "actualizados" in result

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-slate-700 bg-[#1e293b] text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Resultado de importación</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Resumen */}
          {isUpdateFormat ? (
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
                <p className="text-2xl font-bold text-slate-100">{result.total}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
              <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{result.actualizados}</p>
                <p className="text-xs text-blue-500">Actualizados</p>
              </div>
              <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{result.creados}</p>
                <p className="text-xs text-emerald-500">Creados</p>
              </div>
              <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.errores}</p>
                <p className="text-xs text-red-500">Errores</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-center">
                <p className="text-2xl font-bold text-slate-100">{result.total}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
              <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{result.exitosos}</p>
                <p className="text-xs text-emerald-500">Importados</p>
              </div>
              <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.errores}</p>
                <p className="text-xs text-red-500">Errores</p>
              </div>
            </div>
          )}

          {result.errores === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Operación completada sin errores.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Filas con error:</span>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="px-3 py-2 text-left text-slate-500">Fila</th>
                      <th className="px-3 py-2 text-left text-slate-500">ID</th>
                      <th className="px-3 py-2 text-left text-slate-500">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.detalle_errores.map((e, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="px-3 py-2">{e.fila}</td>
                        <td className="px-3 py-2 text-slate-400">{e.seller_id ?? e.username ?? "—"}</td>
                        <td className="px-3 py-2 text-red-400">{e.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-slate-100 text-slate-900 hover:bg-slate-200"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
