import { useEffect, useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
import client from "@/core/api/client"
import { ResultsTable } from "./ResultsTable"

const OP_BADGE = {
  R: { cls: "border-blue-700 bg-blue-900/40 text-blue-400", label: "Read" },
  C: { cls: "border-emerald-700 bg-emerald-900/40 text-emerald-400", label: "Create" },
  U: { cls: "border-amber-700 bg-amber-900/40 text-amber-400", label: "Update" },
  D: { cls: "border-red-700 bg-red-900/40 text-red-400", label: "Delete" },
}

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
  const [dryRunFilter, setDryRunFilter] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    client.get("/crud-medios/operations")
      .then(({ data }) => setOps(data))
      .catch(() => toast.error("Error al cargar historial"))
      .finally(() => setLoading(false))
  }, [])

  async function openDetail(op) {
    setDetail({ op, rows: [] })
    setDetailLoading(true)
    try {
      const { data } = await client.get(`/crud-medios/operations/${op.id}`)
      setDetail({ op, rows: data.rows })
    } catch {
      toast.error("Error al cargar detalle de operación")
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return ops.filter((op) => {
      if (opFilter !== "all" && op.operacion !== opFilter) return false
      if (dryRunFilter === "real" && op.dry_run) return false
      if (dryRunFilter === "dry" && !op.dry_run) return false
      if (fechaDesde) {
        const opDate = new Date(op.started_at)
        if (opDate < new Date(fechaDesde)) return false
      }
      if (fechaHasta) {
        const opDate = new Date(op.started_at)
        const hasta = new Date(fechaHasta)
        hasta.setHours(23, 59, 59)
        if (opDate > hasta) return false
      }
      return true
    })
  }, [ops, opFilter, dryRunFilter, fechaDesde, fechaHasta])

  const columns = useMemo(() => [
    {
      accessorKey: "started_at",
      header: "Fecha",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(getValue())}</span>
      ),
    },
    {
      accessorKey: "username",
      header: "Usuario",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-foreground/80">{getValue() ?? "—"}</span>
      ),
    },
    {
      accessorKey: "operacion",
      header: "Operación",
      cell: ({ getValue }) => {
        const v = getValue()
        const b = OP_BADGE[v]
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${b?.cls ?? ""}`}>
            {b?.label ?? v}
          </span>
        )
      },
    },
    {
      accessorKey: "dry_run",
      header: "Dry Run",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge className="border-border bg-muted text-muted-foreground text-xs">Sí</Badge>
        ) : (
          <Badge className="border-emerald-800 bg-emerald-950/40 text-emerald-400 text-xs">Real</Badge>
        ),
    },
    {
      accessorKey: "total_sellers",
      header: "Sellers",
      cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue()}</span>,
    },
    {
      accessorKey: "total_matched",
      header: "Matched",
      cell: ({ getValue }) => <span className="text-foreground/80 text-sm font-medium">{getValue()}</span>,
    },
    {
      accessorKey: "total_success",
      header: "Exitosos",
      cell: ({ getValue }) => (
        <span className="text-emerald-400 text-sm font-medium">{getValue()}</span>
      ),
    },
    {
      accessorKey: "total_errors",
      header: "Errores",
      cell: ({ getValue }) => {
        const v = getValue()
        return (
          <span className={`text-sm font-medium ${v > 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {v}
          </span>
        )
      },
    },
    {
      accessorKey: "duration_secs",
      header: "Duración",
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue().toFixed(2)}s</span>
      ),
    },
  ], [])

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Operación</Label>
            <Select value={opFilter} onValueChange={setOpFilter}>
              <SelectTrigger className="w-36 border-border bg-muted text-foreground h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="R">Read</SelectItem>
                <SelectItem value="C">Create</SelectItem>
                <SelectItem value="U">Update</SelectItem>
                <SelectItem value="D">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Modo</Label>
            <Select value={dryRunFilter} onValueChange={setDryRunFilter}>
              <SelectTrigger className="w-32 border-border bg-muted text-foreground h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-card text-foreground">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="dry">Solo Dry Run</SelectItem>
                <SelectItem value="real">Solo Real</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="border-border bg-muted text-foreground h-8 text-xs w-36"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="border-border bg-muted text-foreground h-8 text-xs w-36"
            />
          </div>

          <span className="text-xs text-muted-foreground pb-1">
            {filtered.length} de {ops.length} operaciones
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/80">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
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
                  onClick={() => openDetail(row.original)}
                  className="cursor-pointer border-b border-border/40 transition-colors hover:bg-accent/30"
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
                  <td colSpan={columns.length} className="py-12 text-center text-sm text-muted-foreground">
                    No hay operaciones registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded px-2 py-1 hover:bg-accent disabled:opacity-30"
              >
                ‹ Anterior
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded px-2 py-1 hover:bg-accent disabled:opacity-30"
              >
                Siguiente ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-card-foreground">
              {detail && (() => {
                const b = OP_BADGE[detail.op.operacion]
                return (
                  <>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${b?.cls ?? ""}`}>
                      {b?.label ?? detail.op.operacion}
                    </span>
                    {detail.op.username && (
                      <span className="font-mono text-sm text-muted-foreground">{detail.op.username}</span>
                    )}
                    <span className="text-sm font-normal text-muted-foreground">
                      {formatDate(detail.op.started_at)}
                    </span>
                    {detail.op.dry_run && (
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        DRY RUN
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      {detail.op.total_matched} matched · {detail.op.total_success} ok · {detail.op.total_errors} err · {detail.op.duration_secs.toFixed(2)}s
                    </span>
                  </>
                )
              })()}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          ) : detail?.rows.length > 0 ? (
            <ResultsTable rows={detail.rows} />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin filas registradas</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
