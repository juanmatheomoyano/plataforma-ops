import { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import {
  CalendarCheck,
  ChevronUp,
  CreditCard,
  Home,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react"
import { useAuth } from "@/core/auth/useAuth"
import { Logo, ProvinciaMark } from "@/components/Logo"

const COLLAPSE_BREAKPOINT_PX = 1180
const STORAGE_KEY = "sidebar_collapsed"

function useCollapseState() {
  // Persistimos la preferencia manual; el auto-collapse por resize solo aplica
  // cuando el usuario no forzó nada.
  const [manual, setManual] = useState(() => {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === "true") return true
    if (raw === "false") return false
    return null
  })
  const [auto, setAuto] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < COLLAPSE_BREAKPOINT_PX
  )

  useEffect(() => {
    function onResize() {
      setAuto(window.innerWidth < COLLAPSE_BREAKPOINT_PX)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const collapsed = manual ?? auto
  const toggle = () => {
    const next = !collapsed
    setManual(next)
    window.localStorage.setItem(STORAGE_KEY, String(next))
  }
  return [collapsed, toggle]
}

export function Sidebar() {
  const { user, logout, hasRole } = useAuth()
  const [collapsed, toggle] = useCollapseState()

  const dashboard = { to: "/dashboard", label: "Dashboard", Icon: Home }

  const sections = [
    {
      title: "Operación",
      items: [
        ...(hasRole(["admin", "supervisor", "analista"])
          ? [{ to: "/sellers", label: "Sellers", Icon: Store }]
          : []),
        { to: "/crud-medios", label: "CRUD Medios de Pago", Icon: CreditCard },
        ...(hasRole(["admin", "supervisor"])
          ? [{ to: "/eventos", label: "Eventos", Icon: CalendarCheck }]
          : []),
      ],
    },
    {
      title: "Análisis",
      items: [
        ...(hasRole(["admin"])
          ? [{ to: "/auditoria", label: "Auditoría", Icon: ScrollText }]
          : []),
      ],
    },
    {
      title: "Automatización",
      items: [
        ...(hasRole(["admin", "supervisor", "administrativo"])
          ? [{ to: "/payway", label: "Payway", Icon: ShieldCheck }]
          : []),
      ],
    },
    {
      title: "Administración",
      items: [
        ...(hasRole(["admin", "supervisor"])
          ? [{ to: "/users", label: "Usuarios", Icon: Users }]
          : []),
      ],
    },
  ].filter((section) => section.items.length > 0)

  return (
    <aside
      className={[
        "relative flex h-screen flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-64",
      ].join(" ")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% -10%, rgba(10,160,220,0.16), transparent 55%), radial-gradient(circle at 90% 110%, rgba(38,181,84,0.08), transparent 60%)",
        }}
      />

      {/* Logo + toggle */}
      <div
        className={[
          "relative flex items-center pt-5 pb-4",
          collapsed ? "flex-col gap-3 px-2" : "justify-between px-5",
        ].join(" ")}
      >
        {collapsed ? (
          <ProvinciaMark size={36} radius={10} monoSize={16} />
        ) : (
          <Logo variant="wordmark" size="md" theme="on-dark" />
        )}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expandir barra" : "Colapsar barra"}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div
        aria-hidden
        className="relative mx-4 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
      />

      {/* Navegación */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {/* Dashboard suelto arriba */}
        <SidebarLink item={dashboard} collapsed={collapsed} />

        {sections.map((section) => (
          <div key={section.title} className="mt-5">
            {!collapsed && (
              <div className="px-3 pb-2 flex items-center gap-2">
                <span className="eyebrow text-sidebar-muted/80">{section.title}</span>
                <span className="h-px flex-1 bg-white/5" />
              </div>
            )}
            {collapsed && <div className="mx-3 mb-2 h-px bg-white/5" />}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario colapsable */}
      <div className="relative border-t border-white/8 px-2 py-3">
        <UserMenu user={user} onLogout={logout} collapsed={collapsed} />
        {!collapsed && (
          <div className="mt-3 flex items-center justify-between px-3">
            <span className="mono text-[10px] tracking-widest text-slate-500 uppercase">
              versión
            </span>
            <span className="mono text-[11px] font-medium text-slate-300 select-text">
              v{import.meta.env.VITE_APP_VERSION}
            </span>
          </div>
        )}
        {collapsed && (
          <p className="mt-2 text-center mono text-[9px] tracking-widest text-slate-500 select-text">
            v{import.meta.env.VITE_APP_VERSION}
          </p>
        )}
      </div>
    </aside>
  )
}

function SidebarLink({ item, collapsed }) {
  const { to, label, Icon } = item
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          "group relative flex items-center rounded-lg text-sm transition-all",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
          isActive
            ? "bg-brand-cyan/95 text-white font-semibold shadow-brand-glow"
            : "text-slate-300 hover:bg-white/5 hover:text-white",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden
            className={[
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full transition-all",
              isActive
                ? "bg-brand-lime shadow-[0_0_12px_rgba(185,212,0,0.6)]"
                : "bg-transparent group-hover:bg-white/20",
            ].join(" ")}
          />
          <Icon
            className={[
              "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
              isActive ? "text-white" : "text-slate-400",
            ].join(" ")}
          />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  )
}

function UserMenu({ user, onLogout, collapsed }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const esc = (e) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  const label = user?.full_name || user?.username || "Usuario"
  const roleLabel = formatRole(user?.role)
  const initials = getInitials(label)

  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          className={[
            "absolute bottom-full mb-2 rounded-lg border border-white/10 bg-brand-ink-2/95 backdrop-blur-md py-1 shadow-2xl animate-fade-in",
            collapsed ? "left-full ml-2 w-52" : "inset-x-0",
          ].join(" ")}
        >
          <MenuItem
            icon={Settings}
            label="Configuración"
            to="/configuracion"
            onNavigate={() => setOpen(false)}
          />
          <MenuItem
            icon={MessageSquare}
            label="Dar feedback"
            onClick={() => setOpen(false)}
            disabled
          />
          <div className="my-1 h-px bg-white/10" />
          <MenuItem
            icon={LogOut}
            label="Cerrar sesión"
            danger
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? label : undefined}
        className={[
          "group flex w-full items-center rounded-lg text-left text-sm text-slate-200 transition-colors hover:bg-white/5",
          collapsed ? "justify-center px-2 py-2" : "gap-2 px-3 py-2",
        ].join(" ")}
      >
        {collapsed ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-green-light/95 text-[11px] font-bold text-brand-ink shadow-sm">
            {initials}
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-white">{label}</span>
              {roleLabel && (
                <>
                  <span className="mx-1.5 text-slate-500">·</span>
                  <span className="mono text-[11px] uppercase tracking-wider text-slate-400">
                    {roleLabel}
                  </span>
                </>
              )}
            </span>
            <ChevronUp
              className={[
                "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </>
        )}
      </button>
    </div>
  )
}

function MenuItem({ icon: Icon, label, to, onClick, onNavigate, danger, disabled }) {
  const base =
    "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
  const tone = disabled
    ? "text-slate-500 cursor-not-allowed"
    : danger
    ? "text-slate-200 hover:bg-red-500/15 hover:text-red-300"
    : "text-slate-200 hover:bg-white/8 hover:text-white"

  if (to) {
    return (
      <NavLink to={to} onClick={onNavigate} className={`${base} ${tone}`}>
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    )
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${tone}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {disabled && (
        <span className="ml-auto mono text-[9px] uppercase tracking-widest text-slate-500">
          próximo
        </span>
      )}
    </button>
  )
}

function formatRole(role) {
  if (!role) return null
  const map = { admin: "admin", supervisor: "supervisor", analista: "analista" }
  return map[role] ?? role
}

function getInitials(name) {
  if (!name) return "PO"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "PO"
}
