# Today's Work UI

Guide to the Today's Work module and how to extend it.

## Route

`/todays-work` — protected route, rendered by `src/pages/TodaysWork.tsx`.

## Architecture

```
TodaysWork.tsx
  └── useAppQuickActions()           ← shared sidebar quick-action modals
  └── useTodaysWorkInteractions()  ← search, problem filter, live refresh
  └── AppShell                       ← fixed sidebar + scrollable main
        └── TodaysWorkScreen
              ├── TodaysWorkHeader     ← title, date, live status, close day
              ├── TodaysWorkMetrics    ← compact KPI strip
              ├── TodaysWorkToolbar    ← search, show only problems
              ├── TodaysWorkRoundsTable
              └── TechnicianWorkload
```

**Rule:** copy in `src/content/todays-work.ts`, state in `src/hooks/use-todays-work-interactions.ts`, visuals in `src/components/todays-work/`.

## Interactions (what works today)

| Control | Behaviour |
|---------|-----------|
| Refresh | Updates the live timestamp (demo) |
| Search | Filters rounds by round, technician, ETA, value |
| Show only problems | Hides rounds with no skips, issues, or payment holds |
| Close Day | Button present — flow TBD |
| Round actions menu | Button present — menu TBD |

## Adding a new Today's Work screen

1. Add content/types to `src/content/todays-work.ts`.
2. Build a component under `src/components/todays-work/`.
3. Compose it from `TodaysWorkScreen.tsx`.
4. Extend `useTodaysWorkInteractions.ts` if shared state is needed.
