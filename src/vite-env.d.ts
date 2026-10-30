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
  /** "false" turns off the `/app-invite?token=preview` sample screens in a deployed build. */
  readonly VITE_ENABLE_INVITE_PREVIEW?: string
  /** App Store page for the RoundFlow technician app. Shown after a technician sets up their login. */
  readonly VITE_TECHNICIAN_APP_IOS_URL?: string
  /** Google Play page for the RoundFlow technician app. */
  readonly VITE_TECHNICIAN_APP_ANDROID_URL?: string
  /** Stripe Connect platform client id (`ca_…`, public) — builds the OAuth consent URL. */
  readonly VITE_STRIPE_CONNECT_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
