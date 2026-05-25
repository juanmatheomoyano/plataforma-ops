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
  R: { label: "Read", cls: "border-blue-700 bg-blue-900/40 text-blue-400" },
  C: { label: "Create", cls: "border-emerald-700 bg-emerald-900/40 text-emerald-400" },
  U: { label: "Update", cls: "border-amber-700 bg-amber-900/40 text-amber-400" },
  D: { label: "Delete", cls: "border-red-700 bg-red-900/40 text-red-400" },
}

const MODULES = [
  { label: "Sellers", path: "/sellers", roles: ["admin", "analista_senior", "analista", "viewer"] },
  { label: "CRUD Medios de Pago", path: "/crud-medios", roles: ["admin", "analista_senior", "analista", "viewer"] },
  { label: "Usuarios", path: "/users", roles: ["admin"] },
]

function StatCard({ icon: Icon, label, value, alert }) {
  return (
    <Card className="border-slate-700 bg-[#1e293b]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5">
          <Icon className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl font-semibold text-slate-100">{value ?? "—"}</span>
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
          <h1 className="text-2xl font-semibold text-slate-100">
            Bienvenido, {user?.full_name || user?.username}
          </h1>
          <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-slate-600">
            {ROLE_LABELS[user?.role] ?? user?.role}
          </Badge>
        </div>
        <p className="text-sm text-slate-400">Panel de control — Provincia Compras</p>
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
                <Card className="border-slate-700 bg-[#1e293b] col-span-2 sm:col-span-3">
                  <CardContent className="p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Último operador</p>
                    <p className="mt-0.5 text-slate-200 font-medium">{stats.ultimo_operador}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Módulos</h2>
        <div className="flex flex-wrap gap-2">
          {accessibleModules.map((m) => (
            <button
              key={m.path}
              onClick={() => navigate(m.path)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-700 hover:text-slate-100"
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Últimas 5 operaciones */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Últimas operaciones
        </h2>
        {operations.length === 0 ? (
          <p className="text-sm text-slate-500">Sin operaciones registradas</p>
        ) : (
          <Card className="border-slate-700 bg-[#1e293b] overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Op.</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sellers</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Matched</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Errores</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op) => {
                  const badge = OP_BADGE[op.operacion] ?? OP_BADGE.R
                  return (
                    <tr key={op.id} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                      <td className="px-4 py-2.5 text-xs text-slate-400">
                        {new Date(op.started_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {op.dry_run && (
                          <span className="ml-1 text-xs text-slate-500">DRY</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-300">{op.total_sellers}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-300">{op.total_matched}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {op.total_errors > 0 ? (
                          <span className="text-red-400">{op.total_errors}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
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
