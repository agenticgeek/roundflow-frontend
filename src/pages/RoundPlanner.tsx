import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES, propertyDetailPath } from '@/config/routes'
import type { RoundPlannerView } from '@/content/round-planner'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { useRoundPlannerInteractions } from '@/hooks/use-round-planner-interactions'
import { useToast } from '@/components/ui/toast'
import { AppShell } from '@/components/app/AppShell'
import { RoundPlannerScreen } from '@/components/round-planner/RoundPlannerScreen'

type RoundPlannerLocationState = {
  view?: RoundPlannerView
  toast?: {
    title: string
    description?: string
  }
}

export default function RoundPlanner() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const interactions = useRoundPlannerInteractions()

  const { setView } = interactions

  useEffect(() => {
    const state = location.state as RoundPlannerLocationState | null
    if (!state?.view && !state?.toast) return

    if (state.view) {
      setView(state.view)
    }

    if (state.toast) {
      showToast(state.toast.title, { description: state.toast.description })
    }

    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate, setView, showToast])

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  function handleViewPropertyDetails(propertyId: string) {
    navigate(propertyDetailPath(propertyId))
  }

  return (
    <AppShell
      quickActions={quickActions}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      mainMaxWidthClass="max-w-7xl"
    >
      <RoundPlannerScreen
        interactions={interactions}
        onAddRound={quickActions.openAddRoundModal}
        onBulkMessage={quickActions.openBulkMessageModal}
        onAddOneOffJob={quickActions.openAddOneOffJobModal}
        onViewPropertyDetails={handleViewPropertyDetails}
      />
    </AppShell>
  )
}
