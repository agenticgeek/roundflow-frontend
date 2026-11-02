import { useEffect, useState } from 'react'
import type { RoundPlannerWeatherHoldOption } from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import type { WeatherCondition, WeatherHoldResult, WeatherRescheduling } from '@/api/rounds.api'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Select } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { BroadcastResultPanel } from '@/components/messages/BroadcastResultPanel'
import { useApplyWeatherHold, useWeatherHoldPreview } from '@/features/rounds/hooks/useRounds'
import { formatLongDate } from '@/features/rounds/lib/planner'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

export interface PlannerRoundSummary {
  /** Real round id — required to message the round's recipients. */
  id: string
  name: string
  stopCount: number
  holdCount: number
}

interface WeatherHoldModalProps {
  open: boolean
  round: PlannerRoundSummary | null
  /** The round-day being held, YYYY-MM-DD. */
  date: string
  dateLabel?: string
  onClose: () => void
}

/**
 * Weather hold for one round-day (POST /rounds/:id/weather-hold): the scheduled visits are moved
 * or taken off the list and, optionally, the affected customers are messaged. The counts and the
 * customer message come from the preview endpoint, so what is shown is what will happen.
 */
export function WeatherHoldModal({ open, round, date, dateLabel, onClose }: WeatherHoldModalProps) {
  const { weatherHoldModal } = roundPlannerContent
  const { showToast } = useToast()
  const applyHold = useApplyWeatherHold()
  const [condition, setCondition] = useState<WeatherCondition>(weatherHoldModal.conditions[0].value)
  const [rescheduling, setRescheduling] = useState<WeatherRescheduling>(weatherHoldModal.reschedulingOptions[0].id)
  const [notifyCustomers, setNotifyCustomers] = useState(true)
  const [result, setResult] = useState<WeatherHoldResult | null>(null)

  const preview = useWeatherHoldPreview(round?.id ?? '', { date, condition, rescheduling }, open && !result)

  useEffect(() => {
    if (!open) return
    setCondition(weatherHoldModal.conditions[0].value)
    setRescheduling(weatherHoldModal.reschedulingOptions[0].id)
    setNotifyCustomers(true)
    setResult(null)
  }, [open, weatherHoldModal.conditions, weatherHoldModal.reschedulingOptions])

  if (!round) return null

  const affected = preview.data?.affectedVisits
  const nothingToHold = affected === 0

  async function handleApply() {
    if (!round || applyHold.isPending || !preview.data || nothingToHold) return
    try {
      const outcome = await applyHold.mutateAsync({
        roundId: round.id,
        input: { date, condition, rescheduling, notifyCustomers },
      })
      setResult(outcome)
      showToast(weatherHoldModal.successToast)
    } catch (error) {
      showToast(
        error instanceof ApiError && error.status === 409
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not apply the weather hold.',
      )
    }
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
        result ? (
          <ModalButton compact variant="primary" className="w-full" onClick={onClose}>
            {weatherHoldModal.actions.done}
          </ModalButton>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
              {weatherHoldModal.actions.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant="primary"
              className="flex w-full items-center justify-center gap-2"
              disabled={applyHold.isPending || !preview.data || nothingToHold}
              onClick={() => void handleApply()}
            >
              <DashboardIcon name="cloud" className="h-4 w-4" />
              {applyHold.isPending
                ? weatherHoldModal.actions.applying
                : notifyCustomers
                  ? weatherHoldModal.actions.applyNotify
                  : weatherHoldModal.actions.apply}
            </ModalButton>
          </div>
        )
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-warning-surface text-warning">
        <DashboardIcon name="cloud" className="h-5 w-5" />
      </span>

      <section>
        <p className="text-sm font-semibold text-foreground">{weatherHoldModal.fields.round}</p>
        <div className="mt-2 rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{round.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {dateLabel ? `${dateLabel} · ` : ''}
            {round.stopCount} stops
          </p>
        </div>
      </section>

      {result ? (
        <HoldResult result={result} />
      ) : (
        <>
          <section>
            <label htmlFor="weather-condition" className="text-sm font-semibold text-foreground">
              {weatherHoldModal.fields.weatherCondition}
            </label>
            <Select
              id="weather-condition"
              inputSize="sm"
              value={condition}
              onChange={(event) => setCondition(event.target.value as WeatherCondition)}
              options={[...weatherHoldModal.conditions]}
              className="mt-2 border-accent/20 bg-accent-surface"
            />
          </section>

          <section>
            <p className="text-sm font-semibold text-foreground">{weatherHoldModal.fields.rescheduling}</p>
            <div className="mt-2 space-y-2">
              {weatherHoldModal.reschedulingOptions.map((option) => (
                <ReschedulingOption
                  key={option.id}
                  option={option}
                  selected={rescheduling === option.id}
                  onSelect={() => setRescheduling(option.id)}
                />
              ))}
            </div>
            {preview.data ? (
              <p className="mt-2 text-xs text-muted">
                {preview.data.newDate
                  ? weatherHoldModal.newDate.replace('{date}', formatLongDate(preview.data.newDate))
                  : weatherHoldModal.newDateManual}
              </p>
            ) : null}
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
                <span className="mt-1 block text-xs text-muted">{weatherHoldModal.notifyHint}</span>
              </span>
            </button>

            {notifyCustomers ? (
              <>
                <div className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
                  {preview.isError
                    ? weatherHoldModal.previewError
                    : !preview.data
                      ? weatherHoldModal.previewLoading
                      : preview.data.message || weatherHoldModal.noMessage}
                </div>
                {preview.data?.message ? (
                  <p className="mt-2 text-xs text-muted">
                    {weatherHoldModal.messageMeta.replace('{count}', String(preview.data.characterCount))}
                  </p>
                ) : null}
                {preview.data && preview.data.optedOutCustomers > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    {weatherHoldModal.optedOut.replace('{count}', String(preview.data.optedOutCustomers))}
                  </p>
                ) : null}
              </>
            ) : null}
          </section>

          <div className="flex gap-3 rounded-xl border border-warning-border bg-warning-surface px-4 py-3">
            <DashboardIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-semibold text-warning">
                {affected === undefined ? '…' : affected}{' '}
                {affected === 1 ? weatherHoldModal.affectedJobsLabelOne : weatherHoldModal.affectedJobsLabel}
              </p>
              <p className="mt-0.5 text-warning-foreground">{weatherHoldModal.affectedJobsDescription}</p>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

/** What the hold actually did: visits held, the new date, and the per-recipient notification outcome. */
function HoldResult({ result }: { result: WeatherHoldResult }) {
  const { result: copy } = roundPlannerContent.weatherHoldModal

  return (
    <section aria-label="Weather hold result" className="space-y-3">
      <p className="rounded-xl border border-accent/20 bg-accent-surface px-4 py-3 text-sm font-medium text-accent">
        {result.held === 1 ? copy.heldOne : copy.held.replace('{count}', String(result.held))}
        {result.newDate ? copy.moved.replace('{date}', formatLongDate(result.newDate)) : copy.skipped}
      </p>
      {result.notification ? (
        <BroadcastResultPanel result={result.notification} notMessagedTitle={copy.notMessaged} />
      ) : result.notificationError ? (
        <p className="text-sm text-danger">{copy.notifyFailed.replace('{error}', result.notificationError)}</p>
      ) : (
        <p className="text-sm text-muted">{copy.notNotified}</p>
      )}
    </section>
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
