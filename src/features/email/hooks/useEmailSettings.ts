import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { emailSettingsApi, type EmailDomain, type EmailDomainInput, type EmailSettings, type EmailSettingsPatch } from '@/api/email-settings.api'
import { invalidateBusinessSettings, queryKeys } from '@/lib/query-keys'

export const EMAIL_SETTINGS_KEY = [...queryKeys.settings.all, 'email'] as const

/** The domain panel polls this often while verification is PENDING. */
export const DOMAIN_POLL_MS = 30_000

export function useEmailSettings() {
  return useQuery({
    queryKey: EMAIL_SETTINGS_KEY,
    queryFn: ({ signal }) => emailSettingsApi.get(signal),
  })
}

/** Stores a fresh view and refreshes the places that read `channels` (the business profile). */
function remember(queryClient: QueryClient, data: EmailSettings) {
  queryClient.setQueryData(EMAIL_SETTINGS_KEY, data)
  return invalidateBusinessSettings(queryClient)
}

function rememberDomain(queryClient: QueryClient, domain: EmailDomain) {
  queryClient.setQueryData<EmailSettings>(EMAIL_SETTINGS_KEY, (current) => (current ? { ...current, domain } : current))
  return invalidateBusinessSettings(queryClient)
}

// The panel shows every error inline (next to the control), so none of these toasts globally.
const inline = { silenceGlobalError: true }

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EmailSettingsPatch) => emailSettingsApi.update(input),
    meta: inline,
    onSuccess: (data) => remember(queryClient, data),
  })
}

export function useSendTestEmail() {
  return useMutation({ mutationFn: () => emailSettingsApi.sendTest(), meta: inline })
}

export function useStartDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EmailDomainInput) => emailSettingsApi.startDomain(input),
    meta: inline,
    onSuccess: (domain) => rememberDomain(queryClient, domain),
  })
}

export function useCheckDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => emailSettingsApi.checkDomain(),
    meta: inline,
    onSuccess: (domain) => rememberDomain(queryClient, domain),
  })
}

export function useRemoveDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => emailSettingsApi.removeDomain(),
    meta: inline,
    onSuccess: (domain) => rememberDomain(queryClient, domain),
  })
}

export function useUploadLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, altText }: { file: File; altText: string }) => emailSettingsApi.uploadLogo(file, altText),
    meta: inline,
    onSuccess: (data) => remember(queryClient, data),
  })
}

export function useRemoveLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => emailSettingsApi.removeLogo(),
    meta: inline,
    onSuccess: (data) => remember(queryClient, data),
  })
}
