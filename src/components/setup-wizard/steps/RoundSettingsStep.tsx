import type { FormEvent } from 'react'
import { useState } from 'react'
import type { RoundSettingsData } from '@/types/setup-wizard'
import { setupWizardContent } from '@/content/setup-wizard'
import { MultiToggleButtons } from '@/components/setup-wizard/MultiToggleButtons'
import { SegmentCardGroup } from '@/components/setup-wizard/SegmentCardGroup'
import { Select, Toggle } from '@/components/ui'

interface RoundSettingsStepProps {
  initialValues: RoundSettingsData
  onSubmit: (values: RoundSettingsData) => void
}

function RoundSettingsIcon() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 10h18M7 15h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function SelectField({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string }[]
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-muted">{description}</p>
      <Select
        className="mt-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={[...options]}
      />
    </div>
  )
}

export function RoundSettingsStep({ initialValues, onSubmit }: RoundSettingsStepProps) {
  const { roundSettings } = setupWizardContent
  const { fields } = roundSettings

  const [values, setValues] = useState<RoundSettingsData>(initialValues)

  function updateField<K extends keyof RoundSettingsData>(key: K, value: RoundSettingsData[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <form id="setup-wizard-step-form" onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="flex items-start gap-4 border-b border-border pb-5">
        <RoundSettingsIcon />
        <div>
          <h2 className="text-xl font-semibold text-foreground">{roundSettings.heading}</h2>
          <p className="mt-1 text-sm text-muted">{roundSettings.subheading}</p>
        </div>
      </div>

      <div>
        <span className="mb-2.5 block text-sm font-medium text-foreground">
          {fields.recurringCycle.label}
        </span>
        <SegmentCardGroup
          ariaLabel={fields.recurringCycle.label}
          options={roundSettings.recurringCycles}
          value={values.recurringCycle}
          onChange={(recurringCycle) => updateField('recurringCycle', recurringCycle)}
        />
      </div>

      <div>
        <span className="mb-2.5 block text-sm font-medium text-foreground">
          {fields.cleanMethods.label}
        </span>
        <MultiToggleButtons
          ariaLabel={fields.cleanMethods.label}
          options={roundSettings.cleanMethods}
          value={values.cleanMethods}
          onChange={(cleanMethods) => updateField('cleanMethods', cleanMethods)}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{fields.autoGenerateVisits.label}</p>
          <p className="mt-0.5 text-sm text-muted">{fields.autoGenerateVisits.description}</p>
        </div>
        <Toggle
          checked={values.autoGenerateVisits}
          onChange={(autoGenerateVisits) => updateField('autoGenerateVisits', autoGenerateVisits)}
          ariaLabel={fields.autoGenerateVisits.label}
        />
      </div>

      <SelectField
        label={fields.reminderTiming.label}
        description={fields.reminderTiming.description}
        value={values.reminderTiming}
        onChange={(reminderTiming) => updateField('reminderTiming', reminderTiming)}
        options={roundSettings.reminderTimings}
      />

      <SelectField
        label={fields.reminderTimeOfDay.label}
        description={fields.reminderTimeOfDay.description}
        value={values.reminderTimeOfDay}
        onChange={(reminderTimeOfDay) => updateField('reminderTimeOfDay', reminderTimeOfDay)}
        options={roundSettings.reminderTimesOfDay}
      />
    </form>
  )
}
