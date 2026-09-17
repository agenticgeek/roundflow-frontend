/**
 * Environment helpers — single place for dev vs production behaviour.
 * Vite sets `import.meta.env.DEV` / `PROD` automatically; no .env needed for local dev.
 */

/** True when running the Vite dev server (`npm run dev`). */
export const IS_DEV = import.meta.env.DEV

/** True when running a production build (`npm run build` / Vercel). */
export const IS_PROD = import.meta.env.PROD

/**
 * Same-origin prefix used by the Vite dev proxy (`vite.config.ts`).
 * Browser calls `/__rf/auth/me` → Vite forwards to `VITE_API_URL/auth/me`
 * so localhost:5173 does not hit CORS on the RoundFlow API.
 */
export const DEV_API_PROXY_PREFIX = '/__rf'

/** RoundFlow API origin used by `api()` — proxied in dev, `VITE_API_URL` in production. */
export function apiBaseUrl(): string {
  if (IS_DEV) return DEV_API_PROXY_PREFIX
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error('Missing VITE_API_URL. Configure the RoundFlow API before loading server data.')
  }
  return url.replace(/\/$/, '')
}

/**
 * When true, setup-flow redirects are disabled so every route is reachable
 * (e.g. /setup after completion, /dashboard before completion).
 *
 * Active automatically in development, or set `VITE_BYPASS_SETUP_GATE=true`
 * in `.env.local` to test a production build locally.
 */
export function isSetupGateBypassed(): boolean {
  return IS_DEV || import.meta.env.VITE_BYPASS_SETUP_GATE === 'true'
}

/** Google Cloud API key for Round Planner's Map view, or undefined until configured. */
export function googleMapsApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || undefined
}
