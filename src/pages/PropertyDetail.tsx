import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { propertyDetailContent, getPropertyDetail } from '@/content/property-detail'
import { isSetupComplete, isSetupEnforced } from '@/lib/setup-storage'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { AppShell } from '@/components/app/AppShell'
import {
  PropertyDetailNotFound,
  PropertyDetailScreen,
} from '@/components/property-detail/PropertyDetailScreen'

export default function PropertyDetail() {
  const navigate = useNavigate()
  const { propertyId } = useParams()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const property = getPropertyDetail(propertyId)

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

  function handleBack() {
    navigate(ROUTES.roundPlanner, { state: { view: 'list' } })
  }

  function handlePauseService() {
    const { pauseServiceToast } = propertyDetailContent

    navigate(ROUTES.roundPlanner, {
      state: {
        view: 'list',
        toast: pauseServiceToast,
      },
    })
  }

  return (
    <AppShell
      quickActions={quickActions}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      mainMaxWidthClass="max-w-7xl"
    >
      {property ? (
        <PropertyDetailScreen
          property={property}
          onSendMessage={quickActions.openBulkMessageModal}
          onPauseService={handlePauseService}
        />
      ) : (
        <PropertyDetailNotFound onBack={handleBack} />
      )}
    </AppShell>
  )
}
