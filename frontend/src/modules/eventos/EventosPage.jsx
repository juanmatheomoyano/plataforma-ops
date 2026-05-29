import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CrearEventoPanel } from "./components/CrearEventoPanel"
import { AdministrarEventosPanel } from "./components/AdministrarEventosPanel"

export default function EventosPage() {
  const [activeTab, setActiveTab] = useState("administrar")
  const [refreshKey, setRefreshKey] = useState(0)

  function handleCreado() {
    setRefreshKey((k) => k + 1)
    setActiveTab("administrar")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná eventos planificados (Hot Sale, Cyber Monday, etc.). La validación por seller se hace desde CRUD Medios de Pago.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="administrar">Administrar eventos</TabsTrigger>
          <TabsTrigger value="crear">Crear evento</TabsTrigger>
        </TabsList>

        <TabsContent value="administrar" className="mt-4">
          <Card className="border-border bg-card p-5 space-y-4">
            <AdministrarEventosPanel refreshKey={refreshKey} />
          </Card>
        </TabsContent>

        <TabsContent value="crear" className="mt-4">
          <Card className="border-border bg-card p-5">
            <CrearEventoPanel onCreado={handleCreado} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
