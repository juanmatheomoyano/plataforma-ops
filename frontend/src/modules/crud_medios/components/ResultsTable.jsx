import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { save } from "@tauri-apps/plugin-dialog"
import { writeFile } from "@tauri-apps/plugin-fs"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const DETALLE_BADGE = {
  matched: { label: "OK", cls: "border-emerald-700 bg-emerald-900/40 text-emerald-400" },
  creado: { label: "CREADA", cls: "border-blue-700 bg-blue-900/40 text-blue-400" },
  actualizado: { label: "ACTUALIZADA", cls: "border-amber-700 bg-amber-900/40 text-amber-400" },
  eliminado: { label: "ELIMINADA", cls: "border-red-700 bg-red-900/40 text-red-400" },
  error: { label: "ERROR", cls: "border-red-900 bg-red-950/60 text-red-300" },
  dry_run: { label: "DRY RUN", cls: "border-slate-600 bg-slate-800 text-slate-400" },
}

function getDetalleBadge(detalle) {
  if (!detalle) return DETALLE_BADGE.dry_run
  const d = detalle.toLowerCase()
  if (d.startsWith("error")) return DETALLE_BADGE.error
  if (d.startsWith("dry_run")) return DETALLE_BADGE.dry_run
  if (d === "matched") return DETALLE_BADGE.matched
  if (d === "creado") return DETALLE_BADGE.creado
  if (d.startsWith("actualizado")) return DETALLE_BADGE.actualizado
  if (d === "eliminado") return DETALLE_BADGE.eliminado
  return DETALLE_BADGE.dry_run
}

async function exportXLSX(rows) {
  const headers = ["seller_id", "rule_id", "rule_name", "brand", "level", "estado", "detalle"]
  const data = [
    headers,
    ...rows.map((r) => headers.map((h) => r[h] ?? "")),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Resultados")
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" })

  const filePath = await save({
    filters: [{ name: "Excel", extensions: ["xlsx"] }],
    defaultPath: `crud_medios_${new Date().toISOString().slice(0, 10)}.xlsx`,
  })
  if (filePath) {
    await writeFile(filePath, new Uint8Array(buf))
  }
}

export function ResultsTable({ rows, onFilterErrors }) {
  const [globalFilter, setGlobalFilter] = useState("")
  const [showOnlyErrors, setShowOnlyErrors] = useState(false)

  const displayRows = useMemo(
    () => (showOnlyErrors ? rows.filter((r) => r.detalle?.toLowerCase().startsWith("error")) : rows),
    [rows, showOnlyErrors]
  )

  const columns = useMemo(
    () => [
      {
        accessorKey: "seller_id",
        header: "Seller",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-slate-300">{getValue()}</span>
        ),
      },
      {
        accessorKey: "rule_name",
        header: "Regla",
        cell: ({ getValue }) => (
          <span className="text-slate-200">{getValue() ?? <span className="text-slate-600">—</span>}</span>
        ),
      },
      {
        accessorKey: "brand",
        header: "Brand",
        cell: ({ getValue }) => {
          const v = getValue()
          return v ? <span className="text-slate-300">{v}</span> : <span className="text-slate-600">—</span>
        },
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ getValue }) => {
          const v = getValue()
          return v ? <span className="text-slate-300">{v}</span> : <span className="text-slate-600">—</span>
        },
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ getValue }) => {
          const v = getValue()
          if (!v) return <span className="text-slate-600">—</span>
          const cls =
            v === "activo"
              ? "border-emerald-700 bg-emerald-900/40 text-emerald-400"
              : v === "error"
              ? "border-red-700 bg-red-900/40 text-red-400"
              : "border-slate-600 bg-slate-800 text-slate-500"
          return (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
              {v}
            </span>
          )
        },
      },
      {
        accessorKey: "detalle",
        header: "Resultado",
        cell: ({ getValue }) => {
          const v = getValue()
          const badge = getDetalleBadge(v)
          return (
            <div className="flex flex-col gap-1">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold w-fit ${badge.cls}`}>
                {badge.label}
              </span>
              {v && v !== "matched" && !v.startsWith("dry_run — no") && (
                <span className="text-xs text-slate-500 truncate max-w-[200px]" title={v}>{v}</span>
              )}
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: displayRows,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  const errorCount = rows.filter((r) => r.detalle?.toLowerCase().startsWith("error")).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar en resultados..."
            className="border-slate-600 bg-slate-800 pl-9 text-slate-100 placeholder:text-slate-500 h-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <button
              onClick={() => setShowOnlyErrors((v) => !v)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                showOnlyErrors
                  ? "border-red-700 bg-red-900/40 text-red-300"
                  : "border-red-800 bg-red-950/30 text-red-400 hover:bg-red-900/40",
              ].join(" ")}
            >
              {errorCount} error{errorCount !== 1 ? "es" : ""}
            </button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportXLSX(rows)}
            className="h-8 border-slate-600 bg-transparent text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-100"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
        </div>
      </div>

      <div
        className="rounded-lg border border-slate-700"
        style={{ height: "calc(100vh - 420px)", overflowY: "auto", overflowX: "auto" }}
      >
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-700 bg-slate-800/80">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
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
                className="border-b border-slate-700/40 transition-colors hover:bg-slate-700/20"
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
                <td colSpan={columns.length} className="py-10 text-center text-sm text-slate-500">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {table.getState().pagination.pageIndex * 50 + 1}–
            {Math.min((table.getState().pagination.pageIndex + 1) * 50, displayRows.length)} de{" "}
            {displayRows.length} filas
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded px-2 py-1 hover:bg-slate-700 disabled:opacity-30"
            >
              ‹ Anterior
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded px-2 py-1 hover:bg-slate-700 disabled:opacity-30"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
