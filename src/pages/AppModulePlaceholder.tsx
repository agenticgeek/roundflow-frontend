import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/config/routes'
import { useAppQuickActions } from '@/hooks/use-app-quick-actions'
import { ModulePlaceholderPage } from '@/pages/ModulePlaceholder'

interface AppModulePlaceholderProps {
  moduleId: string
}

/** Shared auth + shell wrapper for modules that are not built yet. */
export function AppModulePlaceholder({ moduleId }: AppModulePlaceholderProps) {
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
    <ModulePlaceholderPage
      moduleId={moduleId}
      quickActions={quickActions}
      onSignOut={handleSignOut}
      signingOut={signingOut}
    />
  )
}
