import { useEffect, useState } from 'react'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Textarea } from '@/components/ui'
import {
  Modal,
  ModalButton,
  ModalFooter,
  modalInfoPanelClass,
  modalInputClass,
  modalWarningPanelClass,
  ModalToggleRow,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import {
  useMoveOccurrence,
  useMoveOccurrencePreview,
  type MoveDateTarget,
} from '@/features/rounds/hooks/useMoveOccurrence'
import {
  defaultMoveDate,
  moveDateBlock,
  type MoveDateBlock,
  type MoveOccurrencePreview,
} from '@/features/rounds/lib/move-occurrence'
import { addDays, formatLongDate, parseIsoDate, startOfWeek, todayIsoDate } from '@/features/rounds/lib/planner'
import { ApiError, errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const copy = roundPlannerContent.moveDateModal

interface MoveRoundDateModalProps {
  /** The round date being moved; null keeps the dialog closed. */
  target: MoveDateTarget | null
  onClose: () => void
}

/**
 * Moves every property on one round date to another day (POST /rounds/:id/move-occurrence). The preview gives the
 * window the date can move within and the dates that are closed; picking a date asks the server to check it, and
 * confirm stays off until that check passes.
 */
export function MoveRoundDateModal({ target, onClose }: MoveRoundDateModalProps) {
  const { showToast } = useToast()
  const today = todayIsoDate()
  const open = target !== null
  const roundId = target?.roundId ?? ''
  const fromDate = target?.date ?? ''

  const [picked, setPicked] = useState<string | null>(null)
  const [notifyCustomers, setNotifyCustomers] = useState(true)
  const [message, setMessage] = useState('')
  /** A 409 from the move itself (something changed since the check): shown until another date is picked. */
  const [moveConflict, setMoveConflict] = useState<string | null>(null)

  useEffect(() => {
    setPicked(null)
    setNotifyCustomers(true)
    setMessage('')
    setMoveConflict(null)
  }, [roundId, fromDate])

  const preview = useMoveOccurrencePreview(roundId, fromDate, undefined, open)
  const movePreview = preview.data
  const toDate = picked ?? (movePreview ? defaultMoveDate(movePreview, today) : null)
  const checkQuery = useMoveOccurrencePreview(roundId, fromDate, toDate ?? undefined, open && Boolean(toDate))
  const move = useMoveOccurrence()

  if (!target) return null

  const check = checkQuery.data?.check ?? null
  const warning =
    moveConflict ??
    (checkQuery.isError ? errorMessage(checkQuery.error) : check && !check.ok ? (check.message ?? copy.checkFailed) : null)
  const canConfirm = Boolean(movePreview && toDate && check?.ok && !moveConflict && !move.isPending)

  function pick(date: string) {
    setPicked(date)
    setMoveConflict(null)
  }

  async function handleConfirm() {
    if (!target || !toDate || !canConfirm) return
    const trimmed = message.trim()
    try {
      const result = await move.mutateAsync({
        roundId: target.roundId,
        input: {
          fromDate: target.date,
          toDate,
          notifyCustomers,
          ...(notifyCustomers && trimmed ? { message: trimmed } : {}),
        },
      })
      const count = result.movedVisits + result.createdVisits
      showToast(
        (count === 1 ? copy.successToastOne : copy.successToast)
          .replace('{count}', String(count))
          .replace('{date}', formatLongDate(result.toDate)),
        result.customerNotificationError
          ? { description: copy.notifyFailed.replace('{error}', result.customerNotificationError), tone: 'error', durationMs: 8000 }
          : undefined,
      )
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setMoveConflict(error.message)
        return
      }
      showToast(error instanceof Error ? errorMessage(error) : copy.failed, { tone: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle.replace('{round}', target.roundName).replace('{date}', formatLongDate(target.date))}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact variant="secondary" onClick={onClose}>
            {copy.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" disabled={!canConfirm} onClick={() => void handleConfirm()}>
            {move.isPending ? copy.moving : copy.confirm}
          </ModalButton>
        </ModalFooter>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-full bg-accent-surface text-accent">
        <DashboardIcon name="calendar" className="h-5 w-5" />
      </span>

      {preview.isError ? (
        <p role="alert" className={modalWarningPanelClass}>
          {errorMessage(preview.error)}
        </p>
      ) : !movePreview ? (
        <p className="text-sm text-muted">{copy.loading}</p>
      ) : (
        <>
          <div className={modalInfoPanelClass}>
            <p className="text-sm font-semibold text-foreground">
              {movePreview.propertyCount === 1
                ? copy.propertyCountOne
                : copy.propertyCount.replace('{count}', String(movePreview.propertyCount))}
            </p>
            {movePreview.kind === 'FORECAST' ? <p className="mt-1 text-xs text-muted">{copy.forecastNote}</p> : null}
          </div>

          <section className="space-y-2">
            <p className="text-xs text-muted">
              {copy.windowHint
                .replace('{earliest}', formatLongDate(movePreview.earliestDate < today ? today : movePreview.earliestDate))
                .replace('{latest}', formatLongDate(movePreview.latestDate))}
            </p>
            <MoveDatePicker key={`${roundId}:${fromDate}`} preview={movePreview} today={today} selected={toDate} onPick={pick} />
            {toDate ? (
              <p className="text-sm font-medium text-foreground">
                {copy.selected.replace('{date}', formatLongDate(toDate))}
              </p>
            ) : (
              <p className={modalWarningPanelClass}>{copy.noDateAvailable}</p>
            )}
            <UnavailableDates preview={movePreview} today={today} />
          </section>

          {warning ? (
            <div role="alert" className={cn(modalWarningPanelClass, 'flex gap-3')}>
              <DashboardIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>{warning}</p>
            </div>
          ) : toDate && checkQuery.isFetching ? (
            <p className="text-xs text-muted">{copy.checking}</p>
          ) : null}

          <section className="space-y-3 border-t border-border pt-4">
            <ModalToggleRow
              compact
              label={copy.notifyCustomers}
              description={copy.notifyHint}
              checked={notifyCustomers}
              onChange={setNotifyCustomers}
              ariaLabel={copy.notifyCustomers}
            />
            {notifyCustomers ? (
              <Field label={copy.messageLabel} size="sm" labelWeight="medium">
                <Textarea
                  inputSize="sm"
                  value={message}
                  placeholder={copy.messagePlaceholder}
                  onChange={(event) => setMessage(event.target.value)}
                  className={modalInputClass}
                />
              </Field>
            ) : null}
          </section>
        </>
      )}
    </Modal>
  )
}

function blockText(block: MoveDateBlock): string {
  switch (block.kind) {
    case 'PAST':
      return copy.reasons.past
    case 'OUTSIDE_WINDOW':
      return copy.reasons.outsideWindow
    case 'CURRENT':
      return copy.reasons.current
    case 'CLOSURE':
      return copy.reasons.closure.replace('{label}', block.label)
    case 'CLOSED_DAY':
      return copy.reasons.closedDay
  }
}

const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** 'YYYY-MM' of the month after (or before) `month`. */
function shiftMonth(month: string, by: number): string {
  const date = parseIsoDate(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + by)
  return date.toISOString().slice(0, 7)
}

/** Month grid; every date that can't be the new date is disabled and names its reason. */
function MoveDatePicker({
  preview,
  today,
  selected,
  onPick,
}: {
  preview: MoveOccurrencePreview
  today: string
  selected: string | null
  onPick: (date: string) => void
}) {
  const firstMonth = (preview.earliestDate < today ? today : preview.earliestDate).slice(0, 7)
  const lastMonth = preview.latestDate.slice(0, 7)
  const [shown, setShown] = useState<string | null>(null)
  const month = shown ?? (selected ?? firstMonth).slice(0, 7)

  const weeks: string[][] = []
  for (let start = startOfWeek(`${month}-01`); start.slice(0, 7) <= month; start = addDays(start, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)))
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={copy.previousMonth}
          disabled={month <= firstMonth}
          onClick={() => setShown(shiftMonth(month, -1))}
          className="rounded-md p-1 text-foreground hover:bg-accent-surface disabled:opacity-30"
        >
          <DashboardIcon name="chevron-left" className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{monthLabel.format(parseIsoDate(`${month}-01`))}</p>
        <button
          type="button"
          aria-label={copy.nextMonth}
          disabled={month >= lastMonth}
          onClick={() => setShown(shiftMonth(month, 1))}
          className="rounded-md p-1 text-foreground hover:bg-accent-surface disabled:opacity-30"
        >
          <DashboardIcon name="chevron-right" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="text-[10px] font-semibold text-muted">
            {weekday}
          </span>
        ))}
        {weeks.flat().map((date) => {
          if (date.slice(0, 7) !== month) return <span key={date} aria-hidden="true" />
          const block = moveDateBlock(date, preview, today)
          const reason = block ? blockText(block) : null
          const isSelected = date === selected
          return (
            <button
              key={date}
              type="button"
              disabled={Boolean(block)}
              aria-pressed={isSelected}
              aria-label={reason ? `${formatLongDate(date)}, ${reason}` : formatLongDate(date)}
              title={reason ?? undefined}
              onClick={() => onPick(date)}
              className={cn(
                'rounded-md py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent-surface',
                block && 'cursor-not-allowed text-muted line-through opacity-50 hover:bg-transparent',
                block?.kind === 'CURRENT' && 'no-underline ring-1 ring-border',
              )}
            >
              {Number(date.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The window's closed days and closures, so their reasons are readable without hovering a date. */
function UnavailableDates({ preview, today }: { preview: MoveOccurrencePreview; today: string }) {
  const listed = preview.blockedDates
    .filter((item) => item.date >= today && item.date >= preview.earliestDate && item.date <= preview.latestDate)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (listed.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold text-foreground">{copy.unavailableTitle}</p>
      <ul aria-label={copy.unavailableTitle} className="mt-1 space-y-0.5 text-xs text-muted">
        {listed.map((item) => (
          <li key={item.date}>
            {formatLongDate(item.date)}: {blockText({ kind: item.reason, label: item.label })}
          </li>
        ))}
      </ul>
    </div>
  )
}
