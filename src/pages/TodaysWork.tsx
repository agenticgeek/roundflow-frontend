import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { isSetupComplete, isSetupEnforced } from '@/lib/setup-storage'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { useTodaysWorkInteractions } from '@/hooks/use-todays-work-interactions'
import { AppShell } from '@/components/app/AppShell'
import { TodaysWorkScreen } from '@/components/todays-work/TodaysWorkScreen'

export default function TodaysWork() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const interactions = useTodaysWorkInteractions()

  if (isSetupEnforced() && !isSetupComplete()) {
    return <Navigate to={ROUTES.setupWizard} replace />
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  return (
    <AppShell
      quickActions={quickActions}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      mainMaxWidthClass="max-w-7xl"
    >
      <TodaysWorkScreen interactions={interactions} />
    </AppShell>
  )
}
