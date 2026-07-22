import { createContext, useContext, type ReactNode } from 'react'
import type { Profile, Role, SetupStatus } from '@/api/types'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { useMe } from '@/features/auth/hooks/useMe'
import { useSetupStatus } from '@/features/setup/hooks/useSetup'
import { isSetupGateBypassed } from '@/lib/env'
// === DEV AUTH BACKDOOR START — comment out this import + marked block below to disable ===
import {
  DEV_AUTH_BYPASS_PROFILE,
  DEV_AUTH_BYPASS_SETUP_STATUS,
  isDevAuthBypassSession,
} from '@/lib/dev-auth-bypass'
// === DEV AUTH BACKDOOR END ===
import { useAuth } from '@/lib/auth'

type AppBootstrapValue = {
  setupStatus: SetupStatus | undefined
  me: Profile | undefined
  role: Role | undefined
  isTechnician: boolean
  canMutate: boolean
  setupCompleted: boolean
  ready: boolean
  gateBypassed: boolean
}

const AppBootstrapContext = createContext<AppBootstrapValue | null>(null)

export function AppBootstrapProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const hasSession = session != null

  let usingDevAuthBypass = false
  // === DEV AUTH BACKDOOR START — comment out this line to disable ===
  usingDevAuthBypass = isDevAuthBypassSession(session)
  // === DEV AUTH BACKDOOR END ===

  // Keep queries enabled whenever a session exists — do not disable them during
  // splash holds, or tab-focus auth events will remount them as "pending".
  const queriesEnabled = hasSession && !usingDevAuthBypass

  const statusQuery = useSetupStatus(queriesEnabled)
  const meQuery = useMe(queriesEnabled)

  // === DEV AUTH BACKDOOR START — comment out this entire block to disable ===
  if (usingDevAuthBypass) {
    const bypassValue: AppBootstrapValue = {
      setupStatus: DEV_AUTH_BYPASS_SETUP_STATUS,
      me: DEV_AUTH_BYPASS_PROFILE,
      role: DEV_AUTH_BYPASS_PROFILE.role,
      isTechnician: false,
      canMutate: true,
      setupCompleted: true,
      ready: !authLoading,
      gateBypassed: true,
    }

    return (
      <AppBootstrapContext.Provider value={bypassValue}>{children}</AppBootstrapContext.Provider>
    )
  }
  // === DEV AUTH BACKDOOR END ===

  // First load only: settled once each query has succeeded or failed.
  // Background refetches keep cached data and never unset this.
  const bootstrapSettled =
    !hasSession ||
    ((statusQuery.isSuccess || statusQuery.isError) &&
      (meQuery.isSuccess || meQuery.isError))

  const showBootstrapLoader = hasSession && !authLoading && !bootstrapSettled
  const ready = !authLoading && bootstrapSettled

  const role = meQuery.data?.role
  const setupStatus = statusQuery.data
  const gateBypassed = isSetupGateBypassed()

  const value: AppBootstrapValue = {
    setupStatus,
    me: meQuery.data,
    role,
    isTechnician: role === 'TECHNICIAN',
    canMutate: role === 'ADMIN' || role === 'MANAGER',
    setupCompleted: setupStatus?.setupCompleted ?? false,
    ready,
    gateBypassed,
  }

  return (
    <AppBootstrapContext.Provider value={value}>
      {children}
      {showBootstrapLoader ? <FullScreenLoader /> : null}
    </AppBootstrapContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppBootstrap() {
  const context = useContext(AppBootstrapContext)
  if (!context) {
    throw new Error('useAppBootstrap must be used within AppBootstrapProvider')
  }
  return context
}
