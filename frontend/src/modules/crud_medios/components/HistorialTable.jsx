import { useEffect, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import client from "@/core/api/client"
import { ResultsTable } from "./ResultsTable"

const OP_BADGE = {
  R: "border-blue-700 bg-blue-900/40 text-blue-400",
  C: "border-emerald-700 bg-emerald-900/40 text-emerald-400",
  U: "border-amber-700 bg-amber-900/40 text-amber-400",
  D: "border-red-700 bg-red-900/40 text-red-400",
}
const OP_LABEL = { R: "Read", C: "Create", U: "Update", D: "Delete" }

function formatDate(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function HistorialTable() {
  const [ops, setOps] = useState([])
  const [loading, setLoading] = useState(true)
  const [opFilter, setOpFilter] = useState("all")
  const [detail, setDetail] = useState(null) // { op, rows }
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    client.get("/crud-medios/operations")
      .then(({ data }) => setOps(data))
      .catch(() => toast.error("Error al cargar historial"))
      .finally(() => setLoading(false))
  }, [])

  async function openDetail(op) {
    setDetailLoading(true)
    setDetail({ op, rows: [] })
    try {
      const { data } = await client.get(`/crud-medios/operations/${op.id}`)
      setDetail({ op, rows: data.rows })
    } catch {
      toast.error("Error al cargar detalle")
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = ops.filter((op) => opFilter === "all" || op.operacion === opFilter)

  const columns = [
    {
      accessorKey: "started_at",
      header: "Fecha",
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-400">{formatDate(getValue())}</span>
      ),
    },
    {
      accessorKey: "operacion",
      header: "Operación",
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${OP_BADGE[v] ?? ""}`}>
            {OP_LABEL[v] ?? v}
          </span>
        )
      },
    },
    {
      accessorKey: "dry_run",
      header: "Dry Run",
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="text-xs text-slate-400">Sí</span>
        ) : (
          <span className="text-xs text-emerald-400 font-medium">No (real)</span>
        ),
    },
    {
      accessorKey: "total_matched",
      header: "Matched",
      cell: ({ getValue }) => <span className="text-slate-300">{getValue()}</span>,
    },
    {
      accessorKey: "total_success",
      header: "Éxitos",
      cell: ({ getValue }) => <span className="text-emerald-400">{getValue()}</span>,
    },
    {
      accessorKey: "total_errors",
      header: "Errores",
      cell: ({ getValue }) => {
        const v = getValue()
        return <span className={v > 0 ? "text-red-400 font-medium" : "text-slate-500"}>{v}</span>
      },
    },
    {
      accessorKey: "duration_secs",
      header: "Duración",
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500">{getValue().toFixed(2)}s</span>
      ),
    },
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger className="w-40 border-slate-600 bg-slate-800 text-slate-100 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800 text-slate-100">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="R">Read</SelectItem>
              <SelectItem value="C">Create</SelectItem>
              <SelectItem value="U">Update</SelectItem>
              <SelectItem value="D">Delete</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-slate-500">{filtered.length} operaciones</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-slate-700 bg-slate-800/80">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                  onClick={() => openDetail(row.original)}
                  className="cursor-pointer border-b border-slate-700/40 transition-colors hover:bg-slate-700/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-500">
                    No hay operaciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="border-slate-700 bg-[#1e293b] text-slate-100 sm:max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-slate-100">
              {detail && (
                <>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${OP_BADGE[detail.op.operacion]}`}>
                    {OP_LABEL[detail.op.operacion]}
                  </span>
                  <span className="text-sm font-normal text-slate-400">
                    {formatDate(detail.op.started_at)}
                  </span>
                  {detail.op.dry_run && (
                    <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                      DRY RUN
                    </span>
                  )}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
            </div>
          ) : detail?.rows.length > 0 ? (
            <ResultsTable rows={detail.rows} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Sin filas registradas</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
