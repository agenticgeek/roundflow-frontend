# Dashboard UI

Short guide to how the dashboard is built and how to extend it.

## Route

`/dashboard` — protected route, rendered by `src/pages/Dashboard.tsx`.

## Architecture

```
Dashboard.tsx
  └── useAppQuickActions()           ← shared sidebar quick-action modals
  └── useDashboardInteractions()   ← dashboard-only UI state
  └── AppShell                       ← fixed sidebar + scrollable main
        └── DashboardScreen        ← composes sections only
              ├── DashboardHeader
              ├── DashboardMetricGrid
              ├── DashboardAlertRow
              ├── DashboardAlertModal
              ├── GpsTrackingPanel
              ├── TechnicianKpis
              └── TodayRoundsTable
```

**Rule:** copy lives in `src/content/dashboard.ts`, state in `src/hooks/use-dashboard-interactions.ts`, visuals in `src/components/dashboard/`. Shared chrome (sidebar, quick actions) lives in `src/content/app-shell.ts` and `src/components/app/AppShell.tsx` — see `docs/round-planner.md`.

## Reusable building blocks

| File | Purpose |
|------|---------|
| `dashboard-styles.ts` | Shared hover, press, nav, and chart bar classes |
| `DashboardControls.tsx` | `FilterChip`, `SegmentToggle`, `IconButton`, `TextLinkButton`, `PanelCard` |
| `ChartTooltip.tsx` | Tooltip state + positioning helper |
| `DashboardCharts.tsx` | `DashboardBarChart`, `DashboardLineChart`, `DashboardIssueChart` with tooltips |
| `DashboardIcon.tsx` | Icon lookup by name string |

Import shared classes instead of copying Tailwind strings:

```tsx
import { dashboardHoverCardClass, dashboardPressableClass } from '@/components/dashboard/dashboard-styles'
```

## Interactions (what works today)

| Control | Behaviour |
|---------|-----------|
| Sidebar nav | Updates active item highlight |
| Quick Actions → Bulk Message | Opens bulk message round modal |
| Quick Actions → Add One-off Job | Opens add one-off job modal |
| Refresh button | Spins icon, updates "Last updated" time |
| Alert cards | Click opens a detail modal (skipped jobs, failed payments, complaint revisits) |
| GPS pins + cards | Click to select/highlight technician |
| Technician filters | Toggle James / Sarah chips (min 1 selected) |
| Period toggle | Monthly ↔ Yearly rescales chart values |
| Chart bars/points | Hover shows tooltip with label + value |
| Table rows | Hover highlight + click to select row |

## Adding a new dashboard section

1. Add copy/data to `src/content/dashboard.ts`.
2. Create `src/components/dashboard/MySection.tsx` using `PanelCard`, tone helpers, and shared hover classes.
3. Compose it inside `DashboardScreen.tsx`.
4. If it needs shared state, extend `useDashboardInteractions.ts`.

## Adding a new chart

Use an existing chart from `DashboardCharts.tsx` or copy the pattern:

```tsx
// 1. Wrap chart area in a relative container with data-chart-root
// 2. Render <ChartTooltip tooltip={tooltip} />
// 3. Call showTooltip / hideTooltip on bar/point mouse events
```

`getChartTooltipPosition()` keeps tooltip placement relative to the chart root.

## Theme

Use semantic tokens only: `text-accent`, `bg-accent-surface`, `text-primary`, `bg-surface`, `text-warning`, `border-border`, etc.

| Token | Value | Use |
|-------|-------|-----|
| `accent` | `#029BB6` | Selected nav text, active filter/toggle text |
| `accent-surface` | `#E8F6F9` | Selected nav tab, active chip/toggle background |
| `primary` | `#029BB6` | All CTA / primary action buttons |
| `background` | `#F5FFFE` | Page canvas |

Tone helpers in `dashboard-styles.ts` map status colours (success, warning, danger) consistently.

## Layout

- Sidebar: fixed, full viewport height (`h-svh`), does not scroll with content.
- Main: `overflow-y-auto` — only the right panel scrolls.
