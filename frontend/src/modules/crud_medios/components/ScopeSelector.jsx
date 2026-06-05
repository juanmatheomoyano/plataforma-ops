import { useEffect, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import client from "@/core/api/client"

const MODES = [
  { value: "todos", label: "Todos los sellers activos" },
  { value: "analista", label: "Por analista" },
  { value: "uno", label: "Seller específico" },
  { value: "lista", label: "Lista de sellers" },
]

export function ScopeSelector({ onChange }) {
  const [sellers, setSellers] = useState([])
  const [mode, setMode] = useState("todos")
  const [selected, setSelected] = useState([])
  const [selectedAnalista, setSelectedAnalista] = useState("")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    client.get("/crud-medios/sellers").then(({ data }) => setSellers(data)).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (mode === "todos") {
      onChange([])
    } else if (mode === "analista") {
      // scope se actualiza al seleccionar analista
      onChange([])
    } else {
      onChange(selected.map((s) => s.seller_id))
    }
    setSelected([])
    setSelectedAnalista("")
    setSearch("")
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleAnalistaChange(analista) {
    setSelectedAnalista(analista)
    if (!analista) {
      onChange([])
      return
    }
    const ids = sellers
      .filter((s) => s.analista === analista)
      .map((s) => s.seller_id)
    onChange(ids)
  }

  function toggleSeller(seller) {
    if (mode === "uno") {
      setSelected([seller])
      onChange([seller.seller_id])
      setOpen(false)
      setSearch("")
    } else {
      const exists = selected.find((s) => s.seller_id === seller.seller_id)
      const next = exists
        ? selected.filter((s) => s.seller_id !== seller.seller_id)
        : [...selected, seller]
      setSelected(next)
      onChange(next.map((s) => s.seller_id))
    }
  }

  function removeChip(sellerId) {
    const next = selected.filter((s) => s.seller_id !== sellerId)
    setSelected(next)
    onChange(next.map((s) => s.seller_id))
  }

  const filtered = sellers.filter(
    (s) =>
      s.seller_name.toLowerCase().includes(search.toLowerCase()) ||
      s.seller_id.toLowerCase().includes(search.toLowerCase())
  )

  const analistas = [...new Set(sellers.map((s) => s.analista).filter(Boolean))].sort()

  const analistaSellers = selectedAnalista
    ? sellers.filter((s) => s.analista === selectedAnalista)
    : []

  const scopeCount =
    mode === "todos"
      ? sellers.length
      : mode === "analista"
      ? analistaSellers.length
      : selected.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground/80">Scope / Sellers</Label>
        <span className="text-xs text-muted-foreground">
          {scopeCount} seller{scopeCount !== 1 ? "s" : ""} seleccionado{scopeCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Mode tabs */}
      <div className="flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === m.value
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            ].join(" ")}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Analista mode */}
      {mode === "analista" && (
        <div className="space-y-2">
          <select
            value={selectedAnalista}
            onChange={(e) => handleAnalistaChange(e.target.value)}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Seleccioná un analista...</option>
            {analistas.map((a) => {
              const count = sellers.filter((s) => s.analista === a).length
              return (
                <option key={a} value={a}>
                  {a} ({count} seller{count !== 1 ? "s" : ""})
                </option>
              )
            })}
          </select>
          {selectedAnalista && analistaSellers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analistaSellers.slice(0, 8).map((s) => (
                <span
                  key={s.seller_id}
                  className="rounded-full bg-accent/60 px-2.5 py-0.5 text-xs text-foreground/80"
                >
                  {s.seller_name}
                </span>
              ))}
              {analistaSellers.length > 8 && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  +{analistaSellers.length - 8} más
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dropdown for uno/lista modes */}
      {(mode === "uno" || mode === "lista") && (
        <div className="relative" ref={dropRef}>
          {/* Chips (lista mode) */}
          {mode === "lista" && selected.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <span
                  key={s.seller_id}
                  className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs text-foreground"
                >
                  {s.seller_name}
                  <button onClick={() => removeChip(s.seller_id)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Selected display (uno mode) */}
          {mode === "uno" && selected.length > 0 && !open && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs text-foreground">
                {selected[0].seller_name}
                <button onClick={() => { setSelected([]); onChange([]) }} className="hover:text-red-400">
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}

          <div className="relative">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar seller..."
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          {open && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
              ) : (
                filtered.map((s) => {
                  const isSelected = selected.some((sel) => sel.seller_id === s.seller_id)
                  return (
                    <button
                      key={s.seller_id}
                      onClick={() => toggleSeller(s)}
                      className={[
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                        isSelected ? "text-foreground bg-accent/50" : "text-foreground/80",
                      ].join(" ")}
                    >
                      {mode === "lista" && (
                        <span className={[
                          "h-3.5 w-3.5 shrink-0 rounded-sm border",
                          isSelected ? "bg-foreground border-foreground" : "border-border",
                        ].join(" ")} />
                      )}
                      <span className="flex-1 truncate">{s.seller_name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{s.seller_id}</span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
