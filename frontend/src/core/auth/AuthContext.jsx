import { createContext, useCallback, useEffect, useState } from "react"
import client, { clearTokens, getAccessToken, setTokens } from "@/core/api/client"

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Attempt to restore session only if a token exists in memory
    if (!getAccessToken()) {
      setIsLoading(false)
      return
    }
    client
      .get("/auth/me")
      .then(({ data }) => setUser(data))
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const { data } = await client.post("/auth/login", { username, password })
    setTokens(data.access_token, data.refresh_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      const token = getAccessToken()
      if (token) {
        await client.post("/auth/logout", {
          refresh_token: token, // logout sends whichever token we have
        })
      }
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [])

  const hasRole = useCallback(
    (roles) => (user ? roles.includes(user.role) : false),
    [user]
  )

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  )
}
