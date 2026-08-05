import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import client from "@/core/api/client"

/**
 * Modal que aparece la primera vez que el usuario abre una versión nueva.
 * Toma las notas del release desde `/api/updates/latest` (campo `notes`).
 * Si el fetch falla, muestra el modal igual con un mensaje genérico —
 * no bloqueamos al usuario por un problema de red.
 */
export function WhatsNewModal({ version, onClose }) {
  const [notes, setNotes] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!version) return
    let cancelled = false
    client
      .get("/updates/latest")
      .then(({ data }) => { if (!cancelled) setNotes(data?.notes || null) })
      .catch(() => { if (!cancelled) setNotes(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [version])

  return (
    <Dialog open={!!version} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Provincia Ops se actualizó
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Nueva versión</p>
            <p className="text-2xl font-semibold text-primary">v{version}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Novedades</p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : notes ? (
              <p className="whitespace-pre-line text-sm text-muted-foreground">{notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Actualizamos la app con mejoras y correcciones. Mirá el changelog completo para
                detalles técnicos.
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>Entendido</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
