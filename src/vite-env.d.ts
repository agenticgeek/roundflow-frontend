/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** RoundFlow API host — also used as GoTrue auth base (POST /auth/v1/token). */
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Optional override when auth is not proxied on VITE_API_URL. */
  readonly VITE_SUPABASE_URL?: string
  /** Set to "true" in .env.local to bypass setup redirects in a production build preview. */
  readonly VITE_BYPASS_SETUP_GATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
