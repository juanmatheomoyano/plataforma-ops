import { useState } from "react"
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
import client from "@/core/api/client"

export function ResetPasswordModal({ open, onClose, user }) {
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPassword !== confirm) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }
    setLoading(true)
    try {
      await client.post(`/users/${user.id}/reset-password`, {
        new_password: newPassword,
      })
      toast.success(`Contraseña de ${user.username} reseteada`)
      setNewPassword("")
      setConfirm("")
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al resetear")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-card-foreground sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">
            Resetear contraseña
            {user && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — {user.username}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-foreground/80">Nueva contraseña</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              className="border-border bg-muted text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground/80">Confirmar contraseña</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
              className="border-border bg-muted text-foreground"
            />
          </div>

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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Resetear"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
