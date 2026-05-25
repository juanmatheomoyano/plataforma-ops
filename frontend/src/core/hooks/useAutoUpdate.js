import { useEffect } from "react"

export function useAutoUpdate() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        // Solo correr en Tauri, no en browser
        if (!window.__TAURI_INTERNALS__) return

        const { check } = await import("@tauri-apps/plugin-updater")
        const { relaunch } = await import("@tauri-apps/plugin-process")

        const update = await check()
        if (update?.available) {
          const userConfirmed = window.confirm(
            `Nueva versión ${update.version} disponible.\n\n${update.body}\n\n¿Instalar ahora?`
          )
          if (userConfirmed) {
            await update.downloadAndInstall()
            await relaunch()
          }
        }
      } catch (e) {
        console.log("Auto-update check failed (silencioso):", e)
      }
    }
    const timer = setTimeout(checkForUpdates, 5000)
    return () => clearTimeout(timer)
  }, [])
}
