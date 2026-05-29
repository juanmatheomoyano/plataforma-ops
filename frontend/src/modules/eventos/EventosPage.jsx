import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ValidarEventoPanel } from "./components/ValidarEventoPanel"
import { AdministrarEventosPanel } from "./components/AdministrarEventosPanel"

export default function EventosPage() {
  const [activeTab, setActiveTab] = useState("validar")
  const [refreshKey, setRefreshKey] = useState(0)

  function handleEventoGuardado() {
    setRefreshKey((k) => k + 1)
    setActiveTab("administrar")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Verificá y gestioná las configuraciones de sellers para eventos específicos (Hot Sale, Cyber Monday, etc.)
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="validar">Validar y crear</TabsTrigger>
          <TabsTrigger value="administrar">Administrar eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="validar" className="mt-4">
          <Card className="border-border bg-card p-5">
            <ValidarEventoPanel onEventoGuardado={handleEventoGuardado} />
          </Card>
        </TabsContent>

        <TabsContent value="administrar" className="mt-4">
          <Card className="border-border bg-card p-5 space-y-4">
            <AdministrarEventosPanel refreshKey={refreshKey} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
