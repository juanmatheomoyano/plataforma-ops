import { useEffect, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import client from "@/core/api/client"

const MODES = [
  { value: "todos", label: "Todos los sellers activos" },
  { value: "uno", label: "Seller específico" },
  { value: "lista", label: "Lista de sellers" },
]

export function ScopeSelector({ onChange }) {
  const [sellers, setSellers] = useState([])
  const [mode, setMode] = useState("todos")
  const [selected, setSelected] = useState([]) // list of seller objects
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
    } else {
      onChange(selected.map((s) => s.seller_id))
    }
    setSelected([])
    setSearch("")
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const scopeCount =
    mode === "todos" ? sellers.length : selected.length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-slate-300">Scope / Sellers</Label>
        <span className="text-xs text-slate-500">
          {scopeCount} seller{scopeCount !== 1 ? "s" : ""} seleccionado{scopeCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === m.value
                ? "bg-slate-700 text-slate-100"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800",
            ].join(" ")}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Dropdown for uno/lista modes */}
      {mode !== "todos" && (
        <div className="relative" ref={dropRef}>
          {/* Chips (lista mode) */}
          {mode === "lista" && selected.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <span
                  key={s.seller_id}
                  className="flex items-center gap-1 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-200"
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
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-200">
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
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
          </div>

          {open && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-700 bg-slate-800 shadow-lg">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">Sin resultados</div>
              ) : (
                filtered.map((s) => {
                  const isSelected = selected.some((sel) => sel.seller_id === s.seller_id)
                  return (
                    <button
                      key={s.seller_id}
                      onClick={() => toggleSeller(s)}
                      className={[
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-700",
                        isSelected ? "text-slate-100 bg-slate-700/50" : "text-slate-300",
                      ].join(" ")}
                    >
                      {mode === "lista" && (
                        <span className={[
                          "h-3.5 w-3.5 shrink-0 rounded-sm border",
                          isSelected ? "bg-slate-100 border-slate-100" : "border-slate-500",
                        ].join(" ")} />
                      )}
                      <span className="flex-1 truncate">{s.seller_name}</span>
                      <span className="shrink-0 font-mono text-xs text-slate-500">{s.seller_id}</span>
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
