import { useEffect, useMemo, useRef, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Download, Pencil, Plug, Search, Upload, UserX } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/core/auth/useAuth"
import client from "@/core/api/client"
import { SellerFormModal } from "./SellerFormModal"
import { ImportResultModal } from "./ImportResultModal"

const ESTADO_BADGE = {
  activo: "border-emerald-700 bg-emerald-900/40 text-emerald-400",
  inactivo: "border-border bg-muted text-muted-foreground",
  vencido: "border-orange-700 bg-orange-900/40 text-orange-400",
}

export default function SellersPage() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole(["admin"])
  const canExport = hasRole(["admin", "analista_senior"])

  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editSeller, setEditSeller] = useState(null)

  const [importResult, setImportResult] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  const [search, setSearch] = useState("")
  const [filterEstadoKeys, setFilterEstadoKeys] = useState("todos")
  const [filterVendiendo, setFilterVendiendo] = useState("todos")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterAnalista, setFilterAnalista] = useState("todos")

  const fileInputRef = useRef(null)

  async function fetchSellers() {
    try {
      const { data } = await client.get("/sellers")
      setSellers(data)
    } catch {
      toast.error("Error al cargar sellers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSellers() }, [])

  function onSaved(saved) {
    setSellers((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  async function handleDeactivate(seller) {
    try {
      const { data } = await client.post(`/sellers/${seller.id}/deactivate`)
      onSaved(data)
      toast.success(`${seller.seller_name} desactivado`)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al desactivar")
    }
  }

  async function handleTestConnection(seller) {
    const toastId = toast.loading(`Probando conexión con ${seller.seller_id}…`)
    try {
      const { data } = await client.post(`/sellers/${seller.id}/test-connection`)
      toast.dismiss(toastId)
      if (data.ok) {
        toast.success(`Conexión OK — ${seller.seller_id}`)
      } else {
        toast.error(`Conexión fallida: ${data.error}`)
      }
    } catch {
      toast.dismiss(toastId)
      toast.error("Error al probar conexión")
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImporting(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const { data } = await client.post("/sellers/import-update", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setImportResult(data)
      setImportOpen(true)
      if ((data.actualizados ?? 0) + (data.creados ?? 0) > 0) fetchSellers()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al importar")
    } finally {
      setImporting(false)
    }
  }

  async function handleExport() {
    try {
      const { data } = await client.get("/sellers/export", { responseType: "arraybuffer" })
      const filePath = await save({
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
        defaultPath: `sellers_${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
      if (filePath) {
        await writeFile(filePath, new Uint8Array(data))
        toast.success("Exportación guardada")
      }
    } catch {
      toast.error("Error al exportar sellers")
    }
  }

  const analistasUnicos = useMemo(() => {
    const set = new Set(sellers.map((s) => s.analista).filter(Boolean))
    return Array.from(set).sort()
  }, [sellers])

  const filteredSellers = useMemo(() => {
    return sellers.filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          (s.seller_name ?? "").toLowerCase().includes(q) ||
          (s.seller_id ?? "").toLowerCase().includes(q) ||
          (s.id_ecommerce ?? "").toLowerCase().includes(q) ||
          (s.analista ?? "").toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterEstadoKeys !== "todos" && s.estado_keys !== filterEstadoKeys) return false
      if (filterVendiendo !== "todos") {
        if (filterVendiendo === "si" && !s.vendiendo) return false
        if (filterVendiendo === "no" && s.vendiendo) return false
      }
      if (filterEstado !== "todos") {
        if (filterEstado === "activo" && !s.is_active) return false
        if (filterEstado === "inactivo" && s.is_active) return false
      }
      if (filterAnalista !== "todos" && s.analista !== filterAnalista) return false
      return true
    })
  }, [sellers, search, filterEstadoKeys, filterVendiendo, filterEstado, filterAnalista])

  const columns = [
    {
      accessorKey: "id_ecommerce",
      header: "Id Ecommerce",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-foreground/80">{getValue()}</span>
      ),
    },
    {
      accessorKey: "seller_name",
      header: "Nombre",
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue()}</span>
      ),
    },
    { accessorKey: "seller_id", header: "Seller ID" },
    {
      accessorKey: "analista",
      header: "Analista",
      cell: ({ getValue }) => getValue() ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "estado_keys",
      header: "Estado Keys",
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ESTADO_BADGE[v] ?? ESTADO_BADGE.inactivo}`}
          >
            {v}
          </span>
        )
      },
    },
    {
      accessorKey: "vendiendo",
      header: "Vendiendo",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge className="border-blue-700 bg-blue-900/40 text-blue-400">Sí</Badge>
        ) : (
          <Badge className="border-border bg-muted text-muted-foreground">No</Badge>
        ),
    },
    {
      accessorKey: "is_active",
      header: "Estado",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge className="border-emerald-700 bg-emerald-900/40 text-emerald-400">Activo</Badge>
        ) : (
          <Badge className="border-border bg-muted text-muted-foreground">Inactivo</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            {isAdmin && (
              <Button
                size="icon" variant="ghost" title="Editar"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditSeller(s); setFormOpen(true) }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                size="icon" variant="ghost" title="Probar conexión"
                className="h-8 w-8 text-muted-foreground hover:text-blue-400"
                onClick={() => handleTestConnection(s)}
              >
                <Plug className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                size="icon" variant="ghost" title="Desactivar"
                disabled={!s.is_active}
                className="h-8 w-8 text-muted-foreground hover:text-red-400 disabled:opacity-30"
                onClick={() => handleDeactivate(s)}
              >
                <UserX className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: filteredSellers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sellers</h1>
          <p className="text-sm text-muted-foreground">Gestión de sellers y credenciales VTEX</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFileChange}
          />
          {canExport && (
            <Button
              variant="outline"
              onClick={handleExport}
              className="border-border bg-transparent text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              className="border-border bg-transparent text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando…" : "Importar Excel"}
            </Button>
          )}
          {isAdmin && (
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => { setEditSeller(null); setFormOpen(true) }}
            >
              + Nuevo seller
            </Button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, seller ID, id ecommerce, analista..."
            className="border-border bg-muted pl-9 text-foreground placeholder:text-muted-foreground h-8 text-xs"
          />
        </div>
        <select
          value={filterEstadoKeys}
          onChange={(e) => setFilterEstadoKeys(e.target.value)}
          className="rounded-md border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:outline-none"
        >
          <option value="todos">Estado Keys: todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="vencido">Vencido</option>
        </select>
        <select
          value={filterVendiendo}
          onChange={(e) => setFilterVendiendo(e.target.value)}
          className="rounded-md border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:outline-none"
        >
          <option value="todos">Vendiendo: todos</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-md border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:outline-none"
        >
          <option value="todos">Estado: todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select
          value={filterAnalista}
          onChange={(e) => setFilterAnalista(e.target.value)}
          className="rounded-md border border-border bg-muted px-2 py-1.5 text-xs text-foreground focus:outline-none"
        >
          <option value="todos">Analista: todos</option>
          {analistasUnicos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {filteredSellers.length !== sellers.length && (
          <span className="text-xs text-muted-foreground">{filteredSellers.length} de {sellers.length}</span>
        )}
      </div>

      <Card className="border-border bg-card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        ) : (
          <div style={{ height: "calc(100vh - 220px)", overflowY: "auto", overflowX: "auto" }}>
            <table className="w-full text-sm text-foreground/80">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border">
                    {hg.headers.map((h) => (
                      <th
                        key={h.id}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 transition-colors hover:bg-accent/20"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {sellers.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                      No hay sellers registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SellerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        seller={editSeller}
        onSaved={onSaved}
      />

      <ImportResultModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        result={importResult}
      />
    </div>
  )
}
