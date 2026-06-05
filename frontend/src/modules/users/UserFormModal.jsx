import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import client from "@/core/api/client"

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "analista", label: "Analista" },
  { value: "viewer", label: "Viewer" },
]

const EMPTY = {
  username: "",
  email: "",
  full_name: "",
  password: "",
  role: "viewer",
  is_active: true,
}

export function UserFormModal({ open, onClose, user, onSaved }) {
  const isEdit = !!user
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(
      isEdit
        ? {
            email: user.email,
            full_name: user.full_name ?? "",
            role: user.role,
            is_active: user.is_active,
          }
        : EMPTY
    )
  }, [user, open])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        const payload = {
          email: form.email || undefined,
          full_name: form.full_name || undefined,
          role: form.role,
          is_active: form.is_active,
        }
        const { data } = await client.patch(`/users/${user.id}`, payload)
        onSaved(data)
        toast.success("Usuario actualizado")
      } else {
        const { data } = await client.post("/users", {
          username: form.username,
          email: form.email,
          full_name: form.full_name || undefined,
          password: form.password,
          role: form.role,
        })
        onSaved(data)
        toast.success("Usuario creado")
      }
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!isEdit && (
            <Field label="Usuario *">
              <Input
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                required
                disabled={loading}
                className="border-border bg-muted text-foreground"
              />
            </Field>
          )}

          <Field label="Nombre completo">
            <Input
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              disabled={loading}
              className="border-border bg-muted text-foreground"
            />
          </Field>

          <Field label="Email *">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
              disabled={loading}
              className="border-border bg-muted text-foreground"
            />
          </Field>

          {!isEdit && (
            <Field label="Contraseña *">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
                disabled={loading}
                className="border-border bg-muted text-foreground"
              />
            </Field>
          )}

          <Field label="Rol">
            <Select
              value={form.role}
              onValueChange={(v) => set("role", v)}
              disabled={loading}
            >
              <SelectTrigger className="border-border bg-muted text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isEdit && (
            <div className="flex items-center justify-between">
              <Label className="text-foreground/80">Activo</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", v)}
                disabled={loading}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-foreground/80">{label}</Label>
      {children}
    </div>
  )
}
