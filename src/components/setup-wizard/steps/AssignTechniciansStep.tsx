import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { AssignTechniciansData, Technician, WizardRound } from '@/types/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { formatRoundName, getInitials } from '@/lib/setup-wizard-options'
import { Select } from '@/components/ui'
import { MetricCard } from '@/components/ui/metric-card'
import { SetupStepHeader } from '@/components/setup-wizard/SetupStepHeader'
import { RoundDetailsModal } from '@/components/setup-wizard/RoundDetailsModal'
import { cn } from '@/lib/utils'

interface AssignTechniciansStepProps {
  initialValues: AssignTechniciansData
  technicians: Technician[]
  roundDays: readonly SelectOption[]
  onSubmit: (values: AssignTechniciansData) => void
}

const UNASSIGNED_VALUE = ''

function AssignTechniciansIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 6.012 3.354 7.785.83.799 1.654 1.38 2.274 1.765.311.193.57.337.757.433a5.741 5.741 0 0 0 .28.14l.019.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a1 1 0 1 1-2 0V5H6v11a1 1 0 1 1-2 0V4Zm3 2a1 1 0 0 0 0 2h.01a1 1 0 1 0 0-2H7Zm3 0a1 1 0 0 0 0 2h3a1 1 0 1 0 0-2h-3Zm-3 4a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H7Zm3 0a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.48 6.48 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.946 0 .844.844 0 0 1-.277.71A6.298 6.298 0 0 1 10 18a6.298 6.298 0 0 1-4.696-1.81Z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5.75Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function AssignmentStatusBadge({ assigned }: { assigned: boolean }) {
  const { status } = setupWizardContent.assignTechnicians

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        assigned ? 'bg-success/10 text-success' : 'bg-warning-surface text-warning',
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', assigned ? 'bg-success' : 'bg-warning')}
        aria-hidden="true"
      />
      {assigned ? status.assigned : status.missing}
    </span>
  )
}

export function AssignTechniciansStep({
  initialValues,
  technicians,
  roundDays,
  onSubmit,
}: AssignTechniciansStepProps) {
  const { assignTechnicians } = setupWizardContent
  const { summary, sections, columns, actions } = assignTechnicians

  const [rounds, setRounds] = useState<WizardRound[]>(initialValues.rounds)
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null)

  useEffect(() => {
    setRounds(initialValues.rounds)
  }, [initialValues.rounds])

  const dayLabels = useMemo(
    () => Object.fromEntries(roundDays.filter((day) => day.value).map((day) => [day.value, day.label])),
    [roundDays],
  )

  const technicianById = useMemo(
    () => Object.fromEntries(technicians.map((technician) => [technician.id, technician])),
    [technicians],
  )

  const technicianOptions = useMemo(
    () => [
      { value: UNASSIGNED_VALUE, label: actions.unassigned },
      ...technicians.map((technician) => ({
        value: technician.id,
        label: technician.fullName,
      })),
    ],
    [actions.unassigned, technicians],
  )

  const unassignedCount = rounds.filter((round) => !round.technicianId).length
  const maxWorkload = Math.max(1, ...technicians.map((technician) =>
    rounds.filter((round) => round.technicianId === technician.id).length,
  ))

  const editingRound = editingRoundId ? rounds.find((round) => round.id === editingRoundId) ?? null : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ rounds })
  }

  function updateRoundTechnician(roundId: string, technicianId: string) {
    setRounds((prev) =>
      prev.map((round) => (round.id === roundId ? { ...round, technicianId } : round)),
    )
  }

  return (
    <>
      <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <SetupStepHeader
          icon={<AssignTechniciansIcon />}
          title={assignTechnicians.heading}
          subtitle={assignTechnicians.subheading}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label={summary.totalRounds} value={rounds.length} icon={<BuildingIcon />} />
          <MetricCard label={summary.technicians} value={technicians.length} icon={<UsersIcon />} />
          <MetricCard
            label={summary.unassigned}
            value={unassignedCount}
            icon={<AlertIcon />}
            variant="warning"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">{sections.roundAssignments}</h3>
          </div>

          <div className="hidden grid-cols-[1.4fr_1fr_0.6fr_1.4fr_0.9fr_4rem] gap-4 border-b border-border bg-surface px-4 py-2.5 text-xs font-medium tracking-wide text-muted uppercase lg:grid">
            <span>{columns.round}</span>
            <span>{columns.area}</span>
            <span>{columns.properties}</span>
            <span>{columns.assignedTechnician}</span>
            <span>{columns.status}</span>
            <span>{columns.actions}</span>
          </div>

          <ul className="divide-y divide-border">
            {rounds.map((round) => {
              const assigned = Boolean(round.technicianId)
              const technicianName = assigned
                ? (technicianById[round.technicianId]?.fullName ?? actions.unassigned)
                : actions.unassigned

              return (
                <li
                  key={round.id}
                  className="grid gap-3 px-4 py-3 lg:grid-cols-[1.4fr_1fr_0.6fr_1.4fr_0.9fr_4rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {round.name ?? formatRoundName(round.areaName, round.day, roundDays)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{dayLabels[round.day] ?? round.day}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    <MapPinIcon />
                    <span>{round.areaName}</span>
                  </div>

                  <p className="text-sm text-foreground">{round.propertyCount}</p>

                  <div className="min-w-0">
                    <Select
                      inputSize="sm"
                      value={round.technicianId}
                      onChange={(event) => updateRoundTechnician(round.id, event.target.value)}
                      options={technicianOptions}
                      className={cn(
                        !assigned && 'border-warning-border bg-warning-surface text-warning-foreground',
                      )}
                      aria-label={`${columns.assignedTechnician}: ${technicianName}`}
                    />
                  </div>

                  <div>
                    <AssignmentStatusBadge assigned={assigned} />
                  </div>

                  <div className="flex lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingRoundId(round.id)}
                      className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {actions.edit}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{sections.technicianWorkload}</h3>
          <ul className="mt-4 space-y-3">
            {technicians.map((technician) => {
              const count = rounds.filter((round) => round.technicianId === technician.id).length
              const width = `${Math.round((count / maxWorkload) * 100)}%`

              return (
                <li key={technician.id} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(technician.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-foreground">{technician.fullName}</p>
                      <p className="shrink-0 text-xs text-muted">
                        {count} {actions.roundsSuffix}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </form>

      <RoundDetailsModal
        open={Boolean(editingRound)}
        onClose={() => setEditingRoundId(null)}
        round={editingRound}
        technicians={technicians}
        roundDays={roundDays}
        onSave={updateRoundTechnician}
      />
    </>
  )
}
