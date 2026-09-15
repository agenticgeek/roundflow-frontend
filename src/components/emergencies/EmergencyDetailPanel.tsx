import { useEffect, useState } from 'react'
import type { EmergencyAvailableTechnician } from '@/api/emergencies.api'
import { emergenciesContent, emergencyAvailabilityLabels, emergencyStatusLabels } from '@/content/emergencies'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { dashboardCtaClass } from '@/components/dashboard/dashboard-styles'
import { SidePanel } from '@/components/ui/side-panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  useEmergency,
  useEmergencyAvailableTechnicians,
  useReassignEmergency,
} from '@/features/emergencies/hooks/useEmergencies'
import { formatDateTime, formatWindowEnd, initialsOf } from '@/features/emergencies/lib/format'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface EmergencyDetailPanelProps {
  emergencyId: string | null
  onClose: () => void
}

/**
 * Emergency detail + reassignment — `GET /emergencies/:id` and
 * `GET /emergencies/:id/available-technicians` in parallel, then `POST /emergencies/:id/reassign`.
 */
export function EmergencyDetailPanel({ emergencyId, onClose }: EmergencyDetailPanelProps) {
  const { detail, actions, toasts } = emergenciesContent
  const { showToast } = useToast()
  const id = emergencyId ?? ''
  const emergencyQuery = useEmergency(id)
  const techniciansQuery = useEmergencyAvailableTechnicians(id)
  const reassign = useReassignEmergency()
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedTechnicianId(null)
    setError(null)
  }, [emergencyId])

  if (!emergencyId) return null

  const emergency = emergencyQuery.data
  const isResolved = emergency?.status === 'RESOLVED'
  // AVAILABLE first — busy technicians stay selectable but are visually deprioritised.
  const technicians = [...(techniciansQuery.data ?? [])].sort((a, b) => {
    if (a.availability === b.availability) return a.jobsRemaining - b.jobsRemaining
    return a.availability === 'AVAILABLE' ? -1 : 1
  })

  async function handleConfirm() {
    if (!emergency || reassign.isPending) return
    if (!selectedTechnicianId) {
      setError(detail.selectRequired)
      return
    }
    setError(null)
    try {
      const updated = await reassign.mutateAsync({ id: emergency.id, newTechnicianId: selectedTechnicianId })
      showToast(toasts.reassigned(updated.assignedTechnicianName ?? '', updated.roundName))
      onClose()
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 409) return showToast(toasts.alreadyResolved, { tone: 'error' })
        if (caught.status === 404) return showToast(toasts.notFound, { tone: 'error' })
        if (caught.status === 400) return setError(caught.message)
      }
      showToast(toasts.genericError, { tone: 'error' })
    }
  }

  return (
    <SidePanel
      open
      panelKey={emergencyId}
      onClose={onClose}
      title={emergency?.roundName ?? detail.title}
      subtitle={emergency ? `${emergency.technicianName} · ${formatDateTime(emergency.reportedAt)}` : undefined}
      titleBadge={
        emergency ? (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              isResolved ? 'bg-success/10 text-success' : 'bg-warning-surface text-warning',
            )}
          >
            {emergencyStatusLabels[emergency.status]}
          </span>
        ) : undefined
      }
      widthClass="max-w-md"
      bodyClassName="space-y-5"
      footer={
        isResolved ? undefined : (
          <div className="space-y-2">
            {error ? <p className="text-xs text-danger">{error}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface"
              >
                {actions.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={reassign.isPending || !emergency}
                className={cn(dashboardCtaClass, 'w-full justify-center disabled:cursor-not-allowed disabled:opacity-50')}
              >
                {reassign.isPending ? actions.confirming : actions.confirm}
              </button>
            </div>
          </div>
        )
      }
    >
      {emergencyQuery.isLoading || !emergency ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label={detail.fields.technician} value={emergency.technicianName} />
            <Field label={detail.fields.round} value={emergency.roundName} />
            <Field label={detail.fields.remainingStops} value={String(emergency.remainingStops)} strong />
            <Field label={detail.fields.lastLocation} value={emergency.lastLocation || '—'} />
            <Field label={detail.fields.windowEnd} value={formatWindowEnd(emergency.scheduledWindowEnd)} />
            <Field label={detail.fields.reportedAt} value={formatDateTime(emergency.reportedAt)} />
            {isResolved ? (
              <>
                <Field label={detail.fields.assignedTo} value={emergency.assignedTechnicianName ?? '—'} strong />
                <Field label={detail.fields.resolvedAt} value={formatDateTime(emergency.resolvedAt)} />
              </>
            ) : null}
          </dl>

          <section className="rounded-xl border border-border bg-surface/60 px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{detail.fields.notes}</p>
            <p className={cn('mt-1.5 text-sm', emergency.notes ? 'text-foreground' : 'text-muted')}>
              {emergency.notes || detail.fields.noNotes}
            </p>
          </section>

          {isResolved ? (
            <p className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
              <DashboardIcon name="check-circle" className="h-4 w-4 shrink-0" />
              {detail.alreadyResolved}
            </p>
          ) : (
            <section>
              <h3 className="text-sm font-semibold text-foreground">{detail.replacementTitle}</h3>
              <p className="mt-1 text-xs text-muted">{detail.replacementHint}</p>

              {techniciansQuery.isLoading ? (
                <div className="mt-3 space-y-2" aria-label={detail.loadingTechnicians}>
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              ) : technicians.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
                  {detail.noTechnicians}
                </p>
              ) : (
                <ul className="mt-3 space-y-2" role="radiogroup" aria-label={detail.replacementTitle}>
                  {technicians.map((technician) => (
                    <TechnicianOption
                      key={technician.technicianId}
                      technician={technician}
                      selected={selectedTechnicianId === technician.technicianId}
                      onSelect={() => {
                        setSelectedTechnicianId(technician.technicianId)
                        setError(null)
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </SidePanel>
  )
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-foreground', strong ? 'text-base font-semibold' : 'font-medium')}>{value}</dd>
    </div>
  )
}

function TechnicianOption({
  technician,
  selected,
  onSelect,
}: {
  technician: EmergencyAvailableTechnician
  selected: boolean
  onSelect: () => void
}) {
  const { detail } = emergenciesContent
  const available = technician.availability === 'AVAILABLE'

  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
          selected
            ? 'border-primary bg-accent-surface ring-1 ring-primary/30'
            : 'border-border bg-card hover:bg-surface',
          !available && !selected && 'opacity-70',
        )}
      >
        {technician.avatarUrl ? (
          <img src={technician.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initialsOf(technician.technicianName)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{technician.technicianName}</span>
          <span className="block text-xs text-muted">{detail.jobsRemaining(technician.jobsRemaining)}</span>
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            available ? 'bg-success/10 text-success' : 'bg-surface text-muted',
          )}
        >
          {emergencyAvailabilityLabels[technician.availability]}
        </span>
        {selected ? <DashboardIcon name="check" className="h-4 w-4 shrink-0 text-primary" /> : null}
      </button>
    </li>
  )
}
