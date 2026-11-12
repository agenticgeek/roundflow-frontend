import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { floContent } from '@/content/flo'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { useIsAdmin } from '@/hooks/use-is-admin'
import { AppShell } from '@/components/app/AppShell'
import { FloScreen } from '@/components/flo/FloScreen'
import { AdminOnlyNote } from '@/components/settings/AdminOnlyNote'

/** Flo AI: administrators only. A manager who opens the URL sees the usual admin-only note. */
export default function FloAi() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const isAdmin = useIsAdmin()

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  return (
    <AppShell quickActions={quickActions} onSignOut={handleSignOut} signingOut={signingOut} mainMaxWidthClass="max-w-5xl">
      {isAdmin ? <FloScreen /> : <AdminOnlyNote>{floContent.adminOnly}</AdminOnlyNote>}
    </AppShell>
  )
}
