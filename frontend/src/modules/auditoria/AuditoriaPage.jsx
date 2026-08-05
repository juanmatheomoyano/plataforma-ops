import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import client from "@/core/api/client"

const PAGE_SIZE = 50

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "medium" })
}

export default function AuditoriaPage() {
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(new Set())
  const [actions, setActions] = useState([])

  const [filters, setFilters] = useState({
    username: "",
    action: "",
    entity: "",
    entity_id: "",
    from_date: "",
    to_date: "",
  })

  async function load(newOffset = 0) {
    setLoading(true)
    try {
      const params = { limit: PAGE_SIZE, offset: newOffset }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const { data } = await client.get("/auditoria", { params })
      setEntries(data.entries)
      setTotal(data.total)
      setOffset(newOffset)
      setExpanded(new Set())
    } catch (e) {
      toast.error(e?.response?.status === 403 ? "Solo admins" : "Error al cargar auditoría")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(0)
    client.get("/auditoria/actions").then(({ data }) => setActions(data || [])).catch(() => {})
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    load(0)
  }

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExportCsv() {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const { data } = await client.get(`/auditoria/export.csv?${params}`, { responseType: "blob" })
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Error al exportar CSV")
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Registro de acciones sensibles del sistema. {total.toLocaleString("es-AR")} eventos totales.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load(offset)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Usuario</Label>
          <Input
            value={filters.username}
            onChange={(e) => setFilters({ ...filters, username: e.target.value })}
            placeholder="usuario..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Acción</Label>
          <Input
            list="actions-list"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            placeholder="seller.create..."
          />
          <datalist id="actions-list">
            {actions.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Entidad</Label>
          <Input
            value={filters.entity}
            onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
            placeholder="seller / user..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Entity ID</Label>
          <Input
            value={filters.entity_id}
            onChange={(e) => setFilters({ ...filters, entity_id: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <Input
            type="datetime-local"
            value={filters.from_date}
            onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hasta</Label>
          <Input
            type="datetime-local"
            value={filters.to_date}
            onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
          />
        </div>
        <div className="md:col-span-3 lg:col-span-6 flex justify-end">
          <Button type="submit" disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>
      </form>

      {/* Tabla */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left w-8"></th>
              <th className="px-3 py-2 text-left">Timestamp</th>
              <th className="px-3 py-2 text-left">Usuario</th>
              <th className="px-3 py-2 text-left">Acción</th>
              <th className="px-3 py-2 text-left">Entidad</th>
              <th className="px-3 py-2 text-left">Entity ID</th>
              <th className="px-3 py-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Sin resultados</td></tr>
            )}
            {entries.map((e) => (
              <>
                <tr key={e.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-3 py-2">
                    {e.payload && (
                      <button onClick={() => toggleExpanded(e.id)} className="text-muted-foreground hover:text-foreground">
                        {expanded.has(e.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{formatDate(e.timestamp)}</td>
                  <td className="px-3 py-2">
                    {e.username ? (
                      <span><span className="font-medium">{e.username}</span>{e.role && <span className="ml-1 text-xs text-muted-foreground">({e.role})</span>}</span>
                    ) : <span className="text-muted-foreground italic">anónimo</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-3 py-2">{e.entity || "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground truncate max-w-[180px]" title={e.entity_id}>{e.entity_id || "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{e.ip || "-"}</td>
                </tr>
                {expanded.has(e.id) && e.payload && (
                  <tr key={`${e.id}-payload`} className="border-t border-border bg-muted/30">
                    <td></td>
                    <td colSpan={6} className="px-3 py-2">
                      <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(e.payload, null, 2)}</pre>
                      {e.request_id && (
                        <p className="text-xs text-muted-foreground mt-1">request_id: <span className="font-mono">{e.request_id}</span></p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0 || loading}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => load(offset + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total || loading}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
