import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/core/auth/useAuth"
import { Logo } from "@/components/Logo"

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
    <div className="min-h-screen w-full bg-brand-bg text-brand-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        {/* HERO — panel tinta con marca */}
        <section className="relative flex-1 overflow-hidden bg-brand-ink text-white lg:min-h-screen">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(10,160,220,0.30), transparent 55%), radial-gradient(circle at 85% 75%, rgba(38,181,84,0.22), transparent 55%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage:
                "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at 50% 40%, black 40%, transparent 80%)",
            }}
          />

          <div className="relative flex h-full flex-col justify-center p-8 lg:p-14 min-h-[240px] lg:min-h-screen">
            <Logo variant="wordmark" size="xl" theme="on-dark" />
          </div>
        </section>

        {/* FORMULARIO */}
        <section className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:min-h-screen">
          <div className="w-full max-w-sm animate-fade-in">
            <h2 className="font-display text-2xl font-extrabold tracking-tightest text-brand-ink">
              Iniciar sesión
            </h2>
            <p className="mt-1.5 text-sm text-brand-slate">
              Ingresá tus credenciales para continuar.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <Label
                  htmlFor="username"
                  className="mono text-[10px] uppercase tracking-widest text-brand-slate"
                >
                  Usuario
                </Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1.5 h-11 border-brand-mist bg-white text-brand-ink placeholder:text-brand-slate/70 focus-visible:ring-brand-cyan"
                />
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="mono text-[10px] uppercase tracking-widest text-brand-slate"
                >
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
                  className="mt-1.5 h-11 border-brand-mist bg-white text-brand-ink placeholder:text-brand-slate/70 focus-visible:ring-brand-cyan"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="group relative h-11 w-full overflow-hidden bg-brand-ink text-white shadow-soft transition-all hover:bg-brand-ink-2 disabled:opacity-70"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ingresando…
                    </>
                  ) : (
                    "Ingresar"
                  )}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-4 -bottom-6 h-8 rounded-full bg-brand-cyan/60 blur-2xl opacity-70"
                />
              </Button>
            </form>

            <p className="mono mt-10 text-[10px] uppercase tracking-widest text-brand-slate/70">
              v{import.meta.env.VITE_APP_VERSION ?? "dev"}
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
