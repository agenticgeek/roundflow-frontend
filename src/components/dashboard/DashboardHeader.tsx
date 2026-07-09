import { IconButton } from '@/components/dashboard/DashboardControls'

interface DashboardHeaderProps {
  title: string
  subtitle: string
  date: string
  lastUpdated: string
  autoRefresh: string
  refreshing?: boolean
  onRefresh?: () => void
}

/** Page header with a working refresh control. */
export function DashboardHeader({
  title,
  subtitle,
  date,
  lastUpdated,
  autoRefresh,
  refreshing = false,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      <div className="text-left md:text-right">
        <p className="text-sm font-semibold text-foreground">{date}</p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted md:justify-end">
          <span>{lastUpdated}</span>
          <IconButton icon="refresh" label="Refresh dashboard" onClick={onRefresh} spinning={refreshing} />
        </div>
        <p className="mt-2 text-xs font-semibold text-success">{autoRefresh}</p>
      </div>
    </header>
  )
}
