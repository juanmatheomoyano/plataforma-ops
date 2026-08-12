import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import * as Sentry from "@sentry/react"

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "unknown"
const DOWNLOAD_TIMEOUT_MS = 60_000
const RELEASES_URL = "https://github.com/juanmatheomoyano/plataforma-ops/releases/latest"

async function openInBrowser(url) {
  try {
    const { open } = await import("@tauri-apps/plugin-opener")
    await open(url)
  } catch {
    try {
      window.open(url, "_blank")
    } catch {
      /* noop */
    }
  }
}

function fallbackToast(version, reason) {
  toast.error("La descarga automática falló", {
    duration: 15000,
    description:
      reason === "timeout"
        ? "Windows puede estar bloqueando el archivo. Bajalo a mano desde el navegador."
        : "Podés bajar el instalador manualmente desde GitHub.",
    action: {
      label: "Abrir descarga",
      onClick: () => openInBrowser(RELEASES_URL),
    },
  })
}

function withTimeout(promise, ms, onTimeout) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.()
      reject(new Error("timeout"))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Chequea si hay una nueva versión disponible via tauri-plugin-updater.
 *
 * status:
 *   "not-tauri"     → no estamos corriendo dentro de Tauri (dev browser)
 *   "no-update"     → check OK, no hay update disponible
 *   "available"     → update disponible pero usuario canceló
 *   "installing"    → usuario aceptó, en proceso
 *   "installed"     → instalado (se va a relaunch)
 *   "download-failed" → download falló (timeout o error); fallback abre browser
 *   "error"         → algo falló, ver `error`
 */
export async function checkForUpdatesOnce({ silent = false, onProgress } = {}) {
  const ctx = { current_version: CURRENT_VERSION }

  try {
    console.info("[updater] check start", ctx)
    Sentry.addBreadcrumb({ category: "updater", message: "check start", data: ctx })

    if (!window.__TAURI_INTERNALS__) {
      console.info("[updater] not running in Tauri, skip")
      return { status: "not-tauri" }
    }

    const { check } = await import("@tauri-apps/plugin-updater")
    const { relaunch } = await import("@tauri-apps/plugin-process")
    const { ask } = await import("@tauri-apps/plugin-dialog")

    const update = await check()
    console.info("[updater] check result", { available: !!update?.available, version: update?.version })
    Sentry.addBreadcrumb({
      category: "updater",
      message: "check ok",
      data: { available: !!update?.available, version: update?.version },
    })

    if (!update?.available) {
      if (!silent) toast.success(`Estás en la última versión (${CURRENT_VERSION})`)
      return { status: "no-update" }
    }

    const userConfirmed = await ask(
      `Nueva versión ${update.version} disponible.\n\n${update.body || "Sin notas"}\n\n¿Instalar ahora?`,
      { title: "Provincia Ops — Actualización", okLabel: "Instalar", cancelLabel: "Después" }
    )

    if (!userConfirmed) {
      console.info("[updater] user declined")
      return { status: "available", version: update.version }
    }

    let totalBytes = 0
    let downloadedBytes = 0
    const toastId = toast.loading(`Descargando v${update.version}… 0%`)

    try {
      await withTimeout(
        update.downloadAndInstall((ev) => {
          if (ev?.event === "Started") {
            totalBytes = ev.data?.contentLength || 0
            downloadedBytes = 0
          } else if (ev?.event === "Progress") {
            downloadedBytes += ev.data?.chunkLength || 0
            const pct = totalBytes > 0 ? Math.min(100, Math.floor((downloadedBytes / totalBytes) * 100)) : 0
            toast.loading(`Descargando v${update.version}… ${pct}%`, { id: toastId })
            onProgress?.({ downloaded: downloadedBytes, total: totalBytes, pct })
          } else if (ev?.event === "Finished") {
            toast.loading(`Instalando v${update.version}…`, { id: toastId })
          }
        }),
        DOWNLOAD_TIMEOUT_MS,
        () => {
          console.warn("[updater] download timeout")
          Sentry.captureMessage("updater download timeout", {
            level: "warning",
            tags: { component: "auto-updater", reason: "download-failed" },
            extra: { ...ctx, target_version: update.version, downloadedBytes, totalBytes },
          })
        }
      )
    } catch (dlErr) {
      toast.dismiss(toastId)
      const reason = dlErr?.message === "timeout" ? "timeout" : "error"
      console.error("[updater] download failed", { reason, err: dlErr?.message })
      Sentry.captureException(dlErr, {
        tags: { component: "auto-updater", reason: "download-failed" },
        extra: { ...ctx, target_version: update.version, downloadedBytes, totalBytes },
      })
      fallbackToast(update.version, reason)
      return { status: "download-failed", version: update.version, reason }
    }

    toast.dismiss(toastId)
    console.info("[updater] downloadAndInstall done, relaunching")
    await relaunch()
    return { status: "installed" }
  } catch (e) {
    const errMsg = e?.message || String(e)
    console.error("[updater] failed", { ...ctx, error: errMsg })
    Sentry.captureException(e, { tags: { component: "auto-updater" }, extra: ctx })
    if (!silent) {
      toast.error(`No se pudo chequear actualizaciones: ${errMsg}`, {
        duration: 8000,
        description: `Versión actual: v${CURRENT_VERSION}`,
        action: {
          label: "Abrir descarga",
          onClick: () => openInBrowser(RELEASES_URL),
        },
      })
    }
    return { status: "error", error: errMsg }
  }
}

/**
 * Hook: dispara el check automático 5s después de montarse.
 */
export function useAutoUpdate() {
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdatesOnce({ silent: true })
    }, 5000)
    return () => clearTimeout(timer)
  }, [])
}

/**
 * Trigger manual desde el botón en Configuración.
 */
export function useManualUpdateCheck() {
  return useCallback(() => {
    toast.info("Buscando actualizaciones…")
    return checkForUpdatesOnce({ silent: false })
  }, [])
}
