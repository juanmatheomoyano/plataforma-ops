import { KeyRound, Lock, ShieldCheck, Timer } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PageContainer, PageHeader } from "@/components/PageHeader"

/**
 * Payway — Automatización de rotación de contraseñas.
 *
 * Rol requerido: "administrativo" (v2 multi-rol) o legacy "admin"/"supervisor".
 *
 * Estado: skeleton (v2.0.0). La lógica real (schedule + rotación real contra
 * Payway API + auditoría) se implementa en v2.0.1+ como iteración.
 */
export default function PaywayPage() {
  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        eyebrow="Módulo"
        title="Automatización Payway"
        subtitle="Rotación programada de contraseñas de acceso Payway"
      />

      <Card className="border-dashed border-brand-cyan/40 bg-gradient-to-br from-brand-cyan/5 to-transparent p-8 shadow-soft">
        <div className="flex items-start gap-5">
          <div className="rounded-2xl bg-brand-cyan/15 p-3.5 text-brand-cyan">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="eyebrow text-brand-cyan">Próximamente · v2.0.1</p>
            <h2 className="mt-1 font-display text-xl font-extrabold tracking-tightest">
              Módulo en preparación
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Este módulo va a permitir agendar la rotación automática de
              contraseñas de acceso a Payway con verificación end-to-end
              y auditoría de cada cambio.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature
            icon={Timer}
            title="Programación"
            desc="Cron por seller o batch, con ventanas horarias configurables."
          />
          <Feature
            icon={KeyRound}
            title="Rotación segura"
            desc="Passwords generadas con entropía fuerte, encriptadas Fernet."
          />
          <Feature
            icon={Lock}
            title="Auditoría"
            desc="Cada rotación queda logueada en audit_log con éxito/error."
          />
        </div>
      </Card>
    </PageContainer>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-cyan" />
        <p className="font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}
