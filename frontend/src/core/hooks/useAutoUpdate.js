import { useEffect } from "react"
import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

export function useAutoUpdate() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
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
        // Silencioso — no interrumpir al usuario si falla el check
        console.log("Update check:", e)
      }
    }
    const timer = setTimeout(checkForUpdates, 3000)
    return () => clearTimeout(timer)
  }, [])
}
