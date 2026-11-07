import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { emergenciesContent } from '@/content/emergencies'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { useActiveEmergencyCount } from '@/features/emergencies/hooks/useEmergencies'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { cn } from '@/lib/utils'

interface EmergencyBellProps {
  className?: string
}

/**
 * Global notification bell — polls `GET /emergencies?status=ACTIVE` for the badge.
 * Hidden for technicians (the endpoints are ADMIN/MANAGER only).
 */
export function EmergencyBell({ className }: EmergencyBellProps) {
  const navigate = useNavigate()
  const { canMutate } = useAppBootstrap()
  const { count } = useActiveEmergencyCount()

  if (!canMutate) return null

  const { bell } = emergenciesContent

  return (
    <button
      type="button"
      onClick={() => navigate(ROUTES.emergencies)}
      aria-label={`${bell.label}: ${bell.tooltip(count)}`}
      title={bell.tooltip(count)}
      className={cn(
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground',
        // High priority: an active emergency is a filled red control, listed before the notification bell.
        count > 0 && 'bg-danger/10 text-danger hover:bg-danger/15 hover:text-danger',
        className,
      )}
    >
      <DashboardIcon name="alert" className="h-4 w-4" />
      {count > 0 ? (
        <span
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}
