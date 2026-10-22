import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import type { ReminderSchedule, RoundSettingsData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { Select, Toggle } from '@/components/ui'
import { useReportWizardDirty } from '@/features/setup/lib/wizard-dirty'
import { cn } from '@/lib/utils'

interface RoundSettingsStepProps {
  initialValues: RoundSettingsData
  onSubmit: (values: RoundSettingsData) => void
}

function RoundSettingsIcon() {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

/** White card grouping one setting. */
function SettingsSection({
  heading,
  description,
  children,
}: {
  heading: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">{heading}</h3>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

/** Single-select segmented control — grey track, the chosen option raised in white. */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-xl bg-foreground/[0.045] p-1 sm:auto-cols-fr sm:grid-flow-col"
    >
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm transition-all duration-150 sm:text-[15px]',
              active
                ? 'bg-card font-medium text-primary shadow-sm'
                : 'text-foreground hover:bg-card/60',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function RoundSettingsStep({ initialValues, onSubmit }: RoundSettingsStepProps) {
  const { roundSettings } = setupWizardContent
  const { fields, sections } = roundSettings

  const [values, setValues] = useState<RoundSettingsData>(initialValues)
  useReportWizardDirty(values, initialValues)

  function updateField<K extends keyof RoundSettingsData>(key: K, value: RoundSettingsData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(values)
  }

  /** Time picker for a reminder option — `null` for "Don't send reminders". */
  function reminderTimeSelect(schedule: ReminderSchedule) {
    if (schedule === 'none') return null
    const key = schedule === 'evening-before' ? 'eveningReminderTime' : 'morningReminderTime'
    const options =
      schedule === 'evening-before'
        ? roundSettings.eveningReminderTimes
        : roundSettings.morningReminderTimes
    return (
      <Select
        aria-label={fields.reminderTime.label}
        value={values[key]}
        onChange={(event) => {
          updateField(key, event.target.value)
          // Picking a time implies that's the reminder they want.
          updateField('reminderSchedule', schedule)
        }}
        options={options}
        inputSize="sm"
        className="w-32 shrink-0"
      />
    )
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex items-start gap-4">
        <RoundSettingsIcon />
        <div className="pt-0.5">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{roundSettings.heading}</h2>
          <p className="mt-1 text-sm text-muted sm:text-base">{roundSettings.subheading}</p>
        </div>
      </div>

      <SettingsSection heading={sections.frequency.heading} description={sections.frequency.description}>
        <SegmentedControl
          ariaLabel={sections.frequency.heading}
          options={roundSettings.frequencyOptions}
          value={values.recurringCycle}
          onChange={(recurringCycle) => updateField('recurringCycle', recurringCycle)}
        />
      </SettingsSection>

      <SettingsSection heading={sections.cleanMethod.heading}>
        <SegmentedControl
          ariaLabel={sections.cleanMethod.heading}
          options={roundSettings.cleanMethods}
          value={values.cleanMethod}
          onChange={(cleanMethod) => updateField('cleanMethod', cleanMethod)}
        />
      </SettingsSection>

      <SettingsSection heading={sections.reminder.heading} description={sections.reminder.description}>
        <div role="radiogroup" aria-label={sections.reminder.heading} className="space-y-3">
          {roundSettings.reminderOptions.map((option) => {
            const active = values.reminderSchedule === option.id
            return (
              <div
                key={option.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors duration-150 sm:px-5',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-surface',
                )}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateField('reminderSchedule', option.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      active ? 'border-primary' : 'border-muted/50',
                    )}
                  >
                    {active ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground sm:text-[15px]">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-0.5 block text-sm text-muted">{option.description}</span>
                    ) : null}
                  </span>
                </button>
                {reminderTimeSelect(option.id)}
              </div>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection heading={sections.keepGoing.heading}>
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-foreground sm:text-[15px]">{fields.autoGenerateVisits.label}</p>
            <p className="mt-0.5 text-sm text-muted">{fields.autoGenerateVisits.description}</p>
          </div>
          <Toggle
            checked={values.autoGenerateVisits}
            onChange={(autoGenerateVisits) => updateField('autoGenerateVisits', autoGenerateVisits)}
            ariaLabel={fields.autoGenerateVisits.label}
          />
        </div>
      </SettingsSection>
    </form>
  )
}
