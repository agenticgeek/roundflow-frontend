import { createClient } from '@supabase/supabase-js'

/**
 * GoTrue is proxied on the RoundFlow API host (see /docs → POST /auth/v1/token).
 * Default auth base = VITE_API_URL so Network shows api-dev.roundflow.ai for login.
 * Set VITE_SUPABASE_URL only if you need to hit Supabase directly (no API proxy).
 */
const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing auth env. Set VITE_API_URL (or VITE_SUPABASE_URL) and VITE_SUPABASE_ANON_KEY in .env',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
