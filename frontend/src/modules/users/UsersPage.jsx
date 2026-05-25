import { useEffect, useRef, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Download, KeyRound, Pencil, Upload, UserX } from "lucide-react"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/core/auth/useAuth"
import client from "@/core/api/client"
import { UserFormModal } from "./UserFormModal"
import { ResetPasswordModal } from "./ResetPasswordModal"
import { ImportResultModal } from "@/modules/sellers/ImportResultModal"

const ROLE_BADGE = {
  admin: "bg-violet-900/60 text-violet-300 border-violet-700",
  analista_senior: "bg-blue-900/60 text-blue-300 border-blue-700",
  analista: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
  viewer: "bg-slate-700/60 text-slate-300 border-slate-600",
}

const ROLE_LABEL = {
  admin: "Admin",
  analista_senior: "Analista Sr.",
  analista: "Analista",
  viewer: "Viewer",
}

function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role] ?? ROLE_BADGE.viewer}`}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

function fmt(dt) {
  if (!dt) return "—"
  return new Date(dt).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState(null)

  const [importResult, setImportResult] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  async function fetchUsers() {
    try {
      const { data } = await client.get("/users")
      setUsers(data)
    } catch {
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  function onSaved(savedUser) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === savedUser.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = savedUser
        return next
      }
      return [...prev, savedUser]
    })
  }

  async function handleExport() {
    try {
      const { data } = await client.get("/users/export", { responseType: "arraybuffer" })
      const filePath = await save({
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
        defaultPath: `usuarios_${new Date().toISOString().slice(0, 10)}.xlsx`,
      })
      if (filePath) {
        await writeFile(filePath, new Uint8Array(data))
        toast.success("Exportación guardada")
      }
    } catch {
      toast.error("Error al exportar usuarios")
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImporting(true)
    const form = new FormData()
    form.append("file", file)
    try {
      const { data } = await client.post("/users/import-update", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setImportResult(data)
      setImportOpen(true)
      if ((data.actualizados ?? 0) + (data.creados ?? 0) > 0) fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al importar")
    } finally {
      setImporting(false)
    }
  }

  async function handleDeactivate(row) {
    if (row.id === me.id) {
      toast.error("No podés desactivar tu propio usuario")
      return
    }
    try {
      const { data } = await client.post(`/users/${row.id}/deactivate`)
      onSaved(data)
      toast.success(`${row.username} desactivado`)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Error al desactivar")
    }
  }

  const columns = [
    {
      accessorKey: "full_name",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-medium text-slate-200">
          {row.original.full_name || <span className="text-slate-500">—</span>}
        </span>
      ),
    },
    { accessorKey: "username", header: "Usuario" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ getValue }) => <RoleBadge role={getValue()} />,
    },
    {
      accessorKey: "is_active",
      header: "Estado",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge className="border-emerald-700 bg-emerald-900/40 text-emerald-400">
            Activo
          </Badge>
        ) : (
          <Badge className="border-slate-600 bg-slate-800 text-slate-500">
            Inactivo
          </Badge>
        ),
    },
    {
      accessorKey: "last_login",
      header: "Último login",
      cell: ({ getValue }) => (
        <span className="text-slate-400 text-sm">{fmt(getValue())}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className="flex items-center gap-1 justify-end">
            <Button
              size="icon"
              variant="ghost"
              title="Editar"
              className="h-8 w-8 text-slate-400 hover:text-slate-100"
              onClick={() => { setEditUser(u); setFormOpen(true) }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Resetear contraseña"
              className="h-8 w-8 text-slate-400 hover:text-blue-400"
              onClick={() => { setResetUser(u); setResetOpen(true) }}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Desactivar"
              disabled={u.id === me?.id || !u.is_active}
              className="h-8 w-8 text-slate-400 hover:text-red-400 disabled:opacity-30"
              onClick={() => handleDeactivate(u)}
            >
              <UserX className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Usuarios</h1>
          <p className="text-sm text-slate-400">Gestión de accesos — solo admins</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="outline"
            onClick={handleExport}
            className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importando…" : "Importar Excel"}
          </Button>
          <Button
            className="bg-slate-100 text-slate-900 hover:bg-slate-200"
            onClick={() => { setEditUser(null); setFormOpen(true) }}
          >
            + Nuevo usuario
          </Button>
        </div>
      </div>

      <Card className="border-slate-700 bg-[#1e293b] overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
          </div>
        ) : (
          <div style={{ height: "calc(100vh - 180px)", overflowY: "auto", overflowX: "auto" }}>
          <table className="w-full text-sm text-slate-300">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-slate-700">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
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
                  className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-12 text-center text-slate-500"
                  >
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editUser}
        onSaved={onSaved}
      />

      <ResetPasswordModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        user={resetUser}
      />

      <ImportResultModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        result={importResult}
      />
    </div>
  )
}
