import { Navigate } from "react-router-dom"
import { useAuth } from "./useAuth"

export function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />
}
