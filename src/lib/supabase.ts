import { createClient } from '@supabase/supabase-js'
import { authBaseUrl } from '@/lib/env'

const supabaseUrl = authBaseUrl()
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
