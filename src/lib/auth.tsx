import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { site } from '@/content/site'
import { getPostAuthRoute, isSetupComplete, isSetupEnforced } from '@/lib/setup-storage'

type AuthState = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    let mounted = true

    // getSession waits for the client to restore the persisted session
    // (and to process OAuth/recovery tokens in the URL) before resolving.
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setState({ session: data.session, loading: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState({ session, loading: false })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex animate-pulse items-center gap-3">
        <span className="h-6 w-6 rounded-lg bg-primary" aria-hidden="true" />
        <span className="text-xl font-semibold tracking-tight text-foreground">{site.name}</span>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to={ROUTES.login} replace />
  return <>{children}</>
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to={getPostAuthRoute()} replace />
  return <>{children}</>
}

/** Protected route that only allows users who have not finished setup. */
export function SetupRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (isSetupEnforced()) {
    if (!session) return <Navigate to={ROUTES.login} replace />
    if (isSetupComplete()) return <Navigate to={ROUTES.dashboard} replace />
  }
  return <>{children}</>
}
