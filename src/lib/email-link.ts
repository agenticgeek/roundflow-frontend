import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const OTP_TYPES: readonly EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']

function isOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType)
}

/**
 * Signs in from an emailed link's query string.
 *
 * `?token_hash=…&type=…` (our email templates) is verified with `verifyOtp`, which works in any
 * browser or device. `?code=…` is the PKCE exchange (Google sign-in, older emails), which only works
 * in the browser that started the flow, because the code verifier is saved there.
 *
 * Returns null when the URL holds neither, otherwise the error message (null when signed in).
 */
export async function sessionFromEmailLink(params: URLSearchParams): Promise<{ error: string | null } | null> {
  const tokenHash = params.get('token_hash')
  const type = params.get('type')
  if (tokenHash) {
    if (!isOtpType(type)) return { error: 'This link is invalid or has expired.' }
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    return { error: error?.message ?? null }
  }

  const code = params.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return { error: error?.message ?? null }
  }

  return null
}

/** Query keys an email link adds, removed once it has been used. */
export const EMAIL_LINK_PARAMS = ['code', 'token_hash', 'type'] as const
