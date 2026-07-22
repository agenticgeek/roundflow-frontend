import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { useDashboardInteractions } from '@/hooks/use-dashboard-interactions'
import { AppShell } from '@/components/app/AppShell'
import { DashboardScreen } from '@/components/dashboard/DashboardScreen'

export default function Dashboard() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const interactions = useDashboardInteractions()

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  return (
    <AppShell quickActions={quickActions} onSignOut={handleSignOut} signingOut={signingOut}>
      <DashboardScreen interactions={interactions} />
    </AppShell>
  )
}
