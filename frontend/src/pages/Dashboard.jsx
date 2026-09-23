import { useAuth } from "@/core/auth/useAuth"
import DashboardOwner from "./DashboardOwner"
import DashboardLegacy from "./DashboardLegacy"

/**
 * Router de dashboards por rol.
 *
 *  Owner/Admin (v2 owner+admin · legacy admin+supervisor)
 *    → DashboardOwner con KPIs BaproAR + charts Recharts.
 *
 *  El resto (analista/viewer · v2 categorías/catálogo/activación/administrativo)
 *    → DashboardLegacy — se irá reemplazando en v2.0.2+ con dashboards específicos.
 */
export default function Dashboard() {
  const { user, hasRole } = useAuth()
  if (hasRole(["admin", "supervisor", "owner"])) {
    return <DashboardOwner user={user} />
  }
  return <DashboardLegacy />
}
