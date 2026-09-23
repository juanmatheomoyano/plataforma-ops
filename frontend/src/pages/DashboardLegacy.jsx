import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  ScrollText,
  Settings,
  Store,
  TrendingUp,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/core/auth/useAuth"
import client from "@/core/api/client"

const ROLE_LABELS = {
  admin: "Administrador",
  supervisor: "Supervisor",
  analista: "Analista",
  viewer: "Viewer",
}

const OP_META = {
  R: { label: "Read", color: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/30" },
  C: { label: "Create", color: "text-brand-green bg-brand-green/10 border-brand-green/30" },
  U: { label: "Update", color: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30" },
  D: { label: "Delete", color: "text-red-600 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/30" },
}

const MODULES = [
  { label: "Sellers", path: "/sellers", roles: ["admin", "supervisor", "analista"], Icon: Store, desc: "Gestión y credenciales" },
  { label: "CRUD Medios de Pago", path: "/crud-medios", roles: ["admin", "supervisor", "analista", "viewer"], Icon: CreditCard, desc: "Reglas de pago VTEX" },
  { label: "Eventos", path: "/eventos", roles: ["admin", "supervisor"], Icon: Activity, desc: "Promociones y campañas" },
  { label: "Auditoría", path: "/auditoria", roles: ["admin"], Icon: ScrollText, desc: "Historial de acciones" },
  { label: "Usuarios", path: "/users", roles: ["admin", "supervisor"], Icon: Users, desc: "Cuentas y permisos" },
  { label: "Configuración", path: "/configuracion", roles: ["admin", "supervisor", "analista", "viewer"], Icon: Settings, desc: "Preferencias y actualizaciones" },
]

function StatCard({ icon: Icon, label, value, alert, accent = "cyan" }) {
  const accentMap = {
    cyan: "text-brand-cyan bg-brand-cyan/10",
    green: "text-brand-green bg-brand-green/10",
    red: "text-red-500 bg-red-500/10",
    ink: "text-brand-ink dark:text-brand-bg bg-brand-slate/10",
  }
  return (
    <Card className="group relative overflow-hidden border-border bg-card p-5 transition-all hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-xl p-2.5 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {alert && (
          <span className="mono text-[10px] uppercase tracking-widest text-red-500">
            atención
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="eyebrow text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-extrabold tracking-tightest text-foreground">
          {value ?? "—"}
        </p>
      </div>
    </Card>
  )
}

export default function DashboardLegacy() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()

  const isSupervisor = hasRole(["admin", "supervisor"])

  const [stats, setStats] = useState(null)
  const [operations, setOperations] = useState([])

  useEffect(() => {
    if (isSupervisor) {
      client.get("/crud-medios/stats").then(({ data }) => setStats(data)).catch(() => {})
    }
    client
      .get("/crud-medios/operations")
      .then(({ data }) => setOperations(data.slice(0, 5)))
      .catch(() => {})
  }, [isSupervisor])

  const accessibleModules = MODULES.filter((m) => hasRole(m.roles))

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 animate-fade-in">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">Panel de control</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tightest text-foreground">
            Hola, {(user?.full_name || user?.username || "").split(" ")[0]}
          </h1>
        </div>
        <Badge className="border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/15">
          {ROLE_LABELS[user?.role] ?? user?.role}
        </Badge>
      </header>

      {/* KPIs */}
      {isSupervisor && stats && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={TrendingUp} label="Sellers activos" value={stats.total_sellers_activos} accent="green" />
          <StatCard icon={Store} label="Sellers inactivos" value={stats.total_sellers_inactivos} accent="ink" />
          <StatCard
            icon={AlertTriangle}
            label="Keys vencidas"
            value={stats.total_sellers_keys_vencidas}
            alert={stats.total_sellers_keys_vencidas > 0}
            accent="red"
          />
          <StatCard icon={Activity} label="Ops hoy" value={stats.total_operaciones_hoy} accent="cyan" />
          <StatCard icon={Users} label="Usuarios activos" value={stats.total_usuarios_activos} accent="ink" />
        </section>
      )}

      {/* Módulos */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="eyebrow text-muted-foreground">Módulos</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accessibleModules.map(({ label, path, Icon, desc }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-brand-cyan/40 hover:shadow-soft"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-cyan/10 text-brand-cyan transition-colors group-hover:bg-brand-cyan group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {desc}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-brand-cyan" />
            </button>
          ))}
        </div>
      </section>

      {/* Últimas operaciones */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="eyebrow text-muted-foreground">Últimas operaciones</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        {operations.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-border bg-card/50 p-10 text-center">
            <div className="rounded-full bg-muted p-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sin operaciones registradas</p>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border bg-card p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left eyebrow text-muted-foreground">Fecha</th>
                  <th className="px-4 py-3 text-left eyebrow text-muted-foreground">Op.</th>
                  <th className="px-4 py-3 text-left eyebrow text-muted-foreground">Sellers</th>
                  <th className="px-4 py-3 text-left eyebrow text-muted-foreground">Matched</th>
                  <th className="px-4 py-3 text-left eyebrow text-muted-foreground">Errores</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const meta = OP_META[op.operacion] ?? OP_META.R
                  return (
                    <tr key={op.id} className="border-b border-border/40 last:border-b-0 hover:bg-accent/5">
                      <td className="px-4 py-3">
                        <span className="mono text-[11px] text-muted-foreground">
                          {new Date(op.started_at).toLocaleString("es-AR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        {op.dry_run && (
                          <span className="ml-1.5 mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            dry
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground/80 tabular-nums">{op.total_sellers}</td>
                      <td className="px-4 py-3 text-foreground/80 tabular-nums">{op.total_matched}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {op.total_errors > 0 ? (
                          <span className="font-semibold text-red-500">{op.total_errors}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  )
}
