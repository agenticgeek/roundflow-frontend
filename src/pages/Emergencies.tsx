import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { AppShell } from '@/components/app/AppShell'
import { EmergenciesScreen } from '@/components/emergencies/EmergenciesScreen'

export default function Emergencies() {
  const navigate = useNavigate()
  const { isTechnician, ready } = useAppBootstrap()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()

  // ADMIN/MANAGER only — technicians never see this page (handoff §5).
  if (ready && isTechnician) {
    return <Navigate to={ROUTES.todaysWork} replace />
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
      <EmergenciesScreen />
    </AppShell>
  )
}
