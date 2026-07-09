import type { TechnicianWorkloadItem } from '@/content/todays-work'
import { PanelCard } from '@/components/dashboard/DashboardControls'
import { cn } from '@/lib/utils'

interface TechnicianWorkloadProps {
  title: string
  items: readonly TechnicianWorkloadItem[]
}

const statusDotClass: Record<TechnicianWorkloadItem['status'], string> = {
  'on-track': 'bg-primary',
  completed: 'bg-success',
  attention: 'bg-warning',
}

/** Technician summary cards below the live rounds table. */
export function TechnicianWorkload({ title, items }: TechnicianWorkloadProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <PanelCard key={item.id} interactive={false} className="relative bg-card p-4">
            <span
              className={cn(
                'absolute top-4 right-4 h-2.5 w-2.5 rounded-full',
                statusDotClass[item.status],
              )}
              aria-hidden="true"
            />

            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {item.initial}
              </span>

              <div className="min-w-0 pr-4">
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-sm text-muted">{item.summary}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{item.roundLabel}</p>

                {item.issuesCount ? (
                  <p className="mt-1 text-sm font-medium text-danger">{item.issuesCount} issues</p>
                ) : null}

                <p className="mt-2 text-sm text-muted">{item.statusLabel}</p>
              </div>
            </div>
          </PanelCard>
        ))}
      </div>
    </section>
  )
}
