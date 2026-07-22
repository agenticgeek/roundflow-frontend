import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/app/AppShell'
import { ComplaintsScreen } from '@/components/complaints/ComplaintsScreen'
import { ROUTES } from '@/config/routes'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { supabase } from '@/lib/supabase'

export default function Complaints() {
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
      mainMaxWidthClass="max-w-[96rem]"
    >
      <ComplaintsScreen />
    </AppShell>
  )
}
