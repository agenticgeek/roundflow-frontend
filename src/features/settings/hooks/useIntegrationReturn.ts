import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { settingsContent } from '@/content/settings'
import { useToast } from '@/components/ui/toast'
import { invalidateGhl } from '@/features/settings/hooks/useGhl'
import { queryKeys } from '@/lib/query-keys'
import { fillCopy } from '@/lib/utils'

export type IntegrationProvider = 'stripe' | 'ghl'

export interface IntegrationReturn {
  provider: IntegrationProvider
  ok: boolean
  /** What the toast says. */
  message: string
}

/** Query params the OAuth returns add — stripped once handled. */
const RESULT_PARAMS = ['stripe', 'ghl', 'message', 'webhookUrl'] as const

/**
 * Reads an OAuth return: `?stripe=connected` (Stripe, via StripeCallback) or
 * `?ghl=connected&webhookUrl=…` / `?ghl=error&message=…` (the API's public GHL callback, A5).
 * Anything else is null.
 */
export function readIntegrationReturn(search: string): IntegrationReturn | null {
  const params = new URLSearchParams(search)
  const ghl = params.get('ghl')
  const stripe = params.get('stripe')
  const reason = params.get('message')
  const failed = (template: string, fallback: string) =>
    reason ? fillCopy(template, { message: reason }) : fallback

  if (ghl === 'connected') return { provider: 'ghl', ok: true, message: settingsContent.ghl.connectedReturn }
  if (ghl) {
    return {
      provider: 'ghl',
      ok: false,
      message: failed(settingsContent.ghl.connectFailedReturn, settingsContent.ghl.connectFailedFallback),
    }
  }
  if (stripe === 'connected') {
    return { provider: 'stripe', ok: true, message: settingsContent.paymentSetup.stripeConnected }
  }
  if (stripe) {
    return {
      provider: 'stripe',
      ok: false,
      message: failed(settingsContent.paymentSetup.stripeConnectFailed, settingsContent.paymentSetup.stripeCallbackFailed),
    }
  }
  return null
}

/**
 * Handles an OAuth return once, on mount: toasts the result, refreshes the connection status
 * (Settings and the setup wizard's Payments step), and strips the result params from the URL
 * (keeping the rest, e.g. the wizard's `?step=`). Returns what it found, so a screen can open
 * the matching section.
 */
export function useIntegrationReturn(onReturn?: (result: IntegrationReturn) => void): IntegrationReturn | null {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [result] = useState(() => readIntegrationReturn(location.search))
  const handled = useRef(false)

  useEffect(() => {
    if (!result || handled.current) return
    handled.current = true
    showToast(result.message, result.ok ? {} : { tone: 'error' })
    void Promise.all([
      invalidateGhl(queryClient),
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.step(2) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.setup.status }),
    ])
    const params = new URLSearchParams(location.search)
    for (const key of RESULT_PARAMS) params.delete(key)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
    onReturn?.(result)
    // Once per mount — the URL change above must not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return result
}
