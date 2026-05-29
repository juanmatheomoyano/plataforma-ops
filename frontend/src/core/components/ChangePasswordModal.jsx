import { useState } from "react"
import client from "@/core/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ChangePasswordModal({ onClose }) {
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
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || "Error al cambiar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-base font-semibold text-card-foreground">Cambiar contraseña</h2>

        {success ? (
          <p className="py-4 text-center text-sm text-emerald-400">Contraseña actualizada correctamente</p>
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

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
