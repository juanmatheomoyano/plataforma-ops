import { NavLink } from "react-router-dom"
import { CalendarCheck, CreditCard, Home, LogOut, ScrollText, Settings, Store, Users } from "lucide-react"
import { useAuth } from "@/core/auth/useAuth"

export function Sidebar() {
  const { user, logout, hasRole } = useAuth()

  const navItems = [
    { to: "/dashboard", label: "Dashboard", Icon: Home },
    ...(hasRole(["admin", "supervisor"]) ? [{ to: "/users", label: "Usuarios", Icon: Users }] : []),
    ...(hasRole(["admin", "supervisor", "analista"]) ? [{ to: "/sellers", label: "Sellers", Icon: Store }] : []),
    { to: "/crud-medios", label: "CRUD Medios de Pago", Icon: CreditCard },
    ...(hasRole(["admin", "supervisor"]) ? [{ to: "/eventos", label: "Eventos", Icon: CalendarCheck }] : []),
    ...(hasRole(["admin"]) ? [{ to: "/auditoria", label: "Auditoría", Icon: ScrollText }] : []),
  ]

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-center rounded-lg bg-[#009EE0] px-3 py-2">
          <img
            src="/logo_provincia_ops.svg"
            alt="Provincia Ops"
            className="h-11 w-auto"
          />
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-active text-sidebar-active-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + configuración + logout */}
      <div className="border-t border-border px-4 py-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.full_name || user?.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            [
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            ].join(" ")
          }
        >
          <Settings className="h-4 w-4" />
          Configuración
        </NavLink>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-red-950/40 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
        <p className="mt-3 px-3 text-xs text-muted-foreground/70 text-center select-text">
          v{import.meta.env.VITE_APP_VERSION}
        </p>
      </div>
    </aside>
  )
}
