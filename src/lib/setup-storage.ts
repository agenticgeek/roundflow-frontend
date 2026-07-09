import { ROUTES } from '@/config/routes'
import { isSetupGateBypassed } from '@/lib/env'

const STORAGE_KEY = 'roundflow-setup-complete'
const SKIPPED_STORAGE_KEY = 'roundflow-setup-skipped'

/** Return true when the user has finished the setup wizard. */
export function isSetupComplete(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === 'true'
}

/** Return true when the user bypassed setup instead of completing it. */
export function isSetupSkipped(): boolean {
  return window.localStorage.getItem(SKIPPED_STORAGE_KEY) === 'true'
}

/** Whether setup completion should block or redirect navigation. */
export function isSetupEnforced(): boolean {
  return !isSetupGateBypassed()
}

/** Route to send authenticated users after login/signup. */
export function getPostAuthRoute(): typeof ROUTES.dashboard | typeof ROUTES.setupWizard {
  return isSetupEnforced() && !isSetupComplete() ? ROUTES.setupWizard : ROUTES.dashboard
}

/** Persist setup completion until a backend flag replaces this. */
export function markSetupComplete(): void {
  window.localStorage.setItem(STORAGE_KEY, 'true')
  window.localStorage.removeItem(SKIPPED_STORAGE_KEY)
}

/** Persist that setup was intentionally skipped, while allowing app access. */
export function markSetupSkipped(): void {
  window.localStorage.setItem(STORAGE_KEY, 'true')
  window.localStorage.setItem(SKIPPED_STORAGE_KEY, 'true')
}

/** Clear completion — useful for dev/testing only. */
export function resetSetupComplete(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
