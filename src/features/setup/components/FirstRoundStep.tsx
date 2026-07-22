import type { FormEvent } from 'react'
import { useState } from 'react'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input, Select } from '@/components/ui'
import type { FirstRoundFormValues } from '@/features/setup/lib/mappers'

interface FirstRoundStepProps {
  initialValues: FirstRoundFormValues
  serviceAreaOptions: readonly { value: string; label: string }[]
  onSubmit: (values: FirstRoundFormValues) => void
}

function FirstRoundIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

const DAY_OPTIONS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
] as const

const FREQUENCY_OPTIONS = [
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'FOUR_WEEKLY', label: 'Four weekly' },
  { value: 'SIX_WEEKLY', label: 'Six weekly' },
  { value: 'EIGHT_WEEKLY', label: 'Eight weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const

export function FirstRoundStep({
  initialValues,
  serviceAreaOptions,
  onSubmit,
}: FirstRoundStepProps) {
  const { assignRound } = setupWizardContent
  const [values, setValues] = useState<FirstRoundFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!values.name.trim()) {
      setError('Round name is required.')
      return
    }

    onSubmit(values)
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <FirstRoundIcon />
        <div>
          <h2 className="text-xl font-semibold text-foreground">Assign Round</h2>
          <p className="mt-1 text-sm text-muted">
            Create your first active round. You can add more rounds later in Round Planner.
          </p>
        </div>
      </div>

      <Field label="Round name" required labelWeight="medium">
        <Input
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="e.g. Alnwick Monday"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Default day" labelWeight="medium">
          <Select
            value={values.defaultDay}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, defaultDay: event.target.value }))
            }
            options={[...DAY_OPTIONS]}
          />
        </Field>

        <Field label="Frequency" labelWeight="medium">
          <Select
            value={values.frequency}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, frequency: event.target.value }))
            }
            options={[...FREQUENCY_OPTIONS]}
          />
        </Field>
      </div>

      <Field label="Service area" labelWeight="medium">
        <Select
          value={values.serviceAreaId}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, serviceAreaId: event.target.value }))
          }
          options={[
            { value: '', label: 'Select a service area' },
            ...serviceAreaOptions,
          ]}
        />
      </Field>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-sm text-muted">{assignRound.subheading}</p>
    </form>
  )
}
