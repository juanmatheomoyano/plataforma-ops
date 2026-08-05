import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import * as Sentry from "@sentry/react"

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "unknown"

/**
 * Chequea si hay una nueva versión disponible via tauri-plugin-updater.
 * Devuelve `{ status, version?, error? }`.
 *
 * status:
 *   "not-tauri"     → no estamos corriendo dentro de Tauri (dev browser)
 *   "no-update"     → check OK, no hay update disponible
 *   "available"     → update disponible pero usuario canceló
 *   "installing"    → usuario aceptó, en proceso
 *   "installed"     → instalado (se va a relaunch)
 *   "error"         → algo falló, ver `error`
 *
 * Todos los pasos loguean con console.info + Sentry breadcrumbs.
 * Errores se envían a Sentry con contexto y se muestran al usuario con toast.
 */
export async function checkForUpdatesOnce({ silent = false } = {}) {
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

    // Diálogo nativo Tauri (más confiable que window.confirm en WebView2).
    const userConfirmed = await ask(
      `Nueva versión ${update.version} disponible.\n\n${update.body || "Sin notas"}\n\n¿Instalar ahora?`,
      { title: "Provincia Ops — Actualización", okLabel: "Instalar", cancelLabel: "Después" }
    )

    if (!userConfirmed) {
      console.info("[updater] user declined")
      return { status: "available", version: update.version }
    }

    toast.info(`Descargando v${update.version}…`, { duration: 20000 })
    console.info("[updater] downloadAndInstall start")
    await update.downloadAndInstall()
    console.info("[updater] downloadAndInstall done, relaunching")
    await relaunch()
    return { status: "installed" }
  } catch (e) {
    // Nunca ocultar — mostrar al user + mandar a Sentry con contexto.
    const errMsg = e?.message || String(e)
    console.error("[updater] failed", { ...ctx, error: errMsg })
    Sentry.captureException(e, { tags: { component: "auto-updater" }, extra: ctx })
    if (!silent) {
      toast.error(`No se pudo chequear actualizaciones: ${errMsg}`, {
        duration: 8000,
        description: `Versión actual: v${CURRENT_VERSION}`,
      })
    }
    return { status: "error", error: errMsg }
  }
}

/**
 * Hook: dispara el check automático 5s después de montarse.
 * `silent: true` en el startup — no muestra toast si no hay update (el user
 * no pidió chequear, es automático).
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
