import { useEffect, useState } from "react"
import { Eye, EyeOff, Loader2, Plus } from "lucide-react"
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
  integracion_spec: "",
  vendiendo: false,
  analista: "",
  notas: "",
  is_active: true,
}

const SPECS_VISIBLE_FOR = ["Manual", "Propia"]

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

// Inline "nueva opción" input dentro de un select
function NewOptionInput({ placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState("")
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-7 border-slate-600 bg-slate-900 text-xs text-slate-100"
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); if (value.trim()) onConfirm(value.trim()) }
          if (e.key === "Escape") onCancel()
        }}
      />
      <Button
        type="button" size="sm"
        className="h-7 px-2 text-xs bg-slate-600 hover:bg-slate-500"
        onClick={() => value.trim() && onConfirm(value.trim())}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}

export function SellerFormModal({ open, onClose, seller, onSaved }) {
  const isEdit = !!seller
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const [analistas, setAnalistas] = useState([])
  const [integraciones, setIntegraciones] = useState([])
  const [specs, setSpecs] = useState([])
  const [loadingSpecs, setLoadingSpecs] = useState(false)

  const [showNewIntegracion, setShowNewIntegracion] = useState(false)
  const [showNewSpec, setShowNewSpec] = useState(false)

  // Fetch analistas e integraciones al abrir
  useEffect(() => {
    if (!open) return
    client.get("/sellers/analistas").then(({ data }) => setAnalistas(data)).catch(() => {})
    client.get("/sellers/integraciones").then(({ data }) => setIntegraciones(data)).catch(() => {})
  }, [open])

  // Fetch specs cuando cambia la integración seleccionada
  useEffect(() => {
    const integracion = form.integracion
    if (!integracion || !SPECS_VISIBLE_FOR.includes(integracion)) {
      setSpecs([])
      return
    }
    setLoadingSpecs(true)
    client.get(`/sellers/integraciones/${encodeURIComponent(integracion)}/specs`)
      .then(({ data }) => setSpecs(data))
      .catch(() => setSpecs([]))
      .finally(() => setLoadingSpecs(false))
  }, [form.integracion])

  useEffect(() => {
    setShowNewIntegracion(false)
    setShowNewSpec(false)
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
            integracion_spec: seller.integracion_spec ?? "",
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

  function handleIntegracionChange(value) {
    set("integracion", value)
    set("integracion_spec", "")
  }

  async function handleNewSpec(specName) {
    try {
      const { data } = await client.post("/sellers/integraciones/specs", {
        integracion: form.integracion,
        spec: specName,
      })
      setSpecs((prev) => [...prev, data].sort((a, b) => a.spec.localeCompare(b.spec)))
      set("integracion_spec", specName)
      setShowNewSpec(false)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al crear especificación")
    }
  }

  function handleNewIntegracion(nombre) {
    if (!integraciones.includes(nombre)) {
      setIntegraciones((prev) => [...prev, nombre].sort())
    }
    handleIntegracionChange(nombre)
    setShowNewIntegracion(false)
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
          integracion: form.integracion || null,
          integracion_spec: form.integracion_spec || null,
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
          integracion: form.integracion || null,
          integracion_spec: form.integracion_spec || null,
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

  const showSpecs = SPECS_VISIBLE_FOR.includes(form.integracion)

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
            {/* Analista — select */}
            <Field label="Analista">
              <Select
                value={form.analista}
                onValueChange={(v) => set("analista", v === "__none__" ? "" : v)}
                disabled={loading}
              >
                <SelectTrigger className="border-slate-600 bg-slate-800 text-slate-100">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                  <SelectItem value="__none__" className="focus:bg-slate-700 text-slate-400">Sin asignar</SelectItem>
                  {analistas.map((a) => (
                    <SelectItem key={a.username} value={a.username} className="focus:bg-slate-700">
                      {a.full_name || a.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Fecha de creación — date picker nativo */}
            <Field label="Fecha de creación">
              <input
                type="date"
                value={form.fecha_creacion}
                onChange={(e) => set("fecha_creacion", e.target.value)}
                disabled={loading}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-60"
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

            {/* Creado por */}
            <Field label="Creado por">
              <Input
                value={form.creado_por}
                onChange={(e) => set("creado_por", e.target.value)}
                disabled={loading}
                className="border-slate-600 bg-slate-800 text-slate-100"
              />
            </Field>
          </div>

          {/* Integración */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Integración">
              {showNewIntegracion ? (
                <NewOptionInput
                  placeholder="Nombre de la integración"
                  onConfirm={handleNewIntegracion}
                  onCancel={() => setShowNewIntegracion(false)}
                />
              ) : (
                <Select
                  value={form.integracion}
                  onValueChange={(v) => {
                    if (v === "__nueva__") { setShowNewIntegracion(true); return }
                    handleIntegracionChange(v)
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className="border-slate-600 bg-slate-800 text-slate-100">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-800 text-slate-100 max-h-56">
                    {integraciones.map((i) => (
                      <SelectItem key={i} value={i} className="focus:bg-slate-700">{i}</SelectItem>
                    ))}
                    <SelectItem value="__nueva__" className="focus:bg-slate-700 text-blue-400">
                      + Nueva integración...
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>

            {/* Especificación — solo para Manual o Propia */}
            {showSpecs && (
              <Field label="Especificación">
                {showNewSpec ? (
                  <NewOptionInput
                    placeholder="Nombre de la especificación"
                    onConfirm={handleNewSpec}
                    onCancel={() => setShowNewSpec(false)}
                  />
                ) : (
                  <Select
                    value={form.integracion_spec}
                    onValueChange={(v) => {
                      if (v === "__nueva__") { setShowNewSpec(true); return }
                      set("integracion_spec", v)
                    }}
                    disabled={loading || loadingSpecs}
                  >
                    <SelectTrigger className="border-slate-600 bg-slate-800 text-slate-100">
                      <SelectValue placeholder={loadingSpecs ? "Cargando..." : "Seleccionar..."} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
                      {specs.map((s) => (
                        <SelectItem key={s.id} value={s.spec} className="focus:bg-slate-700">{s.spec}</SelectItem>
                      ))}
                      <SelectItem value="__nueva__" className="focus:bg-slate-700 text-blue-400">
                        + Nueva especificación...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            )}
          </div>

          {isEdit && (
            <div className="flex items-center justify-between pt-1">
              <Label className="text-slate-300">Activo</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => set("is_active", v)}
                disabled={loading}
              />
            </div>
          )}

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
