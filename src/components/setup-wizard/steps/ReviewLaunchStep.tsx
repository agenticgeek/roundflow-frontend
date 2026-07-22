import type { SetupStep12ChecklistItem } from '@/api/types'
import { setupWizardContent } from '@/content/setup-wizard'
import { cn } from '@/lib/utils'

interface ReviewLaunchStepProps {
  checklist: SetupStep12ChecklistItem[]
  allComplete: boolean
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChecklistIcon({ complete }: { complete: boolean }) {
  return (
    <span
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
        complete ? 'bg-success/10 text-success' : 'bg-surface text-muted',
      )}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  )
}

export function ReviewLaunchStep({ checklist, allComplete }: ReviewLaunchStepProps) {
  const { reviewLaunch } = setupWizardContent
  const { heading, subheading, progress, ready, nextSteps } = reviewLaunch

  const completedCount = checklist.filter((item) => item.complete).length
  const totalCount = checklist.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const completedLabel = progress.completed
    .replace('{completed}', String(completedCount))
    .replace('{total}', String(totalCount))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircleIcon className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground sm:text-2xl">{heading}</h2>
        <p className="mt-2 text-sm text-muted">{subheading}</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{progress.title}</p>
          <p className="text-sm text-muted">{completedLabel}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              allComplete ? 'bg-success' : 'bg-primary',
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <ul className="divide-y divide-border">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <ChecklistIcon complete={item.complete} />
              <span
                className={cn(
                  'text-sm',
                  item.complete ? 'font-medium text-foreground' : 'text-muted',
                )}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {allComplete ? (
        <div className="flex gap-3 rounded-xl border border-success/20 bg-success/5 p-4 sm:p-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircleIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{ready.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{ready.description}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <p className="text-sm font-medium text-foreground">{nextSteps.title}</p>
        <ul className="mt-3 space-y-2">
          {nextSteps.items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-muted">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
