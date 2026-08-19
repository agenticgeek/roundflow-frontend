import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authApi } from '@/api/auth.api'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { ApiError, errorMessage } from '@/lib/errors'
// === DEV AUTH BACKDOOR START — comment out this import + marked blocks below to disable ===
import {
  clearDevAuthBypass,
  isDevAuthBypassSession,
  readPersistedDevAuthBypass,
} from '@/lib/dev-auth-bypass'
// === DEV AUTH BACKDOOR END ===
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/providers/QueryProvider'

/** Minimum time the boot splash stays visible on refresh / first load. */
const MIN_BOOT_SPLASH_MS = 1200
/** Extra splash visibility after a successful interactive sign-in. */
const LOGIN_SPLASH_MS = 1000

type AuthState = {
  session: Session | null
  loading: boolean
  /** True when this session just created a backend profile via POST /auth/signup. */
  justProvisioned: boolean
  provisioningError: string | null
  retryProvisioning: () => void
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  justProvisioned: false,
  provisioningError: null,
  retryProvisioning: () => undefined,
})

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function profileNameFromSession(session: Session): string {
  const metadata = session.user.user_metadata ?? {}
  const candidates = [metadata.full_name, metadata.name, metadata.display_name]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  const email = session.user.email?.trim()
  if (email) return email.split('@')[0] ?? ''
  return ''
}

/**
 * Backend contract after Supabase confirms a session (SIGNED_IN / exchangeCodeForSession):
 *   GET /auth/me
 *     → 200: profile exists — continue
 *     → 404: POST /auth/signup — then navigate to /setup
 */
async function ensureProfile(session: Session): Promise<{ created: boolean }> {
  const token = session.access_token

  try {
    await authApi.getMe(undefined, token)
    return { created: false }
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error
  }

  const name = profileNameFromSession(session)
  const companyName =
    typeof session.user.user_metadata?.company_name === 'string'
      ? session.user.user_metadata.company_name.trim()
      : ''

  if (!name) {
    throw new Error('Your account is missing a full name. Please contact support.')
  }

  await authApi.signup(
    {
      name,
      ...(companyName ? { companyName } : {}),
    },
    token,
  )

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
    queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
  ])

  return { created: true }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [booting, setBooting] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [justProvisioned, setJustProvisioned] = useState(false)
  const [provisioningError, setProvisioningError] = useState<string | null>(null)
  const [splashHold, setSplashHold] = useState(false)
  const bootingRef = useRef(true)
  const sessionRef = useRef<Session | null>(null)
  const pendingSessionRef = useRef<Session | null>(null)
  /** User id whose backend profile was already checked/created this session. */
  const provisionedUserIdRef = useRef<string | null>(null)
  const ensureInFlightRef = useRef<Promise<{ created: boolean }> | null>(null)
  const authEventGenerationRef = useRef(0)
  const mountedRef = useRef(true)
  const splashTimerRef = useRef<number | null>(null)

  const applySession = useCallback(async (nextSession: Session, holdSplash: boolean) => {
    pendingSessionRef.current = nextSession

    // Same user already provisioned (tab focus / duplicate SIGNED_IN / token sync):
    // update the session locally — do not call GET /auth/me again.
    if (provisionedUserIdRef.current === nextSession.user.id) {
      const previousSession = sessionRef.current
      sessionRef.current = nextSession
      setSession(nextSession)
      setProvisioningError(null)
      bootingRef.current = false
      setBooting(false)
      setProvisioning(false)

      if (holdSplash && previousSession == null) {
        setSplashHold(true)
        if (splashTimerRef.current !== null) {
          window.clearTimeout(splashTimerRef.current)
        }
        splashTimerRef.current = window.setTimeout(() => {
          splashTimerRef.current = null
          if (mountedRef.current) setSplashHold(false)
        }, LOGIN_SPLASH_MS)
      }
      return
    }

    setProvisioning(true)
    setProvisioningError(null)

    try {
      // === DEV AUTH BACKDOOR START — comment out this entire block to disable ===
      if (isDevAuthBypassSession(nextSession)) {
        const previousSession = sessionRef.current
        sessionRef.current = nextSession
        provisionedUserIdRef.current = nextSession.user.id
        setSession(nextSession)
        setJustProvisioned(false)
        if (holdSplash && previousSession == null) {
          setSplashHold(true)
          if (splashTimerRef.current !== null) {
            window.clearTimeout(splashTimerRef.current)
          }
          splashTimerRef.current = window.setTimeout(() => {
            splashTimerRef.current = null
            if (mountedRef.current) setSplashHold(false)
          }, LOGIN_SPLASH_MS)
        }
        return
      }
      // === DEV AUTH BACKDOOR END ===

      // Single-flight: getSession + onAuthStateChange often both fire on boot.
      const inFlight =
        ensureInFlightRef.current ??
        ensureProfile(nextSession).finally(() => {
          ensureInFlightRef.current = null
        })
      ensureInFlightRef.current = inFlight
      const { created } = await inFlight

      if (!mountedRef.current || pendingSessionRef.current?.access_token !== nextSession.access_token) {
        return
      }

      const previousSession = sessionRef.current
      if (previousSession && previousSession.user.id !== nextSession.user.id) {
        queryClient.clear()
      }
      sessionRef.current = nextSession
      provisionedUserIdRef.current = nextSession.user.id
      setSession(nextSession)
      setJustProvisioned(created)

      if (holdSplash && previousSession == null) {
        setSplashHold(true)
        if (splashTimerRef.current !== null) {
          window.clearTimeout(splashTimerRef.current)
        }
        splashTimerRef.current = window.setTimeout(() => {
          splashTimerRef.current = null
          if (mountedRef.current) setSplashHold(false)
        }, LOGIN_SPLASH_MS)
      }
    } catch (error) {
      if (mountedRef.current) setProvisioningError(errorMessage(error))
    } finally {
      if (mountedRef.current) {
        setProvisioning(false)
        bootingRef.current = false
        setBooting(false)
      }
    }
  }, [])

  const retryProvisioning = useCallback(() => {
    const pendingSession = pendingSessionRef.current
    if (pendingSession) void applySession(pendingSession, false)
  }, [applySession])

  useEffect(() => {
    mountedRef.current = true
    const startedAt = Date.now()

    void supabase.auth.getSession().then(async ({ data, error }) => {
      const remaining = Math.max(0, MIN_BOOT_SPLASH_MS - (Date.now() - startedAt))
      if (remaining > 0) await wait(remaining)
      if (!mountedRef.current) return

      // === DEV AUTH BACKDOOR START — comment out this entire block to disable ===
      const bypassSession = readPersistedDevAuthBypass()
      if (bypassSession) {
        await applySession(bypassSession, false)
        return
      }
      // === DEV AUTH BACKDOOR END ===

      if (error) {
        setProvisioningError(error.message)
        bootingRef.current = false
        setBooting(false)
        return
      }
      if (data.session) {
        await applySession(data.session, false)
        return
      }
      bootingRef.current = false
      setBooting(false)
    })

    // === DEV AUTH BACKDOOR START — comment out this entire block to disable ===
    function onDevAuthBypass(event: Event) {
      const detail = (event as CustomEvent<Session>).detail
      if (!detail) return
      void applySession(detail, true)
    }
    window.addEventListener('rf-dev-auth-bypass', onDevAuthBypass)
    // === DEV AUTH BACKDOOR END ===

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return
      const eventGeneration = ++authEventGenerationRef.current

      if (event === 'SIGNED_OUT' || !nextSession) {
        // === DEV AUTH BACKDOOR START — comment out this line to disable ===
        clearDevAuthBypass()
        // === DEV AUTH BACKDOOR END ===
        pendingSessionRef.current = null
        sessionRef.current = null
        provisionedUserIdRef.current = null
        ensureInFlightRef.current = null
        setSession(null)
        setJustProvisioned(false)
        setProvisioningError(null)
        queryClient.clear()
        return
      }

      // Soft session updates — never re-hit GET /auth/me.
      if (
        (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
        sessionRef.current?.user.id === nextSession.user.id
      ) {
        sessionRef.current = nextSession
        setSession(nextSession)
        return
      }

      // Tab focus / storage sync often re-emits SIGNED_IN for the same user.
      if (
        event === 'SIGNED_IN' &&
        provisionedUserIdRef.current === nextSession.user.id
      ) {
        sessionRef.current = nextSession
        setSession(nextSession)
        return
      }

      const holdSplash = event === 'SIGNED_IN' && !bootingRef.current
      window.setTimeout(() => {
        if (mountedRef.current && authEventGenerationRef.current === eventGeneration) {
          void applySession(nextSession, holdSplash)
        }
      }, 0)
    })

    return () => {
      mountedRef.current = false
      if (splashTimerRef.current !== null) {
        window.clearTimeout(splashTimerRef.current)
      }
      // === DEV AUTH BACKDOOR START — comment out this line to disable ===
      window.removeEventListener('rf-dev-auth-bypass', onDevAuthBypass)
      // === DEV AUTH BACKDOOR END ===
      subscription.unsubscribe()
    }
  }, [applySession])

  const loading = booting || provisioning || splashHold

  return (
    <AuthContext.Provider
      value={{ session, loading, justProvisioned, provisioningError, retryProvisioning }}
    >
      {children}
      {loading ? <FullScreenLoader /> : null}
      {!loading && provisioningError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold text-foreground">We couldn't finish signing you in</h1>
            <p className="mt-3 text-sm text-muted">{provisioningError}</p>
            <button
              type="button"
              onClick={retryProvisioning}
              className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
