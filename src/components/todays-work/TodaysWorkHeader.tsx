import { IconButton } from '@/components/dashboard/DashboardControls'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { cn } from '@/lib/utils'

interface TodaysWorkHeaderProps {
  title: string
  subtitle: string
  date: string
  liveLabel: string
  lastUpdated: string
  refreshLabel: string
  closeDayLabel: string
  refreshing: boolean
  onRefresh: () => void
  onCloseDay?: () => void
  closeDayDisabled?: boolean
  /** Technician-only: self-report an emergency mid-round. */
  reportEmergencyLabel?: string
  onReportEmergency?: () => void
}

/** Page header with live status and close-day action. */
export function TodaysWorkHeader({
  title,
  subtitle,
  date,
  liveLabel,
  lastUpdated,
  refreshLabel,
  closeDayLabel,
  refreshing,
  onRefresh,
  onCloseDay,
  closeDayDisabled = false,
  reportEmergencyLabel,
  onReportEmergency,
}: TodaysWorkHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="min-w-0 text-left sm:text-right">
          <p className="text-sm font-semibold text-foreground">{date}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted sm:justify-end">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 font-semibold',
                liveLabel === 'CLOSED' ? 'text-muted' : 'text-success',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  liveLabel === 'CLOSED' ? 'bg-muted' : 'bg-success',
                )}
                aria-hidden="true"
              />
              {liveLabel}
            </span>
            <span>{lastUpdated}</span>
          </div>
        </div>

        <IconButton icon="refresh" label={refreshLabel} onClick={onRefresh} spinning={refreshing} />

        {onReportEmergency && reportEmergencyLabel ? (
          <button
            type="button"
            onClick={onReportEmergency}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-danger px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5"
          >
            <DashboardIcon name="alert" className="h-4 w-4" />
            {reportEmergencyLabel}
          </button>
        ) : null}

        <button
          type="button"
          className={cn(
            dashboardCtaClass,
            'shrink-0',
            (closeDayDisabled || !onCloseDay) && 'cursor-not-allowed opacity-50',
          )}
          disabled={closeDayDisabled || !onCloseDay}
          onClick={onCloseDay}
          title={
            closeDayDisabled
              ? liveLabel === 'CLOSED'
                ? 'Day already closed'
                : "You don't have permission to close the day"
              : undefined
          }
        >
          {closeDayLabel}
        </button>
      </div>
    </header>
  )
}
