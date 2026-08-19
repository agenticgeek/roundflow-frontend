import { useEffect, useState } from 'react'
import type { TodaysWorkRound } from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import {
  Modal,
  ModalButton,
  ModalFooter,
  modalInputClass,
  modalWarningPanelClass,
  ModalToggleRow,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface PushMissedJobsModalProps {
  open: boolean
  round: TodaysWorkRound | null
  onClose: () => void
}

function countMissedJobs(round: TodaysWorkRound) {
  return Math.max(0, round.progressTotal - round.progressCompleted)
}

function smsCredits(message: string) {
  if (!message.trim()) return 0
  return Math.max(1, Math.ceil(message.length / 160))
}

/** Push unfinished jobs to a new date — opened from Today's Work detail panel. */
export function PushMissedJobsModal({ open, round, onClose }: PushMissedJobsModalProps) {
  const { pushMissedJobsModal } = todaysWorkContent
  const { showToast } = useToast()
  const [newDate, setNewDate] = useState<string>(pushMissedJobsModal.defaults.newDate)
  const [reason, setReason] = useState<string>(pushMissedJobsModal.defaults.reason)
  const [assignTechnician, setAssignTechnician] = useState<string>(
    pushMissedJobsModal.defaults.assignTechnician,
  )
  const [notifyCustomers, setNotifyCustomers] = useState(false)
  const [message, setMessage] = useState<string>(pushMissedJobsModal.defaults.message)
  const [activeQuickSelect, setActiveQuickSelect] = useState<string | null>(null)

  const missedJobsCount = round ? countMissedJobs(round) : 0
  const jobsLabel = pushMissedJobsModal.missedJobs.jobsLabel.replace(
    '{count}',
    String(missedJobsCount),
  )
  const characterCount = message.length
  const credits = notifyCustomers ? smsCredits(message) * missedJobsCount : 0
  const messageMeta = pushMissedJobsModal.messageMeta
    .replace('{characters}', String(characterCount))
    .replace('{credits}', String(credits))
  const recipientsMeta = pushMissedJobsModal.recipientsMeta.replace(
    '{count}',
    String(missedJobsCount),
  )

  useEffect(() => {
    if (!open) return
    setNewDate(pushMissedJobsModal.defaults.newDate)
    setReason(pushMissedJobsModal.defaults.reason)
    setAssignTechnician(pushMissedJobsModal.defaults.assignTechnician)
    setNotifyCustomers(false)
    setMessage(pushMissedJobsModal.defaults.message)
    setActiveQuickSelect(null)
  }, [open, pushMissedJobsModal.defaults])

  if (!round) return null

  function handleQuickSelect(id: string, date: string) {
    setActiveQuickSelect(id)
    setNewDate(date)
  }

  function handleConfirm() {
    onClose()
    showToast(pushMissedJobsModal.successToast)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pushMissedJobsModal.title}
      subtitle={pushMissedJobsModal.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      className={cn('max-h-[min(92dvh,48rem)]', notifyCustomers && 'max-h-[min(92dvh,52rem)]')}
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact variant="secondary" onClick={onClose}>
            {pushMissedJobsModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" onClick={handleConfirm}>
            {pushMissedJobsModal.actions.confirm}
          </ModalButton>
        </ModalFooter>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-warning-surface text-warning">
        <DashboardIcon name="chevron-right" className="h-5 w-5" />
      </span>

      <Field label={pushMissedJobsModal.fields.round} size="sm" labelWeight="medium">
        <Input
          inputSize="sm"
          readOnly
          value={round.round}
          className={cn(modalInputClass, 'bg-surface text-foreground')}
        />
      </Field>

      <div className={modalWarningPanelClass}>
        <p className="text-sm font-semibold text-warning-foreground">
          {pushMissedJobsModal.missedJobs.title}
        </p>
        <p className="mt-1 text-2xl font-semibold text-warning-foreground">{jobsLabel}</p>
        <p className="mt-0.5 text-xs text-warning-foreground/80">
          {pushMissedJobsModal.missedJobs.description}
        </p>
      </div>

      <Field label={pushMissedJobsModal.fields.newDate} size="sm" labelWeight="medium">
        <div className="relative">
          <DashboardIcon
            name="calendar"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-accent"
          />
          <Input
            inputSize="sm"
            type="text"
            value={newDate}
            onChange={(event) => {
              setActiveQuickSelect(null)
              setNewDate(event.target.value)
            }}
            className={cn(modalInputClass, 'border-accent/25 bg-accent-surface pl-9')}
          />
        </div>
      </Field>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{pushMissedJobsModal.fields.quickSelect}</p>
        <div className="flex flex-wrap gap-2">
          {pushMissedJobsModal.quickSelectOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleQuickSelect(option.id, option.date)}
              className={cn(
                'rounded-none border px-3 py-1.5 text-xs font-semibold transition-colors',
                activeQuickSelect === option.id
                  ? 'border-primary bg-accent-surface text-primary'
                  : 'border-border bg-accent-surface text-foreground hover:bg-accent-surface/80',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <Field label={pushMissedJobsModal.fields.reason} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={[...pushMissedJobsModal.reasons]}
          className={modalInputClass}
        />
      </Field>

      <Field label={pushMissedJobsModal.fields.assignTechnician} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={assignTechnician}
          onChange={(event) => setAssignTechnician(event.target.value)}
          options={[...pushMissedJobsModal.technicianOptions]}
          className={modalInputClass}
        />
      </Field>

      <ModalToggleRow
        compact
        label={pushMissedJobsModal.fields.notifyCustomers}
        description=""
        checked={notifyCustomers}
        onChange={setNotifyCustomers}
        ariaLabel={pushMissedJobsModal.fields.notifyCustomers}
      />

      {notifyCustomers ? (
        <section className="animate-fade-in space-y-2">
          <Field label={pushMissedJobsModal.fields.messagePreview} size="sm" labelWeight="medium">
            <Textarea
              inputSize="sm"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className={cn(modalInputClass, 'min-h-[6rem] border-accent/25 bg-accent-surface')}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{messageMeta}</span>
            <span>{recipientsMeta}</span>
          </div>
        </section>
      ) : null}

      <div className="flex gap-3 rounded-none border border-warning-border bg-warning-surface px-4 py-3">
        <DashboardIcon name="alert-circle" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-sm text-warning-foreground">{pushMissedJobsModal.warning}</p>
      </div>
    </Modal>
  )
}
