import { useEffect, useState } from 'react'
import type { RoundPlannerRound, RoundPlannerWeatherHoldOption } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Select } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface WeatherHoldModalProps {
  open: boolean
  round: RoundPlannerRound | null
  dateLabel?: string
  onClose: () => void
}

/** Weather hold workflow for postponing a round from the round detail drawer. */
export function WeatherHoldModal({ open, round, dateLabel, onClose }: WeatherHoldModalProps) {
  const { weatherHoldModal } = roundPlannerContent
  const { showToast } = useToast()
  const [condition, setCondition] = useState(weatherHoldModal.conditions[0]?.value ?? '')
  const [reschedulingId, setReschedulingId] = useState(
    weatherHoldModal.reschedulingOptions[0]?.id ?? '',
  )
  const [notifyCustomers, setNotifyCustomers] = useState(false)

  useEffect(() => {
    if (!open) return
    setCondition(weatherHoldModal.conditions[0]?.value ?? '')
    setReschedulingId(weatherHoldModal.reschedulingOptions[0]?.id ?? '')
    setNotifyCustomers(false)
  }, [open, weatherHoldModal.conditions, weatherHoldModal.reschedulingOptions])

  if (!round) return null

  function handleApply() {
    onClose()
    showToast(weatherHoldModal.successToast)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={weatherHoldModal.title}
      subtitle={weatherHoldModal.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {weatherHoldModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="flex w-full items-center justify-center gap-2"
            onClick={handleApply}
          >
            <DashboardIcon name="cloud" className="h-4 w-4" />
            {weatherHoldModal.actions.apply}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-warning-surface text-warning">
        <DashboardIcon name="cloud" className="h-5 w-5" />
      </span>

      <section>
        <p className="text-sm font-semibold text-foreground">{weatherHoldModal.fields.round}</p>
        <div className="mt-2 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{round.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {formatRoundDate(dateLabel)} · {round.properties.length} properties
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-accent">
              {weatherHoldModal.statusLabel}
            </span>
          </div>
        </div>
      </section>

      <section>
        <label
          htmlFor="weather-condition"
          className="text-sm font-semibold text-foreground"
        >
          {weatherHoldModal.fields.weatherCondition}
        </label>
        <Select
          id="weather-condition"
          inputSize="sm"
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
          options={[...weatherHoldModal.conditions]}
          className="mt-2 border-accent/20 bg-accent-surface"
        />
      </section>

      <section>
        <p className="text-sm font-semibold text-foreground">
          {weatherHoldModal.fields.rescheduling}
        </p>
        <div className="mt-2 space-y-2">
          {weatherHoldModal.reschedulingOptions.map((option) => (
            <ReschedulingOption
              key={option.id}
              option={option}
              selected={reschedulingId === option.id}
              onSelect={() => setReschedulingId(option.id)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setNotifyCustomers((current) => !current)}
          className="flex w-full items-start gap-3 text-left"
        >
          <span
            className={cn(
              'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border',
              notifyCustomers ? 'border-primary bg-primary' : 'border-muted bg-muted/40',
            )}
            aria-hidden="true"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              {weatherHoldModal.fields.notifyCustomers}
            </span>
            <span className="mt-1 block text-xs text-muted">
              Send SMS about weather delay and rescheduling
            </span>
          </span>
        </button>

        <div className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
          {weatherHoldModal.messagePreview}
        </div>
        <p className="mt-2 text-xs text-muted">{weatherHoldModal.messageMeta}</p>
      </section>

      <div className="flex gap-3 rounded-xl border border-warning-border bg-warning-surface px-4 py-3">
        <DashboardIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-semibold text-warning">
            {round.properties.length} {weatherHoldModal.affectedJobsLabel}
          </p>
          <p className="mt-0.5 text-warning-foreground">
            {weatherHoldModal.affectedJobsDescription}
          </p>
        </div>
      </div>
    </Modal>
  )
}

function ReschedulingOption({
  option,
  selected,
  onSelect,
}: {
  option: RoundPlannerWeatherHoldOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-accent-surface ring-1 ring-primary'
          : 'border-border bg-background hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'mt-1 h-3.5 w-3.5 shrink-0 rounded-full',
          selected ? 'bg-primary' : 'bg-muted/50',
        )}
        aria-hidden="true"
      />
      <span>
        <span className="block text-sm font-semibold text-foreground">{option.title}</span>
        <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
      </span>
    </button>
  )
}

function formatRoundDate(dateLabel?: string) {
  if (!dateLabel) return 'May 20, 2026'
  if (/2026/.test(dateLabel)) return dateLabel
  return `${dateLabel}, 2026`
}
