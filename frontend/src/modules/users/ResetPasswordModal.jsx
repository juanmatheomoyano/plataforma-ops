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
      <DialogContent className="border-slate-700 bg-[#1e293b] text-slate-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Resetear contraseña
            {user && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                — {user.username}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nueva contraseña</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              className="border-slate-600 bg-slate-800 text-slate-100"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300">Confirmar contraseña</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading}
              className="border-slate-600 bg-slate-800 text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-slate-100 text-slate-900 hover:bg-slate-200"
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
