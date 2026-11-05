import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { settingsApi, type GhlPrivateConnectInput } from '@/api/settings.api'
import { invalidateBusinessSettings, queryKeys } from '@/lib/query-keys'

/** GET /settings/ghl/status — under the settings prefix, so `settings` invalidation reaches it. */
export const GHL_STATUS_KEY = [...queryKeys.settings.all, 'ghl-status'] as const

/** `ghlConnected` also lives on the business settings row every settings GET returns. */
export function invalidateGhl(queryClient: QueryClient) {
  return Promise.all([
    invalidateBusinessSettings(queryClient),
    queryClient.invalidateQueries({ queryKey: GHL_STATUS_KEY }),
  ])
}

/** Works before setup is complete, so the setup wizard's Messages step can use it too. */
export function useGhlStatus() {
  return useQuery({
    queryKey: GHL_STATUS_KEY,
    queryFn: ({ signal }) => settingsApi.getGhlStatus(signal),
  })
}

export function useConnectGhl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GhlPrivateConnectInput) => settingsApi.connectGhlPrivate(input),
    // The card shows the server's reason (e.g. GHL rejected the key) inline.
    meta: { silenceGlobalError: true },
    onSuccess: () => invalidateGhl(queryClient),
  })
}

export function useDisconnectGhl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => settingsApi.disconnectGhl(),
    meta: { silenceGlobalError: true },
    onSuccess: () => invalidateGhl(queryClient),
  })
}

/** POST /settings/ghl/test — 409 GHL_NOT_CONNECTED, 502 GHL_SEND_FAILED (shown inline). */
export function useTestGhl() {
  return useMutation({
    mutationFn: () => settingsApi.testGhl(),
    meta: { silenceGlobalError: true },
  })
}

/**
 * GHL OAuth: fetch the consent URL with the bearer header, then leave for GoHighLevel. It comes
 * back through the API's callback to /settings/integrations?ghl=connected|error.
 */
export function useGhlOAuthConnect() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await settingsApi.ghlAuthorizeUrl()
      window.location.assign(url)
    },
    meta: { silenceGlobalError: true },
  })
}
