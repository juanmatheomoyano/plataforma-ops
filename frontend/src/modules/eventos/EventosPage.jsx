import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer, PageHeader } from "@/components/PageHeader"
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
    <PageContainer>
      <PageHeader
        eyebrow="Módulo"
        title="Eventos"
        subtitle="Hot Sale, Cyber Monday y demás. La validación por seller se ejecuta desde CRUD Medios de Pago."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border border-border bg-muted">
          <TabsTrigger value="administrar">Administrar</TabsTrigger>
          <TabsTrigger value="crear">Crear</TabsTrigger>
        </TabsList>

        <TabsContent value="administrar" className="mt-4">
          <Card className="border-border bg-card p-6 space-y-4 shadow-soft">
            <AdministrarEventosPanel refreshKey={refreshKey} />
          </Card>
        </TabsContent>

        <TabsContent value="crear" className="mt-4">
          <Card className="border-border bg-card p-6 shadow-soft">
            <CrearEventoPanel onCreado={handleCreado} />
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
