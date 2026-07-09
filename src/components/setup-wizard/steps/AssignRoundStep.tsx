import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import type { AssignedAreaRound, AssignRoundData, LinkedRound } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, FieldError, Input, Select } from '@/components/ui'

interface AssignRoundStepProps {
  initialValues: AssignRoundData
  onSubmit: (values: AssignRoundData) => void
}

interface AddRoundForm {
  areaName: string
  postcodeSector: string
  roundDay: string
}

const emptyForm = (): AddRoundForm => ({
  areaName: '',
  postcodeSector: '',
  roundDay: '',
})

function AssignRoundIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function assignmentKey(areaName: string, postcodeSector: string): string {
  return `${areaName.trim().toLowerCase()}::${postcodeSector.trim().toUpperCase()}`
}

export function AssignRoundStep({ initialValues, onSubmit }: AssignRoundStepProps) {
  const { assignRound } = setupWizardContent
  const { fields, actions, labels, roundDays, validation } = assignRound

  const [assignments, setAssignments] = useState<AssignedAreaRound[]>(initialValues.assignments)
  const [form, setForm] = useState<AddRoundForm>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const dayLabels = useMemo(
    () => Object.fromEntries(roundDays.filter((day) => day.value).map((day) => [day.value, day.label])),
    [roundDays],
  )

  function getRoundLabel(areaName: string, day: string): string {
    return `${areaName} ${dayLabels[day] ?? day}`
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ assignments })
  }

  function addRound() {
    const areaName = form.areaName.trim()
    const postcodeSector = form.postcodeSector.trim().toUpperCase()
    const roundDay = form.roundDay

    if (!areaName) {
      setFormError(validation.areaNameRequired)
      return
    }
    if (!postcodeSector) {
      setFormError(validation.postcodeRequired)
      return
    }
    if (!roundDay) {
      setFormError(validation.roundDayRequired)
      return
    }

    const key = assignmentKey(areaName, postcodeSector)
    const existing = assignments.find(
      (assignment) => assignmentKey(assignment.areaName, assignment.postcodeSector) === key,
    )

    if (existing?.linkedRounds.some((round) => round.day === roundDay)) {
      setFormError(validation.duplicateRound)
      return
    }

    const newRound: LinkedRound = { id: `lr-${Date.now()}`, day: roundDay }

    if (existing) {
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === existing.id
            ? { ...assignment, linkedRounds: [...assignment.linkedRounds, newRound] }
            : assignment,
        ),
      )
    } else {
      setAssignments((prev) => [
        ...prev,
        {
          id: `assign-${Date.now()}`,
          areaName,
          postcodeSector,
          notes: '',
          linkedRounds: [newRound],
        },
      ])
    }

    setForm((prev) => ({ ...prev, roundDay: '' }))
    setFormError(null)
  }

  function deleteAssignment(id: string) {
    setAssignments((prev) => prev.filter((assignment) => assignment.id !== id))
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex items-start gap-4 border-b border-border pb-5">
        <AssignRoundIcon />
        <div>
          <h2 className="text-lg font-medium text-foreground sm:text-xl">{assignRound.heading}</h2>
          <p className="mt-1 text-sm text-muted">{assignRound.subheading}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label={fields.areaName.label} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
            value={form.areaName}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, areaName: event.target.value }))
              if (formError) setFormError(null)
            }}
            placeholder={fields.areaName.placeholder}
          />
        </Field>

        <Field label={fields.postcodeSector.label} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
            value={form.postcodeSector}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, postcodeSector: event.target.value }))
              if (formError) setFormError(null)
            }}
            placeholder={fields.postcodeSector.placeholder}
          />
        </Field>

        <Field label={fields.roundDay.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={form.roundDay}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, roundDay: event.target.value }))
              if (formError) setFormError(null)
            }}
            options={[...roundDays]}
          />
        </Field>

        {formError ? <FieldError message={formError} size="sm" /> : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={addRound}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            {actions.addRound}
          </button>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {assignments.map((assignment) => (
          <li
            key={assignment.id}
            className="rounded-lg border border-border bg-background p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">{assignment.areaName}</h3>
              <button
                type="button"
                onClick={() => deleteAssignment(assignment.id)}
                aria-label={actions.delete}
                className="-mt-0.5 -mr-0.5 shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface hover:text-danger"
              >
                <TrashIcon />
              </button>
            </div>

            <div className="mt-1.5">
              <span className="rounded border border-border bg-surface px-1.5 py-px text-[10px] font-medium tracking-wide text-muted uppercase">
                {assignment.postcodeSector}
              </span>
            </div>

            {assignment.notes ? (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{assignment.notes}</p>
            ) : null}

            {assignment.linkedRounds.length > 0 ? (
              <div className="mt-3 border-t border-border pt-2.5">
                <p className="text-[11px] text-muted">{labels.linkedRounds}</p>
                <ul className="mt-1 space-y-0.5">
                  {assignment.linkedRounds.map((round) => (
                    <li key={round.id} className="text-xs font-medium text-primary">
                      {getRoundLabel(assignment.areaName, round.day)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </form>
  )
}
