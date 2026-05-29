import { useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/core/theme/ThemeContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import client from "@/core/api/client"

export default function ConfiguracionPage() {
  const { theme, setTheme } = useTheme()

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      setError("Las contraseñas nuevas no coinciden")
      return
    }
    if (form.new_password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    setLoading(true)
    try {
      await client.post("/users/me/change-password", form)
      setSuccess(true)
      setForm({ current_password: "", new_password: "", confirm_password: "" })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || "Error al cambiar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">Preferencias de la aplicación</p>
      </div>

      {/* Apariencia */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-card-foreground">Apariencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme("light")}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition-colors",
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              <Sun className="h-4 w-4" />
              <span className="text-sm">Claro</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={[
                "flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition-colors",
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
            >
              <Moon className="h-4 w-4" />
              <span className="text-sm">Oscuro</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Cambiar contraseña */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-card-foreground">Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <p className="py-2 text-sm text-emerald-500">Contraseña actualizada correctamente</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contraseña actual</Label>
                <Input
                  type="password"
                  value={form.current_password}
                  onChange={(e) => set("current_password", e.target.value)}
                  required
                  autoComplete="current-password"
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
                <Input
                  type="password"
                  value={form.new_password}
                  onChange={(e) => set("new_password", e.target.value)}
                  required
                  autoComplete="new-password"
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Confirmar nueva contraseña</Label>
                <Input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => set("confirm_password", e.target.value)}
                  required
                  autoComplete="new-password"
                  className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <Button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Guardando..." : "Guardar contraseña"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
