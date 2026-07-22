import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { ActivateSystemData, GenerateVisitsMode } from '@/types/setup-wizard'
import type { SelectOption } from '@/content/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Field, Input, Select, Toggle } from '@/components/ui'
import { SetupStepHeader } from '@/components/setup-wizard/SetupStepHeader'
import { cn } from '@/lib/utils'

interface ActivateSystemStepProps {
  initialValues: ActivateSystemData
  roundOptions: SelectOption[]
  alreadyGenerated?: boolean
  visitsGenerated?: number
  onSubmit: (values: ActivateSystemData) => void
}

function ActivateSystemIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function VisitsToggleRow({
  label,
  description,
  checked,
  onChange,
  ariaLabel,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
  badge?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {label}
          {badge ? <span className="ml-1 font-normal text-muted">{badge}</span> : null}
        </p>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} ariaLabel={ariaLabel} />
    </div>
  )
}

export function ActivateSystemStep({
  initialValues,
  roundOptions,
  alreadyGenerated = false,
  visitsGenerated = 0,
  onSubmit,
}: ActivateSystemStepProps) {
  const { activateSystem } = setupWizardContent
  const { sections, options, fields, readyDescription, actions, cycleOptions } = activateSystem

  const [values, setValues] = useState<ActivateSystemData>(initialValues)

  useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  function setGenerateVisitsMode(mode: GenerateVisitsMode) {
    setValues((prev) => ({
      ...prev,
      generateVisitsMode: mode,
      roundIds: mode === 'all' ? [] : prev.roundIds,
    }))
  }

  function toggleRound(roundId: string) {
    setValues((prev) => {
      const selected = prev.roundIds.includes(roundId)
      return {
        ...prev,
        roundIds: selected
          ? prev.roundIds.filter((id) => id !== roundId)
          : [...prev.roundIds, roundId],
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <SetupStepHeader
        icon={<ActivateSystemIcon />}
        title={activateSystem.heading}
        subtitle={activateSystem.subheading}
      />

      {alreadyGenerated ? (
        <p className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-foreground">
          {visitsGenerated} visit{visitsGenerated === 1 ? '' : 's'} already generated. You can
          continue, or generate another cycle below.
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">{sections.generateVisits}</h3>
        <div className="space-y-1 rounded-xl border border-border p-4">
          <VisitsToggleRow
            label={options.allRounds.label}
            description={options.allRounds.description}
            badge={options.allRounds.recommended}
            checked={values.generateVisitsMode === 'all'}
            onChange={(checked) => {
              if (checked) setGenerateVisitsMode('all')
            }}
            ariaLabel={options.allRounds.label}
          />
          <div className="border-t border-border" />
          <VisitsToggleRow
            label={options.selectedRounds.label}
            description={options.selectedRounds.description}
            checked={values.generateVisitsMode === 'selected'}
            onChange={(checked) => {
              if (checked) setGenerateVisitsMode('selected')
            }}
            ariaLabel={options.selectedRounds.label}
          />
        </div>

        {values.generateVisitsMode === 'selected' ? (
          <ul className="space-y-2 rounded-xl border border-border p-4">
            {roundOptions.map((round) => {
              const checked = values.roundIds.includes(round.value)
              return (
                <li key={round.value}>
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRound(round.value)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                    />
                    {round.label}
                  </label>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">{sections.startDateCycle}</h3>
        <Field label={fields.firstCycleStartDate.label} labelWeight="medium" size="sm">
          <Input
            inputSize="sm"
            type="date"
            value={values.startDate}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, startDate: event.target.value }))
            }
            placeholder={fields.firstCycleStartDate.placeholder}
          />
        </Field>
        <Field label={fields.frequencyCycle.label} labelWeight="medium" size="sm">
          <Select
            inputSize="sm"
            value={String(values.cycleWeeks)}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                cycleWeeks: Number(event.target.value) || prev.cycleWeeks,
              }))
            }
            options={[...cycleOptions]}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{sections.readyToActivate}</h3>
          <p className="mt-1 max-w-md text-sm text-muted">{readyDescription}</p>
        </div>
        <button
          type="submit"
          className={cn(
            'shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground',
            'transition-all duration-200 hover:opacity-90 active:scale-[0.98]',
          )}
        >
          {actions.activate}
        </button>
      </section>
    </form>
  )
}
