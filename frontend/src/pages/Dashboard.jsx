import { CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/core/auth/useAuth"

const ROLE_LABELS = {
  admin: "Administrador",
  analista_senior: "Analista Senior",
  analista: "Analista",
  viewer: "Viewer",
}

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-100">
            Bienvenido, {user?.full_name || user?.username}
          </h1>
          <Badge
            variant="secondary"
            className="bg-slate-700 text-slate-300 border-slate-600"
          >
            {ROLE_LABELS[user?.role] ?? user?.role}
          </Badge>
        </div>
        <p className="text-sm text-slate-400">Panel de control — Provincia Compras</p>
      </div>

      {/* Card de estado del sprint */}
      <Card className="border-slate-700 bg-[#1e293b] text-slate-100 max-w-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-slate-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            Sprint 2 completado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            Auth frontend operativo — login, refresh token, rutas privadas y
            sidebar configurados correctamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
