import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { useAutoUpdate } from "./core/hooks/useAutoUpdate"
import { useVersionAnnouncement } from "./core/hooks/useVersionAnnouncement"
import { WhatsNewModal } from "./core/components/WhatsNewModal"
import { AuthProvider } from "@/core/auth/AuthContext"
import { PrivateRoute } from "@/core/auth/PrivateRoute"
import { useAuth } from "@/core/auth/useAuth"
import { ThemeProvider } from "@/core/theme/ThemeContext"
import { useTheme } from "@/core/theme/ThemeContext"
import { Shell } from "@/core/layout/Shell"
import Dashboard from "@/pages/Dashboard"
import Login from "@/pages/Login"
import ConfiguracionPage from "@/pages/ConfiguracionPage"
import UsersPage from "@/modules/users/UsersPage"
import SellersPage from "@/modules/sellers/SellersPage"
import CrudMediosPage from "@/modules/crud_medios/CrudMediosPage"
import EventosPage from "@/modules/eventos/EventosPage"
import AuditoriaPage from "@/modules/auditoria/AuditoriaPage"
import "./index.css"

function RoleRoute({ roles, children }) {
  const { hasRole } = useAuth()
  return hasRole(roles) ? children : <Navigate to="/dashboard" replace />
}

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-right" theme={theme} />
}

function VersionAnnouncement() {
  const { user } = useAuth()
  const { newVersion, dismiss } = useVersionAnnouncement()
  // Solo mostrar si el user está logueado (evita el modal en la pantalla de login)
  if (!user) return null
  return <WhatsNewModal version={newVersion} onClose={dismiss} />
}

export default function App() {
  useAutoUpdate()
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ThemedToaster />
          <VersionAnnouncement />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Shell />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="users"
                element={
                  <RoleRoute roles={["admin", "supervisor"]}>
                    <UsersPage />
                  </RoleRoute>
                }
              />
              <Route
                path="sellers"
                element={
                  <RoleRoute roles={["admin", "supervisor", "analista"]}>
                    <SellersPage />
                  </RoleRoute>
                }
              />
              <Route path="crud-medios" element={<CrudMediosPage />} />
              <Route
                path="eventos"
                element={
                  <RoleRoute roles={["admin", "supervisor"]}>
                    <EventosPage />
                  </RoleRoute>
                }
              />
              <Route
                path="auditoria"
                element={
                  <RoleRoute roles={["admin"]}>
                    <AuditoriaPage />
                  </RoleRoute>
                }
              />
              <Route path="configuracion" element={<ConfiguracionPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
