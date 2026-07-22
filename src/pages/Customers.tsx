import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { AppShell } from '@/components/app/AppShell'
import { CustomersScreen } from '@/components/customers/CustomersScreen'

export default function Customers() {
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const quickActions = useAppQuickActions()

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
      <CustomersScreen />
    </AppShell>
  )
}
