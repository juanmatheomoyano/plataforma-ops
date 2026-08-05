import { useEffect, useState } from "react"

const STORAGE_KEY = "last_seen_version"
const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || "dev"

/**
 * Detecta si la app corriendo es una versión distinta a la última que el
 * usuario vio (persistido en localStorage).
 *
 * Retorna { newVersion, dismiss }:
 *   - newVersion: string con la versión nueva a anunciar, o null si no hay update.
 *   - dismiss(): marca la versión actual como "vista" y esconde el modal.
 *
 * Casos:
 *   1. Primera instalación (no hay `last_seen_version` en localStorage):
 *      → NO se anuncia (usuario nuevo, no viene de update). Se persiste silenciosamente.
 *   2. Ya vio esta versión (`last_seen_version === CURRENT_VERSION`):
 *      → NO se anuncia.
 *   3. Viene de una versión anterior (`last_seen_version < CURRENT_VERSION`):
 *      → Se anuncia con `newVersion = CURRENT_VERSION`.
 */
export function useVersionAnnouncement() {
  const [newVersion, setNewVersion] = useState(null)

  useEffect(() => {
    if (CURRENT_VERSION === "dev") return

    let stored
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      return
    }

    if (!stored) {
      // Primera instalación: persistir sin anunciar.
      try {
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
      } catch {
        // localStorage bloqueado: ignorar.
      }
      return
    }

    if (stored !== CURRENT_VERSION) {
      setNewVersion(CURRENT_VERSION)
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION)
    } catch {
      // ignorar
    }
    setNewVersion(null)
  }

  return { newVersion, dismiss }
}
