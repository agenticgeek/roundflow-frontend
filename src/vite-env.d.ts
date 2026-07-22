/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  /** Set to "true" in .env.local to bypass setup redirects in a production build preview. */
  readonly VITE_BYPASS_SETUP_GATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
