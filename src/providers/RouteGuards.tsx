import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { isSetupDeferred } from '@/lib/setup-deferred'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { useAuth } from '@/lib/auth'

/** App is reachable when setup is done, deferred (skipped), or gate bypassed in dev. */
function canAccessApp(setupCompleted: boolean, gateBypassed: boolean) {
  return setupCompleted || gateBypassed || isSetupDeferred()
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { ready, setupCompleted, gateBypassed, isTechnician } = useAppBootstrap()

  if (authLoading || (session && !ready)) return null
  if (!session) return <Navigate to={ROUTES.login} replace />
  // The portal is ADMIN/MANAGER only — technicians work in the mobile app.
  if (isTechnician) return <Navigate to={ROUTES.technicianApp} replace />
  if (!canAccessApp(setupCompleted, gateBypassed)) {
    return <Navigate to={ROUTES.setupWizard} replace />
  }

  return <>{children}</>
}

/** The technician block page — any signed-in technician, no setup gate. */
export function TechnicianAppRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { ready, isTechnician } = useAppBootstrap()

  if (authLoading || (session && !ready)) return null
  if (!session) return <Navigate to={ROUTES.login} replace />
  if (!isTechnician) return <Navigate to={ROUTES.dashboard} replace />

  return <>{children}</>
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading, justProvisioned } = useAuth()
  const { ready, setupCompleted, gateBypassed, isTechnician } = useAppBootstrap()

  if (authLoading || (session && !ready)) return null
  if (session) {
    if (isTechnician) return <Navigate to={ROUTES.technicianApp} replace />
    // Fresh POST /auth/signup → always /setup; otherwise honor setup gate.
    const destination =
      justProvisioned || !canAccessApp(setupCompleted, gateBypassed)
        ? ROUTES.setupWizard
        : ROUTES.dashboard
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}

export function SetupRoute({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { ready, setupCompleted, gateBypassed, isTechnician } = useAppBootstrap()

  if (authLoading || (session && !ready)) return null
  if (!session) return <Navigate to={ROUTES.login} replace />
  if (isTechnician) return <Navigate to={ROUTES.technicianApp} replace />
  // Completed users leave setup unless gate is bypassed for local testing.
  if (setupCompleted && !gateBypassed) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  return <>{children}</>
}
