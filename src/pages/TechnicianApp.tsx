import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '@/components/AuthLayout'
import { ROUTES } from '@/config/routes'
import { technicianAppContent } from '@/content/technician-app'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 5.5h3M12 18.5h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Where TECHNICIAN accounts land instead of the portal — `GET /auth/me` decides,
 * and the route guards send them here. No store links yet: the app isn't released.
 */
export default function TechnicianApp() {
  const navigate = useNavigate()
  const { me } = useAppBootstrap()
  const { session } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(false)
  const identity = me?.name || session?.user.email

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError(false)
    try {
      const { error } = await supabase.auth.signOut()
      // A failed sign-out keeps the session, and the guards would bounce the
      // user straight back here — say so instead of looping silently.
      if (error) throw error
      navigate(ROUTES.login, { replace: true })
    } catch {
      setSignOutError(true)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PhoneIcon />
          </span>
          <span className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">
            {technicianAppContent.badge}
          </span>
          <h1 className="text-2xl font-semibold text-foreground">{technicianAppContent.title}</h1>
          <p className="text-sm leading-relaxed text-muted">{technicianAppContent.body}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface px-5 py-4 text-center">
          <p className="text-sm font-semibold text-foreground">
            {technicianAppContent.comingSoon.title}
          </p>
          <p className="mt-1 text-sm text-muted">{technicianAppContent.comingSoon.body}</p>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted">{technicianAppContent.help}</p>

        <div className="space-y-3 border-t border-border pt-5 text-center">
          {identity ? (
            <p className="text-xs text-muted">
              {technicianAppContent.signedInAs}{' '}
              <span className="font-medium text-foreground">{identity}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? technicianAppContent.signingOut : technicianAppContent.signOut}
          </button>
          {signOutError ? (
            <p role="alert" className="text-xs text-danger">
              {technicianAppContent.signOutError}
            </p>
          ) : null}
        </div>
      </div>
    </AuthLayout>
  )
}
