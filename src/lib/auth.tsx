import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { ROUTES } from '@/config/routes'
import { supabase } from '@/lib/supabase'
import { getPostAuthRoute, isSetupComplete, isSetupEnforced } from '@/lib/setup-storage'

/** Minimum time the boot splash stays visible on refresh / first load. */
const MIN_BOOT_SPLASH_MS = 1200
/** Extra splash visibility after a successful sign-in. */
const LOGIN_SPLASH_MS = 1000

type AuthState = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true })

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [splashHold, setSplashHold] = useState(false)
  const bootingRef = useRef(true)

  useEffect(() => {
    let mounted = true
    const startedAt = Date.now()

    supabase.auth.getSession().then(async ({ data }) => {
      const remaining = Math.max(0, MIN_BOOT_SPLASH_MS - (Date.now() - startedAt))
      if (remaining > 0) await wait(remaining)
      if (!mounted) return
      setSession(data.session)
      bootingRef.current = false
      setBooting(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return

      setSession(nextSession)

      // Show splash on interactive sign-in so the colored loader is noticeable.
      if (event === 'SIGNED_IN' && !bootingRef.current) {
        setSplashHold(true)
        await wait(LOGIN_SPLASH_MS)
        if (mounted) setSplashHold(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loading = booting || splashHold

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
      {loading ? <FullScreenLoader /> : null}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to={ROUTES.login} replace />
  return <>{children}</>
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to={getPostAuthRoute()} replace />
  return <>{children}</>
}

/** Protected route that only allows users who have not finished setup. */
export function SetupRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (isSetupEnforced()) {
    if (!session) return <Navigate to={ROUTES.login} replace />
    if (isSetupComplete()) return <Navigate to={ROUTES.dashboard} replace />
  }
  return <>{children}</>
}
