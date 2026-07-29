/**
 * Sentry init + helpers para el frontend.
 * Se inicializa solo si `VITE_SENTRY_DSN` está seteado.
 */
import * as Sentry from "@sentry/react"

const DSN = import.meta.env.VITE_SENTRY_DSN
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "dev"
const APP_ENV = import.meta.env.MODE || "development"

export function initSentry() {
  if (!DSN) return
  Sentry.init({
    dsn: DSN,
    release: `provincia-ops-frontend@${APP_VERSION}`,
    environment: APP_ENV,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    sendDefaultPii: false,
  })
}

export function setSentryUser(user) {
  if (!DSN) return
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({ id: String(user.id), username: user.username })
  Sentry.setTag("role", user.role)
}
