import { useEffect, useState } from "react"
import { AlertTriangle, Copy, Download, Check } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import client from "@/core/api/client"

/**
 * Modal de export de sellers.
 * - Modo "sin credenciales": descarga directa .xlsx.
 * - Modo "con credenciales" (solo admin): doble confirmación explícita + al descargar
 *   muestra el password del .zip AES-256 una sola vez.
 */
export function ExportSellersModal({ open, onClose, isAdmin }) {
  const [withCreds, setWithCreds] = useState(false)
  const [confirmRisk, setConfirmRisk] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [password, setPassword] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setWithCreds(false)
      setConfirmRisk(false)
      setPassword(null)
      setCopied(false)
    }
  }, [open])

  async function handleDownload() {
    setDownloading(true)
    try {
      const resp = await client.get("/sellers/export", {
        params: { include_credentials: withCreds },
        responseType: "arraybuffer",
      })
      const isZip = withCreds
      const pwd = resp.headers["x-export-password"] || null
      const ext = isZip ? "zip" : "xlsx"
      const defaultName = isZip
        ? `sellers_${new Date().toISOString().slice(0, 10)}.zip`
        : `sellers_${new Date().toISOString().slice(0, 10)}.xlsx`

      const filePath = await save({
        filters: [{ name: isZip ? "ZIP encriptado" : "Excel", extensions: [ext] }],
        defaultPath: defaultName,
      })
      if (!filePath) {
        setDownloading(false)
        return
      }
      await writeFile(filePath, new Uint8Array(resp.data))
      toast.success(isZip ? "Archivo cifrado guardado" : "Exportación guardada")

      if (isZip && pwd) {
        setPassword(pwd)
      } else {
        onClose()
      }
    } catch (e) {
      toast.error(e?.response?.status === 403 ? "Sin permisos" : "Error al exportar sellers")
    } finally {
      setDownloading(false)
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar sellers</DialogTitle>
        </DialogHeader>

        {!password ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={!withCreds}
                  onCheckedChange={() => { setWithCreds(false); setConfirmRisk(false) }}
                />
                <div className="text-sm">
                  <div className="font-medium text-foreground">Sin credenciales</div>
                  <div className="text-muted-foreground">Excel plano con datos operativos. Sin App Key / App Token.</div>
                </div>
              </label>

              {isAdmin && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={withCreds}
                    onCheckedChange={() => setWithCreds(true)}
                  />
                  <div className="text-sm">
                    <div className="font-medium text-foreground">Con credenciales VTEX (solo admin)</div>
                    <div className="text-muted-foreground">Genera un .zip cifrado con AES-256. Password se muestra una sola vez.</div>
                  </div>
                </label>
              )}
            </div>

            {withCreds && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-700 dark:bg-orange-900/30">
                <div className="flex gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div className="space-y-2 text-orange-900 dark:text-orange-200">
                    <p className="font-medium">Este archivo contiene credenciales VTEX en texto plano.</p>
                    <p>Si el .zip se filtra Y el password se filtra, cualquiera podría operar los sellers. Guardá el password en un password manager antes de cerrar el modal.</p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <Checkbox checked={confirmRisk} onCheckedChange={setConfirmRisk} />
                      <span>Entiendo el riesgo y me hago responsable</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={downloading}>Cancelar</Button>
              <Button
                onClick={handleDownload}
                disabled={downloading || (withCreds && !confirmRisk)}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "Descargando…" : "Descargar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Este password se muestra una sola vez. Si cerrás sin copiarlo, tenés que volver a exportar.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Password del .zip</p>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm text-foreground break-all">
                  {password}
                </code>
                <Button variant="outline" size="icon" onClick={copyPassword} title="Copiar">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/30">
              <div className="flex gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1 text-amber-900 dark:text-amber-200">
                  <p className="font-medium">Windows Explorer no puede extraer este .zip</p>
                  <p>
                    Usa <strong>WinRAR</strong> (si ya lo tenés) o instalá{" "}
                    <a
                      href="https://www.7-zip.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-amber-700 dark:hover:text-amber-100"
                    >
                      7-Zip
                    </a>{" "}
                    (gratis). El .zip usa cifrado AES-256, no compatible con el "Extraer todo" de Windows.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={onClose}>Ya lo guardé, cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
