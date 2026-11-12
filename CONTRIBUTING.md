# Contributing to RoundFlow

This is the RoundFlow **auth** frontend (login, signup, OTP, password reset,
dashboard) built on Supabase. It is **configuration-driven**: copy, routes, and
theme are decoupled from components, so most changes are a one-file edit.

## The three hard rules

1. **No user-visible string lives in a component.** All copy lives in `src/content/`.
2. **No raw colors in components.** No hex, no palette classes (`bg-neutral-900`),
   no arbitrary color values. Use semantic token classes only: `bg-primary`,
   `text-foreground`, `text-muted`, `border-border`, `bg-surface`, `bg-sidebar`,
   `text-danger`, `text-success`.
3. **No string hrefs.** Every link/redirect uses a constant from `src/config/routes.ts`.

## Standing rule (reuse before you write)

Before writing any function, search `src/lib` and `src/hooks` for an existing one.
Reuse it, or extend it (optional params / generics). Only if nothing fits, add a
generic, typed, single-purpose, JSDoc'd helper to the right registry: pure helper →
`lib/utils.ts`, network/action → `actions/`, stateful UI → `hooks/`. Never write
page-specific one-offs.

## Folder structure

```
src/
  content/     site.ts · auth.ts · setup-wizard.ts (all copy incl. wizard steps)
  config/      routes.ts · setup-wizard.ts (step order re-export)
  styles/      globals.css (semantic tokens + Tailwind @theme mapping)
  lib/         utils.ts · env.ts · setup-storage.ts · auth.tsx · supabase.ts
  components/
    ui.tsx           shared auth primitives (Field, PrimaryButton, inputClass, AuthTabs, …)
    AuthLayout.tsx   split-screen shell (dark brand panel + form)
    layout/Brand.tsx logo + wordmark, driven by site content
  pages/       Login · Signup · ForgotPassword · VerifyOtp · ResetPassword · SetupWizard · Dashboard
  components/setup-wizard/  stepper · footer · step panels · per-step forms
  router.tsx   createBrowserRouter built from ROUTES
  main.tsx     mounts <RouterProvider> inside <AuthProvider>
```

## Change map

| To change…                       | Edit this file                                 | Components touched |
| -------------------------------- | ---------------------------------------------- | ------------------ |
| Any auth screen copy / titles    | `src/content/auth.ts`                          | none               |
| Brand name / footer / legal URLs | `src/content/site.ts`                          | none               |
| Primary brand color / theme      | `src/styles/globals.css` (`--primary`, tokens) | none               |
| The dark auth panel color        | `src/styles/globals.css` (`--sidebar*`)        | none               |
| Add / rename a route             | `src/config/routes.ts`                         | none               |
| Setup wizard copy / fields       | `src/content/setup-wizard.ts`                  | none               |
| Wire a new page to a URL         | `src/router.tsx`                               | one page file      |
| Supabase credentials             | `.env` (`VITE_SUPABASE_*`)                     | none               |
| Dev vs prod setup gate           | automatic (`npm run dev`) or `VITE_BYPASS_SETUP_GATE` | none        |

## Dev vs production routing

Setup-flow redirects (`/setup` ↔ `/dashboard`, post-signup funnel) are **automatically
disabled** when running `npm run dev`. Production builds enforce them normally.

To preview a production build locally with gates off, add to `.env.local`:

```
VITE_BYPASS_SETUP_GATE=true
```

Never set this on Vercel/production.

`router.tsx` builds `createBrowserRouter` from `ROUTES`. `/` redirects to the
dashboard; `ProtectedRoute` bounces signed-out users to `/login`, and `GuestRoute`
bounces signed-in users away from `/login` and `/signup` (see `src/lib/auth.tsx`).

## Dialogs, confirmations and accessibility (Wave 1)

Details and rationale: `docs/2026-11-06-wave1-web.md`.

- **Never write your own overlay.** Use `Modal` (centred) or `SidePanel` (drawer). Both use
  `useDialogA11y`: focus moves in on open, Tab wraps, Escape closes only the topmost dialog, the page
  behind is `inert`, and focus returns to the opener. Give every dialog a title; put
  `data-autofocus` on the control that should take focus first if it is not the first one.
- **Destructive or hard-to-undo actions use `ConfirmDialog`** (`components/ui/confirm-dialog.tsx`), never
  a bare click. It is an `alertdialog` that focuses Cancel, disables itself while `pending`, and shows
  `error` inline. Catch the action's error and pass it back; a failed delete must never be silent.
  Copy goes in `content/confirm-dialog.ts`.
- **Errors**: link messages to inputs with `aria-describedby`; use `role="alert"` for failures that
  appear after an action and `role="status"` for results (e.g. the assignment summary).
- **Auth**: do not catch 401 in screens. `api()` refreshes and retries once, then signs out and sends the
  user to Login with "Your session expired"; the global mutation handler toasts 403.
- **Hand-typed API types** for endpoints missing from `types.gen.ts` are marked
  `// TODO(types.gen): replace after backend regen`. Never edit `types.gen.ts` by hand.

## Tests first and coverage

1. Write the failing test before the code (typed MSW handlers via `on()` / `specJson()` where the
   endpoint is in `types.gen.ts`).
2. Every new or changed file targets 100% lines, branches, functions and statements. Add new files to
   `AUDIT_REMEDIATION_FILES` in `vitest.config.ts`; `npm run test:coverage` enforces them per file.
3. `npm run test:coverage`, then `npm run test:diff-coverage` (fails on any uncovered changed line).
4. At most two rounds to get there. Anything still uncovered is deleted as dead code or marked with a
   commented `/* v8 ignore */` and listed in the PR for review.

## Maps, deep links and bulk actions (Wave 2A)

Details: `docs/2026-11-06-wave2a-web.md`.

- **Maps**: use `components/maps/StopsMapCanvas` (one pin per set of coincident stops, `AdvancedMarkerElement` with a legacy
  fallback, zoom capped at 17); do not create `google.maps.Marker`s in a screen. The Geocoding library is not loaded.
  `VITE_GOOGLE_MAPS_MAP_ID` sets the Cloud map ID (default `DEMO_MAP_ID`). Tests install a fake with
  `installFakeGoogle()` from `src/test/fake-google-maps.ts`. Anything that shows a pin should also show
  `LocationNote` / "Approximate location" when `locationApproximate` is true.
- **Deep links**: pages accept `?visitId=`, `?round=`, `?date=`. Read them with `useDeepLink()`, build them with
  `buildDeepLink()` (both in `lib/deep-link.ts`), and mark the target with `useHighlightFocus()` (`tabIndex={-1}`, `aria-current`).
- **Polling queries that also invalidate a family** (bulk send batches): keep their key out of the family they invalidate.
- **Hand-typed API shapes** still go in new `api/*.api.ts` files marked `// TODO(types.gen)` until the types are regenerated.
