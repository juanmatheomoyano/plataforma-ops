import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { useAutoUpdate } from "./core/hooks/useAutoUpdate"
import { AuthProvider } from "@/core/auth/AuthContext"
import { PrivateRoute } from "@/core/auth/PrivateRoute"
import { useAuth } from "@/core/auth/useAuth"
import { Shell } from "@/core/layout/Shell"
import Dashboard from "@/pages/Dashboard"
import Login from "@/pages/Login"
import UsersPage from "@/modules/users/UsersPage"
import SellersPage from "@/modules/sellers/SellersPage"
import CrudMediosPage from "@/modules/crud_medios/CrudMediosPage"
import "./index.css"

function RoleRoute({ roles, children }) {
  const { hasRole } = useAuth()
  return hasRole(roles) ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  useAutoUpdate()
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#f1f5f9",
            },
          }}
        />
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
                <RoleRoute roles={["admin"]}>
                  <UsersPage />
                </RoleRoute>
              }
            />
            <Route
              path="sellers"
              element={
                <RoleRoute roles={["admin"]}>
                  <SellersPage />
                </RoleRoute>
              }
            />
            <Route path="crud-medios" element={<CrudMediosPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
