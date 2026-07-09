import { PanelCard } from '@/components/dashboard/DashboardControls'

interface RoundPlannerPlaceholderViewProps {
  title: string
  description: string
}

/** Placeholder panel for Map / List views until those screens ship. */
export function RoundPlannerPlaceholderView({ title, description }: RoundPlannerPlaceholderViewProps) {
  return (
    <PanelCard interactive={false} className="flex min-h-[20rem] flex-col items-center justify-center text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
    </PanelCard>
  )
}
