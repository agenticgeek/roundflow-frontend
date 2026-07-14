import { useEffect, useState } from 'react'
import type { PropertyDetailRecord } from '@/content/property-detail'
import { propertyDetailContent } from '@/content/property-detail'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import {
  Modal,
  ModalButton,
  modalInputClass,
  modalWarningPanelClass,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface PauseServiceModalProps {
  open: boolean
  property: PropertyDetailRecord | null
  onClose: () => void
}

type PauseDuration = 'range' | 'indefinite'

function applyMessageTemplate(template: string, property: PropertyDetailRecord) {
  return template.replace('{customer}', property.customerName)
}

/** Pause an active service — opened from property detail header. */
export function PauseServiceModal({ open, property, onClose }: PauseServiceModalProps) {
  const { pauseServiceModal, pauseServiceToast } = propertyDetailContent
  const { showToast } = useToast()
  const [reason, setReason] = useState<string>(pauseServiceModal.reasons[0]?.value ?? '')
  const [duration, setDuration] = useState<PauseDuration>('range')
  const [startDate, setStartDate] = useState<string>(pauseServiceModal.defaultStartDate)
  const [resumeDate, setResumeDate] = useState<string>(pauseServiceModal.defaultResumeDate)
  const [notifySms, setNotifySms] = useState(true)
  const [smsMessage, setSmsMessage] = useState('')

  useEffect(() => {
    if (!open || !property) return
    setReason(pauseServiceModal.reasons[0]?.value ?? '')
    setDuration('range')
    setStartDate(pauseServiceModal.defaultStartDate)
    setResumeDate(pauseServiceModal.defaultResumeDate)
    setNotifySms(true)
    setSmsMessage(applyMessageTemplate(pauseServiceModal.defaultSmsMessage, property))
  }, [open, pauseServiceModal, property])

  if (!property) return null

  const subtitle = pauseServiceModal.subtitle.replace('{customer}', property.customerName)
  const smsMeta = pauseServiceModal.smsMeta.replace('{count}', String(smsMessage.length))

  function handlePause() {
    onClose()
    showToast(pauseServiceToast.title, { description: pauseServiceToast.description })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pauseServiceModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-xl"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {pauseServiceModal.actions.cancel}
          </ModalButton>
          <ModalButton compact variant="primary" className="w-full gap-2" onClick={handlePause}>
            <DashboardIcon name="pause" className="h-4 w-4" />
            {pauseServiceModal.actions.pause}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-warning-surface text-warning">
        <DashboardIcon name="pause" className="h-5 w-5" />
      </span>

      <Field label={pauseServiceModal.fields.reason} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={[...pauseServiceModal.reasons]}
          className={cn(modalInputClass, 'rounded-lg border-accent/25 bg-accent-surface')}
        />
      </Field>

      <section>
        <p className="text-sm font-medium text-foreground">{pauseServiceModal.fields.duration}</p>
        <div className="mt-2 space-y-2">
          {pauseServiceModal.durationOptions.map((option) => {
            const selected = duration === option.id

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setDuration(option.id as PauseDuration)}
                className={cn(
                  'flex w-full gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                  selected
                    ? 'border-primary bg-accent-surface ring-1 ring-primary/20'
                    : 'border-border bg-card hover:bg-surface',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary' : 'border-border bg-card',
                  )}
                  aria-hidden="true"
                >
                  {selected ? <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> : null}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {duration === 'range' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={pauseServiceModal.fields.startDate} size="sm" labelWeight="medium">
            <div className="relative">
              <DashboardIcon
                name="calendar"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <Input
                inputSize="sm"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={cn(modalInputClass, 'rounded-lg bg-card pl-9')}
              />
            </div>
          </Field>
          <Field label={pauseServiceModal.fields.resumeDate} size="sm" labelWeight="medium">
            <div className="relative">
              <DashboardIcon
                name="calendar"
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <Input
                inputSize="sm"
                value={resumeDate}
                onChange={(event) => setResumeDate(event.target.value)}
                className={cn(modalInputClass, 'rounded-lg bg-card pl-9')}
              />
            </div>
          </Field>
        </div>
      ) : null}

      <section className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={notifySms}
            onChange={(event) => setNotifySms(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              {pauseServiceModal.fields.notifySms}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {pauseServiceModal.fields.notifySmsDescription}
            </span>
          </span>
        </label>

        {notifySms ? (
          <div>
            <Textarea
              inputSize="sm"
              value={smsMessage}
              onChange={(event) => setSmsMessage(event.target.value)}
              rows={4}
              className={cn(modalInputClass, 'min-h-24 rounded-lg bg-card')}
            />
            <p className="mt-2 text-xs text-muted">{smsMeta}</p>
          </div>
        ) : null}
      </section>

      <div className={cn(modalWarningPanelClass, 'flex gap-3')}>
        <DashboardIcon name="alert-circle" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <p className="font-semibold text-warning-foreground">{pauseServiceModal.warning.title}</p>
          <p className="mt-0.5 text-sm text-warning-foreground/90">{pauseServiceModal.warning.description}</p>
        </div>
      </div>
    </Modal>
  )
}
