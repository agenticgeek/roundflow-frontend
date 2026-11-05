import { Select } from '@/components/ui'
import { setupWizardContent } from '@/content/setup-wizard'
import type { ReminderFormValues } from '@/features/settings/lib/business-rules'
import { cn } from '@/lib/utils'

interface ReminderChecklistProps {
  values: ReminderFormValues
  onChange: (patch: Partial<ReminderFormValues>) => void
  disabled?: boolean
  ariaLabel: string
  /** Extra classes for the time pickers (Settings tints its selects). */
  selectClassName?: string
}

/**
 * BUG-01: the pre-clean reminders as checkboxes — "The evening before" and "The morning of" can
 * both be on, each with its own time (disabled while unticked); "Don't send reminders" is
 * exclusive: ticking it clears both, ticking either reminder clears it.
 */
export function ReminderChecklist({ values, onChange, disabled = false, ariaLabel, selectClassName }: ReminderChecklistProps) {
  const content = setupWizardContent.roundSettings
  const noReminders = !values.eveningReminderEnabled && !values.morningReminderEnabled
  const evening = content.reminderOptions.find((option) => option.id === 'evening-before')
  const morning = content.reminderOptions.find((option) => option.id === 'morning-of')
  const none = content.reminderOptions.find((option) => option.id === 'none')

  const rows = [
    {
      key: 'evening',
      option: evening,
      checked: values.eveningReminderEnabled,
      time: values.eveningReminderTime,
      times: content.eveningReminderTimes,
      toggle: (checked: boolean) => onChange({ eveningReminderEnabled: checked }),
      setTime: (time: string) => onChange({ eveningReminderTime: time }),
    },
    {
      key: 'morning',
      option: morning,
      checked: values.morningReminderEnabled,
      time: values.morningReminderTime,
      times: content.morningReminderTimes,
      toggle: (checked: boolean) => onChange({ morningReminderEnabled: checked }),
      setTime: (time: string) => onChange({ morningReminderTime: time }),
    },
  ]

  return (
    <div role="group" aria-label={ariaLabel} className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.key}
          className={cn(
            'flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors duration-150 sm:px-5',
            row.checked ? 'border-primary bg-primary/5' : 'border-border bg-card',
          )}
        >
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
            <input
              type="checkbox"
              checked={row.checked}
              disabled={disabled}
              onChange={(event) => row.toggle(event.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-border accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground sm:text-[15px]">{row.option?.label}</span>
              {row.option?.description ? (
                <span className="mt-0.5 block text-sm text-muted">{row.option.description}</span>
              ) : null}
            </span>
          </label>
          <Select
            aria-label={`${row.option?.label} — ${content.fields.reminderTime.label}`}
            value={row.time}
            onChange={(event) => row.setTime(event.target.value)}
            options={row.times}
            disabled={disabled || !row.checked}
            inputSize="sm"
            className={cn('w-32 shrink-0', selectClassName)}
          />
        </div>
      ))}
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl border px-4 py-3.5 sm:px-5',
          noReminders ? 'border-primary bg-primary/5' : 'border-border bg-card',
        )}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
          <input
            type="checkbox"
            checked={noReminders}
            disabled={disabled}
            onChange={(event) => {
              // Exclusive: ticking it turns both reminders off; unticking restores the evening default.
              if (event.target.checked) onChange({ eveningReminderEnabled: false, morningReminderEnabled: false })
              else onChange({ eveningReminderEnabled: true })
            }}
            className="h-4 w-4 shrink-0 rounded border-border accent-primary"
          />
          <span className="text-sm font-medium text-foreground sm:text-[15px]">{none?.label}</span>
        </label>
      </div>
    </div>
  )
}
