import { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"
import {
  CalendarCheck,
  ChevronUp,
  CreditCard,
  Home,
  LogOut,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react"
import { useAuth } from "@/core/auth/useAuth"
import { Logo } from "@/components/Logo"

export function Sidebar() {
  const { user, logout, hasRole } = useAuth()

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
    <aside className="relative flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% -10%, rgba(10,160,220,0.16), transparent 55%), radial-gradient(circle at 90% 110%, rgba(38,181,84,0.08), transparent 60%)",
        }}
      />

      {/* Logo */}
      <div className="relative px-5 pt-6 pb-5">
        <Logo variant="wordmark" size="md" theme="on-dark" />
      </div>

      <div
        aria-hidden
        className="relative mx-5 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
      />

      {/* Navegación */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-5">
        {/* Dashboard suelto arriba */}
        <SidebarLink item={dashboard} />

        {sections.map((section) => (
          <div key={section.title} className="mt-6">
            <div className="px-3 pb-2 flex items-center gap-2">
              <span className="eyebrow text-sidebar-muted/80">{section.title}</span>
              <span className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarLink key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario colapsable */}
      <div className="relative border-t border-white/8 px-3 py-3">
        <UserMenu user={user} onLogout={logout} />
        <div className="mt-3 flex items-center justify-between px-2">
          <span className="mono text-[10px] tracking-widest text-slate-500 uppercase">
            versión
          </span>
          <span className="mono text-[11px] font-medium text-slate-300 select-text">
            v{import.meta.env.VITE_APP_VERSION}
          </span>
        </div>
      </div>
    </aside>
  )
}

function SidebarLink({ item }) {
  const { to, label, Icon } = item
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
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
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function UserMenu({ user, onLogout }) {
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

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute inset-x-0 bottom-full mb-2 rounded-lg border border-white/10 bg-brand-ink-2/95 backdrop-blur-md py-1 shadow-2xl animate-fade-in">
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
        className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-white/5"
      >
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
