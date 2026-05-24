import { Navigate } from "react-router-dom"
import { useAuth } from "./useAuth"

export function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-slate-200" />
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}
