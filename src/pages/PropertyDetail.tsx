import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { getCustomerRecordByPropertyId } from '@/content/customers'
import { getPropertyDetail } from '@/content/property-detail'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { AppShell } from '@/components/app/AppShell'
import {
  PropertyDetailNotFound,
  PropertyDetailScreen,
} from '@/components/property-detail/PropertyDetailScreen'

export default function PropertyDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { propertyId } = useParams()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()
  const property = getPropertyDetail(propertyId)
  const customerRecord = propertyId ? getCustomerRecordByPropertyId(propertyId) : null

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      navigate(ROUTES.login, { replace: true })
    }
  }

  function handleBack() {
    if (location.state?.from === 'customers') {
      navigate(ROUTES.customers)
      return
    }

    navigate(ROUTES.roundPlanner, { state: { view: 'list' } })
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
          customerRecord={customerRecord}
          onBack={handleBack}
        />
      ) : (
        <PropertyDetailNotFound onBack={handleBack} />
      )}
    </AppShell>
  )
}
