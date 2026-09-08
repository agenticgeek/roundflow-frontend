import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { ROUTES } from '@/config/routes'
import { useAuth } from '@/lib/auth'
import { resolvePendingInviteToken } from '@/lib/pending-invite'
import { supabase } from '@/lib/supabase'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { session, loading: authLoading, justProvisioned } = useAuth()
  const { ready, setupCompleted } = useAppBootstrap()
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteToken] = useState(
    () =>
      new URLSearchParams(window.location.search).get('invite_token')?.trim() ??
      resolvePendingInviteToken() ??
      '',
  )

  useEffect(() => {
    let active = true

    async function exchangeSession() {
      const params = new URLSearchParams(window.location.search)
      const providerError = params.get('error_description') ?? params.get('error')
      if (providerError) {
        if (active) {
          setError(providerError)
          setExchanging(false)
        }
        return
      }

      const code = params.get('code')
      if (!code) {
        const { data } = await supabase.auth.getSession()
        if (active && !data.session) {
          setError('This sign-in link is invalid or has expired.')
        }
        if (active) setExchanging(false)
        return
      }

      // Supabase confirms the session; AuthProvider then runs GET /auth/me
      // and POST /auth/signup on 404 before we navigate.
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (active) {
        setError(exchangeError?.message ?? null)
        setExchanging(false)
      }
    }

    void exchangeSession()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!exchanging && !authLoading && session && ready) {
      // Invite accept provisions via POST /invites/:token/accept — land in app.
      if (inviteToken) {
        navigate(ROUTES.dashboard, { replace: true })
        return
      }
      // Backend contract: after POST /auth/signup, land on setup wizard.
      const destination =
        justProvisioned || !setupCompleted ? ROUTES.setupWizard : ROUTES.dashboard
      navigate(destination, { replace: true })
    }
  }, [
    authLoading,
    exchanging,
    inviteToken,
    justProvisioned,
    navigate,
    ready,
    session,
    setupCompleted,
  ])

  if (exchanging || authLoading || (session && !ready)) return <FullScreenLoader />

  if (error) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-foreground">Unable to complete sign in</h1>
          <p className="mt-3 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.login, { replace: true })}
            className="mt-6 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            Back to log in
          </button>
        </div>
      </main>
    )
  }

  return <FullScreenLoader />
}
