import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RoundListItem } from '@/api/rounds.api'
import type { TechnicianListItem } from '@/api/technicians.api'
import { ROUTES } from '@/config/routes'
import { quickAssignContent as copy } from '@/content/round-planner'
import { Modal, ModalButton, ModalFooter } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { PendingInviteResend } from '@/components/round-planner/PendingInviteResend'
import { useSetRoundTechnicians } from '@/features/rounds/hooks/useRounds'
import { isPendingInvite } from '@/features/rounds/lib/assign'
import { errorMessage } from '@/lib/errors'
import { formatShortDate } from '@/features/rounds/lib/planner'
import { useTechniciansList } from '@/features/technicians/hooks/useTechnicians'
import { cn, fillCopy } from '@/lib/utils'

export interface QuickAssignTarget {
  round: Pick<RoundListItem, 'id' | 'name' | 'serviceAreaId' | 'serviceAreaName'>
  date: string
  stopCount: number
}

function initialsOf(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/**
 * Picks technicians for one round straight from a calendar card — the same
 * `PUT /rounds/:id/technicians` the Assign technicians page saves with. Technicians who
 * cover the round's service area are listed first.
 */
export function AssignRoundTechnicianModal({
  target,
  onClose,
}: {
  target: QuickAssignTarget | null
  onClose: () => void
}) {
  const { showToast } = useToast()
  const techniciansQuery = useTechniciansList()
  const setTechnicians = useSetRoundTechnicians()
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fresh picks each time the modal opens for a round.
  useEffect(() => {
    setSelected([])
    setError(null)
  }, [target?.round.id, target?.date])

  const areaId = target?.round.serviceAreaId ?? null
  const technicians = useMemo(() => {
    const covers = (technician: TechnicianListItem) =>
      Boolean(areaId) && technician.serviceAreas.some((area) => area.serviceAreaId === areaId)
    return (techniciansQuery.data ?? [])
      .filter((technician) => technician.appStatus !== 'INACTIVE')
      .map((technician) => ({ technician, covers: covers(technician) }))
      .sort(
        (a, b) =>
          Number(b.covers) - Number(a.covers) ||
          (a.technician.name ?? '').localeCompare(b.technician.name ?? ''),
      )
  }, [areaId, techniciansQuery.data])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  async function save() {
    if (!target || selected.length === 0) return
    setError(null)
    try {
      await setTechnicians.mutateAsync({ id: target.round.id, input: { technicianIds: selected } })
      const firstName =
        technicians.find(({ technician }) => technician.id === selected[0])?.technician.name ?? ''
      showToast(
        selected.length === 1
          ? fillCopy(copy.toast, { name: firstName, round: target.round.name })
          : fillCopy(copy.toastMany, { count: selected.length, round: target.round.name }),
      )
      onClose()
    } catch (caught) {
      // The server says why (e.g. a pending invite) — keep the modal open with it.
      setError(errorMessage(caught))
    }
  }

  const saving = setTechnicians.isPending

  return (
    <Modal
      open={Boolean(target)}
      onClose={saving ? () => {} : onClose}
      title={copy.title}
      subtitle={
        target
          ? fillCopy(copy.subtitle, {
              round: target.round.name,
              date: formatShortDate(target.date),
              stops: target.stopCount,
            })
          : undefined
      }
      showCloseButton
      stacked
      maxWidthClass="max-w-md"
      footer={
        <ModalFooter compact>
          <ModalButton compact onClick={onClose} disabled={saving}>
            {copy.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            loading={saving}
            disabled={selected.length === 0}
            onClick={() => void save()}
          >
            {selected.length > 1 ? fillCopy(copy.saveMany, { count: selected.length }) : copy.save}
          </ModalButton>
        </ModalFooter>
      }
    >
      <div className="space-y-3 py-1">
        <div>
          <p className="text-sm font-semibold text-foreground">{copy.pick}</p>
          <p className="mt-0.5 text-xs text-muted">{copy.hint}</p>
        </div>

        {techniciansQuery.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : techniciansQuery.isError ? (
          <p className="text-sm text-danger">{copy.loadError}</p>
        ) : technicians.length === 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border px-4 py-5 text-center">
            <p className="text-sm text-muted">{copy.noTechnicians}</p>
            <Link to={ROUTES.technicians} className="text-sm font-semibold text-primary hover:underline">
              {copy.addTechnicians}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2" role="group" aria-label={copy.pick}>
            {technicians.map(({ technician, covers }) => {
              const checked = selected.includes(technician.id)
              const roundCount = technician.roundNames?.length
              const pending = isPendingInvite(technician)
              return (
                <li key={technician.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(technician.id)}
                    disabled={saving || pending}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
                      checked
                        ? 'border-primary bg-accent-surface'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-surface',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                        checked ? 'bg-primary text-primary-foreground' : 'bg-accent-surface text-primary',
                      )}
                      aria-hidden="true"
                    >
                      {initialsOf(technician.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {technician.name ?? '—'}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                        {covers && target?.round.serviceAreaName ? (
                          <span className="font-medium text-success">
                            {fillCopy(copy.covers, { area: target.round.serviceAreaName })}
                          </span>
                        ) : null}
                        {roundCount !== undefined ? (
                          <span>{roundCount === 1 ? copy.roundsOne : fillCopy(copy.rounds, { count: roundCount })}</span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                      )}
                      aria-hidden="true"
                    >
                      {checked ? (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-3 w-3">
                          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </span>
                  </button>
                  {pending ? <PendingInviteResend technician={technician} className="mt-1 px-3" /> : null}
                </li>
              )
            })}
          </ul>
        )}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
