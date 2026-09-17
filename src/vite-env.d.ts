/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** RoundFlow API host (GET /auth/me and all app data). */
  readonly VITE_API_URL: string
  /** Supabase GoTrue host — POST /auth/v1/token for login. */
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Set to "true" in .env.local to bypass setup redirects in a production build preview. */
  readonly VITE_BYPASS_SETUP_GATE?: string
  /** Google Cloud API key with Maps JavaScript API + Geocoding API enabled. Round Planner's Map view. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
