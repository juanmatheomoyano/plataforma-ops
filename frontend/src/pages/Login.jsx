import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/core/auth/useAuth"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(username, password)
      navigate("/dashboard", { replace: true })
    } catch {
      setError("Usuario o contraseña incorrectos.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
      <div className="w-full max-w-sm space-y-6 px-4">
        {/* Logo / título */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700">
            <ShieldCheck className="h-6 w-6 text-slate-200" />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">Plataforma Operativa</h1>
          <p className="text-sm text-slate-400">Provincia Compras</p>
        </div>

        {/* Card de login */}
        <Card className="border-slate-700 bg-[#1e293b] text-slate-100 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-slate-100">Iniciar sesión</CardTitle>
            <CardDescription className="text-slate-400">
              Ingresá tus credenciales para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-slate-300">
                  Usuario
                </Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              {error && (
                <p className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
