import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { SETUP_STEP_COUNT } from '@/config/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { SetupBanner } from '@/components/setup-wizard/SetupBanner'
import { WizardStepTitle } from '@/components/setup-wizard/WizardParts'
import { formatShortDate } from '@/lib/round-dates'
import { cn, fillCopy } from '@/lib/utils'

/** Handed over by the wizard's Activate step through router state. */
export interface SetupLiveState {
  businessName: string
  areas: number
  rounds: number
  properties: number
  technicians: number
  visits: number
  startDate: string
  areasWithoutRounds: string[]
  unplacedProperties: number
  stripeConnected: boolean
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z" strokeLinejoin="round" />
    </svg>
  )
}

function NextStep({
  number,
  title,
  description,
  action,
  highlight,
  onClick,
}: {
  number: number
  title: string
  description: string
  action: string
  highlight?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-xl border px-5 py-4 text-left transition-colors',
        highlight ? 'border-primary bg-primary/5 hover:bg-primary/10' : 'border-border bg-foreground/[0.02] hover:bg-surface',
      )}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-foreground">
          {number}. {title}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
      <span className="shrink-0 text-sm font-medium text-primary sm:text-[15px]">{action}</span>
    </button>
  )
}

export default function SetupLive() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as SetupLiveState | null
  const content = setupWizardContent.live

  // Reached without the wizard's summary (e.g. a refresh) — there's nothing to show.
  if (!state) return <Navigate to={ROUTES.dashboard} replace />

  const stats = [
    { value: state.areas, label: content.stats.areas },
    { value: state.rounds, label: content.stats.rounds },
    { value: state.properties, label: content.stats.properties },
    { value: state.technicians, label: content.stats.technicians },
    { value: state.visits, label: content.stats.visits },
  ]

  const areaList = state.areasWithoutRounds.join(', ')
  const fixTitle =
    state.areasWithoutRounds.length > 0 && state.unplacedProperties > 0
      ? fillCopy(content.next.fixRounds.titleBoth, { areas: areaList, count: state.unplacedProperties })
      : state.areasWithoutRounds.length > 0
        ? fillCopy(content.next.fixRounds.titleAreas, { areas: areaList })
        : fillCopy(content.next.fixRounds.titleProperties, { count: state.unplacedProperties })

  const nextSteps = [
    {
      key: 'assign',
      title: content.next.assign.title,
      description: content.next.assign.description,
      action: content.next.assign.action,
      onClick: () => navigate(ROUTES.roundPlannerAssign),
    },
    state.areasWithoutRounds.length > 0 || state.unplacedProperties > 0
      ? {
          key: 'fix',
          title: fixTitle,
          description: content.next.fixRounds.description,
          action: content.next.fixRounds.action,
          onClick: () => navigate(ROUTES.roundPlanner),
        }
      : null,
    state.stripeConnected
      ? null
      : {
          key: 'stripe',
          title: content.next.stripe.title,
          description: content.next.stripe.description,
          action: content.next.stripe.action,
          onClick: () => navigate(ROUTES.settings),
        },
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SetupBanner currentIndex={-1} completedSteps={Array.from({ length: SETUP_STEP_COUNT }, () => true)} />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <WizardStepTitle icon={<BoltIcon />} title={content.heading} subtitle={content.subheading} />

        <section className="rounded-2xl border border-primary/30 bg-card px-5 py-8 sm:px-10 sm:py-12">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-8 w-8" aria-hidden="true">
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="mt-5 text-xl font-semibold text-foreground sm:text-2xl">
              {state.businessName ? fillCopy(content.title, { business: state.businessName }) : content.titleFallback}
            </h2>
            <p className="mt-2 text-[15px] text-muted">
              {fillCopy(content.summary, {
                visits: state.visits,
                rounds: state.rounds,
                date: formatShortDate(state.startDate, true),
              })}
            </p>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-foreground/[0.03] px-4 py-5 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-semibold text-primary">{stat.value}</dd>
                <dd aria-hidden="true" className="mt-1 text-sm text-muted">{stat.label}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 space-y-3">
            {nextSteps.map((item, index) => (
              <NextStep
                key={item.key}
                number={index + 1}
                title={item.title}
                description={item.description}
                action={item.action}
                highlight={index === 0}
                onClick={item.onClick}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => navigate(ROUTES.dashboard, { replace: true })}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground sm:text-[15px]"
            >
              {content.goToDashboard}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
