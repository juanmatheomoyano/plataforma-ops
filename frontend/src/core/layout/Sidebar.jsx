import { NavLink } from "react-router-dom"
import { CreditCard, Home, LogOut, ShieldCheck } from "lucide-react"
import { useAuth } from "@/core/auth/useAuth"

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", Icon: Home },
  { to: "/crud-medios", label: "CRUD Medios de Pago", Icon: CreditCard },
]

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-slate-700/60 bg-[#1e293b]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
          <ShieldCheck className="h-4 w-4 text-slate-200" />
        </div>
        <span className="text-sm font-semibold text-slate-100 leading-tight">
          Plataforma<br />
          <span className="font-normal text-slate-400">Operativa</span>
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-slate-700 text-slate-100 font-medium"
                  : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div className="border-t border-slate-700/60 px-4 py-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-200 truncate">
            {user?.full_name || user?.username}
          </p>
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-red-950/40 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
