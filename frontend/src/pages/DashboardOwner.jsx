import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { PageContainer, PageHeader } from "@/components/PageHeader"
import client from "@/core/api/client"
import DashboardLegacy from "./DashboardLegacy"

const CURRENCY = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})
const NUMBER = new Intl.NumberFormat("es-AR")

const STATUS_COLORS = {
  paid: "#1F9E48",
  pending: "#F59E0B",
  cancelled: "#EF4444",
  unknown: "#94A3B8",
}
const STATUS_LABELS = {
  paid: "Aprobadas",
  pending: "Pendientes",
  cancelled: "Canceladas",
  unknown: "Otros",
}

export default function DashboardOwner({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notDeployed, setNotDeployed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await client.get("/dashboard/summary")
        if (!cancelled) setData(data)
      } catch (e) {
        // 404 → endpoint aún no deployado en backend (v2.0.1 pendiente en prod)
        // Fallback transparente al dashboard legacy — el user no debería sufrir un error.
        if (e.response?.status === 404) {
          if (!cancelled) setNotDeployed(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  // Fallback: si el endpoint no está desplegado, mostramos el dashboard legacy
  // sin friccionar al usuario. Se activa auto cuando el backend prod tenga el endpoint.
  if (notDeployed) {
    return <DashboardLegacy />
  }

  if (loading && !data) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Panel de control" title="Dashboard" />
        <SkeletonGrid />
      </PageContainer>
    )
  }

  const { gmv_30d, orders_24h, gmv_30d_series, sellers, top_sellers_30d, generated_at } = data

  const statusData = Object.entries(orders_24h.by_status || {}).map(([k, v]) => ({
    name: STATUS_LABELS[k] ?? k,
    value: v,
    color: STATUS_COLORS[k] ?? "#94A3B8",
  }))

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Panel de control · Ejecutivo"
        title={`Hola, ${(user?.full_name || user?.username || "").split(" ")[0]}`}
        subtitle={
          <span className="mono text-[11px] uppercase tracking-widest text-muted-foreground">
            última actualización · {new Date(generated_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        }
      />

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="GMV últimos 30d"
          value={CURRENCY.format(gmv_30d.value)}
          delta={gmv_30d.delta_pct}
          accent="green"
        />
        <KpiCard
          icon={ShoppingCart}
          label="Órdenes últimas 24h"
          value={NUMBER.format(orders_24h.total)}
          hint={`${orders_24h.by_status?.paid ?? 0} aprobadas`}
          accent="cyan"
        />
        <KpiCard
          icon={Store}
          label="Sellers activos"
          value={`${sellers.active} / ${sellers.total}`}
          hint={`${sellers.inactive} inactivos`}
          accent="ink"
        />
        <KpiCard
          icon={Activity}
          label="Ticket promedio 30d"
          value={
            orders_24h.total > 0
              ? CURRENCY.format(gmv_30d.value / Math.max(1, orders_24h.total * 30))
              : "—"
          }
          hint="estimado"
          accent="cyan"
        />
      </section>

      {/* Charts row */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Serie GMV — ocupa 2/3 */}
        <Card className="border-border bg-card p-6 shadow-soft lg:col-span-2">
          <div className="mb-4">
            <p className="eyebrow text-muted-foreground">GMV últimos 30 días</p>
            <h3 className="mt-0.5 font-display text-lg font-extrabold tracking-tightest text-foreground">
              Evolución diaria
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gmv_30d_series}>
                <defs>
                  <linearGradient id="gmvLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0AA0DC" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0AA0DC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                  tick={{ fill: "#5B7383", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  axisLine={{ stroke: "#DCE5EC" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: "#5B7383", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0B2230",
                    border: "1px solid #22384A",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#B8C8D3", fontFamily: "IBM Plex Mono", fontSize: 10 }}
                  formatter={(v) => CURRENCY.format(v)}
                  labelFormatter={(d) => new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0AA0DC"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#0AA0DC", stroke: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Torta órdenes 24h */}
        <Card className="border-border bg-card p-6 shadow-soft">
          <div className="mb-4">
            <p className="eyebrow text-muted-foreground">Órdenes 24h</p>
            <h3 className="mt-0.5 font-display text-lg font-extrabold tracking-tightest text-foreground">
              Por estado
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0B2230",
                    border: "1px solid #22384A",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-foreground/80">{s.name}</span>
                </span>
                <span className="mono font-medium tabular-nums text-foreground">{NUMBER.format(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Top sellers */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="eyebrow text-muted-foreground">Top sellers · GMV últimos 30 días</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        {top_sellers_30d.length === 0 ? (
          <Card className="border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sin órdenes registradas en el período.
          </Card>
        ) : (
          <Card className="border-border bg-card p-6 shadow-soft">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_sellers_30d} layout="vertical" margin={{ left: 30, right: 20 }}>
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                    tick={{ fill: "#5B7383", fontSize: 11, fontFamily: "IBM Plex Mono" }}
                    axisLine={{ stroke: "#DCE5EC" }}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    tick={{ fill: "#0B2230", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B2230",
                      border: "1px solid #22384A",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "12px",
                    }}
                    formatter={(v) => CURRENCY.format(v)}
                  />
                  <Bar dataKey="gmv" fill="#0AA0DC" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </section>
    </PageContainer>
  )
}

function KpiCard({ icon: Icon, label, value, delta, hint, accent = "cyan" }) {
  const accentMap = {
    cyan: "text-brand-cyan bg-brand-cyan/10",
    green: "text-brand-green bg-brand-green/10",
    ink: "text-brand-ink dark:text-brand-bg bg-brand-slate/10",
  }
  const positive = delta !== null && delta !== undefined && delta >= 0
  return (
    <Card className="group relative overflow-hidden border-border bg-card p-5 transition-all hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-xl p-2.5 ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {delta !== null && delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 mono text-[10px] font-semibold uppercase tracking-widest ${positive ? "text-brand-green" : "text-red-500"}`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="eyebrow text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-extrabold tracking-tightest text-foreground tabular-nums">
          {value}
        </p>
        {hint && <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  )
}

function SkeletonGrid() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-xl border border-border bg-card lg:col-span-2" />
        <div className="h-64 rounded-xl border border-border bg-card" />
      </div>
      <div className="h-80 rounded-xl border border-border bg-card" />
    </div>
  )
}
