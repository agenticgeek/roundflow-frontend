const DEFERRED_KEY = 'roundflow-setup-deferred'
const CARD_DISMISSED_KEY = 'roundflow-setup-card-dismissed'

/** User chose Skip — app is reachable while API setupCompleted is still false. */
export function isSetupDeferred(): boolean {
  return window.localStorage.getItem(DEFERRED_KEY) === 'true'
}

export function deferSetup(): void {
  window.localStorage.setItem(DEFERRED_KEY, 'true')
}

/** Cleared when setup completes via API. */
export function clearSetupDeferred(): void {
  window.localStorage.removeItem(DEFERRED_KEY)
  window.sessionStorage.removeItem(CARD_DISMISSED_KEY)
}

/** Soft-hide the dashboard card for this browser tab/session only. */
export function isSetupCardDismissed(): boolean {
  return window.sessionStorage.getItem(CARD_DISMISSED_KEY) === 'true'
}

export function dismissSetupCard(): void {
  window.sessionStorage.setItem(CARD_DISMISSED_KEY, 'true')
}
