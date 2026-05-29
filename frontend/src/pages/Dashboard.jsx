import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, CreditCard, Users, Activity, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/core/auth/useAuth"
import client from "@/core/api/client"

const ROLE_LABELS = {
  admin: "Administrador",
  analista_senior: "Analista Senior",
  analista: "Analista",
  viewer: "Viewer",
}

const OP_BADGE = {
  R: { label: "Read",   cls: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  C: { label: "Create", cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  U: { label: "Update", cls: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  D: { label: "Delete", cls: "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-400" },
}

const MODULES = [
  { label: "Sellers", path: "/sellers", roles: ["admin", "analista_senior", "analista", "viewer"] },
  { label: "CRUD Medios de Pago", path: "/crud-medios", roles: ["admin", "analista_senior", "analista", "viewer"] },
  { label: "Usuarios", path: "/users", roles: ["admin"] },
]

function StatCard({ icon: Icon, label, value, alert }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg border border-border bg-muted p-2.5">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl font-semibold text-foreground">{value ?? "—"}</span>
            {alert && (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const navigate = useNavigate()

  const isSenior = hasRole(["admin", "analista_senior"])
  const isAdmin = hasRole(["admin"])

  const [stats, setStats] = useState(null)
  const [operations, setOperations] = useState([])

  useEffect(() => {
    if (isSenior) {
      client.get("/crud-medios/stats").then(({ data }) => setStats(data)).catch(() => {})
    }
    client.get("/crud-medios/operations").then(({ data }) => setOperations(data.slice(0, 5))).catch(() => {})
  }, [isSenior])

  const accessibleModules = MODULES.filter((m) => hasRole(m.roles))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            Bienvenido, {user?.full_name || user?.username}
          </h1>
          <Badge variant="secondary" className="bg-muted text-foreground/80 border-border">
            {ROLE_LABELS[user?.role] ?? user?.role}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Panel de control — Provincia Compras</p>
      </div>

      {/* Métricas — solo admin/analista_senior */}
      {isSenior && stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={TrendingUp} label="Sellers activos" value={stats.total_sellers_activos} />
          <StatCard icon={Users} label="Sellers inactivos" value={stats.total_sellers_inactivos} />
          <StatCard
            icon={AlertTriangle}
            label="Keys vencidas"
            value={stats.total_sellers_keys_vencidas}
            alert={stats.total_sellers_keys_vencidas > 0}
          />
          <StatCard icon={Activity} label="Operaciones hoy" value={stats.total_operaciones_hoy} />
          {isAdmin && (
            <>
              <StatCard icon={Users} label="Usuarios activos" value={stats.total_usuarios_activos} />
              {stats.ultimo_operador && (
                <Card className="border-border bg-card col-span-2 sm:col-span-3">
                  <CardContent className="p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Último operador</p>
                    <p className="mt-0.5 text-foreground/80 font-medium">{stats.ultimo_operador}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Módulos</h2>
        <div className="flex flex-wrap gap-2">
          {accessibleModules.map((m) => (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              className="rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Últimas 5 operaciones */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Últimas operaciones
        </h2>
        {operations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin operaciones registradas</p>
        ) : (
          <Card className="border-border bg-card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Op.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sellers</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matched</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Errores</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const badge = OP_BADGE[op.operacion] ?? OP_BADGE.R
                  return (
                    <tr key={op.id} className="border-b border-border/40 hover:bg-accent/30">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(op.started_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {op.dry_run && (
                          <span className="ml-1 text-xs text-muted-foreground">DRY</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-foreground/80">{op.total_sellers}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground/80">{op.total_matched}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {op.total_errors > 0 ? (
                          <span className="text-red-400">{op.total_errors}</span>
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
      </div>
    </div>
  )
}
