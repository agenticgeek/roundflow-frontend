# Round Planner UI

Guide to the Round Planner module and how to extend it.

## Route

`/round-planner` — protected route, rendered by `src/pages/RoundPlanner.tsx`.

## Architecture

```
RoundPlanner.tsx
  └── useAppQuickActions()           ← shared sidebar quick-action modals
  └── useRoundPlannerInteractions()  ← week, filters, view mode, search
  └── AppShell                       ← fixed sidebar + scrollable main
        └── RoundPlannerScreen
              ├── RoundPlannerHeader   ← cycle, week filter, area, view toggle
              ├── RoundPlannerToolbar  ← search, technician, status, add round
              ├── RoundPlannerMetrics
              ├── RoundPlannerCalendar ← calendar view
              └── RoundPlannerPlaceholderView ← map / list stubs
```

**Rule:** copy in `src/content/round-planner.ts`, state in `src/hooks/use-round-planner-interactions.ts`, visuals in `src/components/round-planner/`.

## Shared app shell

Sidebar nav, quick actions, and sign-out live in `src/content/app-shell.ts` and `src/components/app/AppShell.tsx`. Every app module page wraps its screen in `AppShell` and passes `useAppQuickActions()`.

Nav items map to `ROUTES` in `src/config/routes.ts` — sidebar uses `NavLink` for real routing between modules.

## Interactions (what works today)

| Control | Behaviour |
|---------|-----------|
| Week filter | All weeks or a single week row in the calendar |
| Area | Dropdown (demo — filters content when wired to API) |
| View toggle | Calendar (live), Map / List (placeholder panels) |
| Search | Filters rounds by title, technician, date |
| Technician / Status | Filter visible round cards |
| Sync cycle | Spins refresh icon (demo) |
| Round cards | Clickable affordance — detail route TBD |
| Add Round | Button present — modal TBD |

## Adding a new Round Planner screen

1. Add a view id to `RoundPlannerView` and `roundPlannerContent.views`.
2. Build a component under `src/components/round-planner/`.
3. Render it from `RoundPlannerScreen.tsx` when `interactions.view` matches.
4. Extend `useRoundPlannerInteractions.ts` if the screen needs shared state.

## Adding another app module

1. Add path to `ROUTES` in `src/config/routes.ts`.
2. Add nav item to `appShellContent.sidebar.nav`.
3. Create `src/pages/MyModule.tsx` using `AppShell` + interactions hook pattern.
4. Register the route in `src/router.tsx`.

Unbuilt modules can use `AppModulePlaceholder` until the real screen ships.
