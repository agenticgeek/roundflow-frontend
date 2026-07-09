/**
 * Environment helpers — single place for dev vs production behaviour.
 * Vite sets `import.meta.env.DEV` / `PROD` automatically; no .env needed for local dev.
 */

/** True when running the Vite dev server (`npm run dev`). */
export const IS_DEV = import.meta.env.DEV

/** True when running a production build (`npm run build` / Vercel). */
export const IS_PROD = import.meta.env.PROD

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
