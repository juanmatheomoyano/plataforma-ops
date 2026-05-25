import { useEffect, useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import client from "@/core/api/client"

const EMPTY = {
  id_ecommerce: "",
  seller_name: "",
  seller_id: "",
  app_key: "",
  app_token: "",
  creado_por: "",
  fecha_creacion: "",
  estado_keys: "activo",
  integracion: "",
  vendiendo: false,
  analista: "",
  notas: "",
  is_active: true,
}

function PasswordField({ label, value, onChange, disabled, placeholder, required }) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}{required && " *"}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className="border-slate-600 bg-slate-800 pr-9 text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      {children}
    </div>
  )
}

export function SellerFormModal({ open, onClose, seller, onSaved }) {
  const isEdit = !!seller
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setForm(
      isEdit
        ? {
            id_ecommerce: seller.id_ecommerce ?? "",
            seller_name: seller.seller_name ?? "",
            seller_id: seller.seller_id ?? "",
            app_key: "",
            app_token: "",
            creado_por: seller.creado_por ?? "",
            fecha_creacion: seller.fecha_creacion ?? "",
            estado_keys: seller.estado_keys ?? "activo",
            integracion: seller.integracion ?? "",
            vendiendo: seller.vendiendo ?? false,
            analista: seller.analista ?? "",
            notas: seller.notas ?? "",
            is_active: seller.is_active ?? true,
          }
        : EMPTY
    )
  }, [seller, open])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEdit) {
        const payload = {
          id_ecommerce: form.id_ecommerce || undefined,
          seller_name: form.seller_name || undefined,
          creado_por: form.creado_por || undefined,
          fecha_creacion: form.fecha_creacion || undefined,
          estado_keys: form.estado_keys,
          integracion: form.integracion || undefined,
          vendiendo: form.vendiendo,
          analista: form.analista || null,
          notas: form.notas || null,
          is_active: form.is_active,
          ...(form.app_key ? { app_key: form.app_key } : {}),
          ...(form.app_token ? { app_token: form.app_token } : {}),
        }
        const { data } = await client.patch(`/sellers/${seller.id}`, payload)
        onSaved(data)
        toast.success("Seller actualizado")
      } else {
        const { data } = await client.post("/sellers", {
          id_ecommerce: form.id_ecommerce,
          seller_name: form.seller_name,
          seller_id: form.seller_id,
          app_key: form.app_key,
          app_token: form.app_token,
          creado_por: form.creado_por || undefined,
          fecha_creacion: form.fecha_creacion || undefined,
          estado_keys: form.estado_keys,
          integracion: form.integracion || undefined,
          vendiendo: form.vendiendo,
          analista: form.analista || null,
          notas: form.notas || null,
        })
        onSaved(data)
        toast.success("Seller creado")
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
      <DialogContent className="border-slate-700 bg-[#1e293b] text-slate-100 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? "Editar seller" : "Nuevo seller"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Id Ecommerce *">
              <Input
                value={form.id_ecommerce}
                onChange={(e) => set("id_ecommerce", e.target.value)}
                required disabled={loading}
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
            <Field label="Nombre de Fantasía *">
              <Input
                value={form.seller_name}
                onChange={(e) => set("seller_name", e.target.value)}
                required disabled={loading}
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
          </div>

          <Field label={isEdit ? "Seller ID" : "Seller ID *"}>
            <Input
              value={form.seller_id}
              onChange={(e) => set("seller_id", e.target.value)}
              required={!isEdit}
              disabled={loading || isEdit}
              className="border-slate-600 bg-slate-800 text-slate-100 disabled:opacity-60"
            />
            {isEdit && (
              <p className="text-xs text-slate-500 mt-1">El Seller ID no puede modificarse</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <PasswordField
              label="App Key"
              value={form.app_key}
              onChange={(e) => set("app_key", e.target.value)}
              disabled={loading}
              placeholder={isEdit ? "••••••••" : ""}
              required={!isEdit}
            />
            <PasswordField
              label="App Token"
              value={form.app_token}
              onChange={(e) => set("app_token", e.target.value)}
              disabled={loading}
              placeholder={isEdit ? "••••••••" : ""}
              required={!isEdit}
            />
          </div>
          <p className="text-xs text-amber-500/80">
            Una vez guardado no podrás ver este valor nuevamente
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Creado por">
              <Input
                value={form.creado_por}
                onChange={(e) => set("creado_por", e.target.value)}
                disabled={loading}
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
            <Field label="Fecha de creación">
              <Input
                value={form.fecha_creacion}
                onChange={(e) => set("fecha_creacion", e.target.value)}
                disabled={loading}
                placeholder="ej. 2024-01-15"
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Estado Keys">
              <Select
                value={form.estado_keys}
                onValueChange={(v) => set("estado_keys", v)}
                disabled={loading}
              >
                <SelectTrigger className="border-slate-600 bg-slate-800 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="activo" className="focus:bg-slate-700">Activo</SelectItem>
                  <SelectItem value="inactivo" className="focus:bg-slate-700">Inactivo</SelectItem>
                  <SelectItem value="vencido" className="focus:bg-slate-700">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Vendiendo">
              <Select
                value={form.vendiendo ? "si" : "no"}
                onValueChange={(v) => set("vendiendo", v === "si")}
                disabled={loading}
              >
                <SelectTrigger className="border-slate-600 bg-slate-800 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="si" className="focus:bg-slate-700">Sí</SelectItem>
                  <SelectItem value="no" className="focus:bg-slate-700">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Integración">
              <Input
                value={form.integracion}
                onChange={(e) => set("integracion", e.target.value)}
                disabled={loading}
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Analista">
              <Input
                value={form.analista}
                onChange={(e) => set("analista", e.target.value)}
                disabled={loading}
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
            {isEdit && (
              <div className="flex items-center justify-between pt-6">
                <Label className="text-slate-300">Activo</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => set("is_active", v)}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          <Field label="Notas">
            <Textarea
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
              disabled={loading}
              rows={3}
              className="border-slate-600 bg-slate-800 text-slate-100 resize-none"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button" variant="ghost" onClick={onClose} disabled={loading}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit" disabled={loading}
              className="bg-slate-100 text-slate-900 hover:bg-slate-200"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
