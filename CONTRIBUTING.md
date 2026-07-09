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
