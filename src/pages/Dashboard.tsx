import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import type { DashboardAlertId } from '@/content/dashboard'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { useDashboardInteractions } from '@/hooks/use-dashboard-interactions'
import { AppShell } from '@/components/app/AppShell'
import { DashboardScreen } from '@/components/dashboard/DashboardScreen'

/** Where each alert card sends the user — the detail lives on those screens. */
const ALERT_ROUTES: Record<DashboardAlertId, string> = {
  skipped: ROUTES.todaysWork,
  'failed-payments': ROUTES.debtPayment,
  'complaint-revisits': ROUTES.complaints,
}

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
      <DashboardScreen
        interactions={interactions}
        onOpenAlert={(id) => navigate(ALERT_ROUTES[id])}
        onViewAllRounds={() => navigate(ROUTES.todaysWork)}
      />
    </AppShell>
  )
}
