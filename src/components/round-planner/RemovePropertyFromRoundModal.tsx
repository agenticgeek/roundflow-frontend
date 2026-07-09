import { useEffect, useState, type ReactNode } from 'react'
import type {
  PauseDurationId,
  RemovePropertyOptionId,
  RoundPlannerListItem,
  RoundPlannerPauseDurationOption,
  RoundPlannerRemovePropertyOption,
} from '@/content/round-planner'
import { roundPlannerContent } from '@/content/round-planner'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import {
  Modal,
  ModalButton,
  modalInfoPanelClass,
  modalInputClass,
  modalWarningPanelClass,
  ModalToggleRow,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface RemovePropertyFromRoundModalProps {
  open: boolean
  item: RoundPlannerListItem | null
  onClose: () => void
}

/** Remove property from a recurring round — opened from the list tab actions column. */
export function RemovePropertyFromRoundModal({ open, item, onClose }: RemovePropertyFromRoundModalProps) {
  const { removePropertyModal, listView } = roundPlannerContent
  const { showToast } = useToast()
  const [optionId, setOptionId] = useState<RemovePropertyOptionId | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [notifyCustomer, setNotifyCustomer] = useState(false)
  const [visitDate, setVisitDate] = useState<string>(removePropertyModal.defaults.visitDate)
  const [technicianId, setTechnicianId] = useState(
    removePropertyModal.technicianOptions[0]?.value ?? 'james',
  )
  const [visitStatus, setVisitStatus] = useState<string>(removePropertyModal.defaults.visitStatus)
  const [visitPrice, setVisitPrice] = useState('')
  const [targetRoundId, setTargetRoundId] = useState('')
  const [notes, setNotes] = useState('')

  const [pauseReason, setPauseReason] = useState<string>(
    removePropertyModal.extension.pause.defaults.reason,
  )
  const [pauseDurationId, setPauseDurationId] = useState<PauseDurationId>(
    removePropertyModal.extension.pause.defaults.durationId,
  )
  const [pauseStartDate, setPauseStartDate] = useState<string>(
    removePropertyModal.extension.pause.defaults.startDate,
  )
  const [pauseResumeDate, setPauseResumeDate] = useState<string>(
    removePropertyModal.extension.pause.defaults.resumeDate,
  )
  const [notifyBySms, setNotifyBySms] = useState(true)

  function resetForm() {
    setOptionId(null)
    setShowDeleteConfirm(false)
    setNotifyCustomer(false)
    setVisitDate(removePropertyModal.defaults.visitDate)
    setTechnicianId(removePropertyModal.technicianOptions[0]?.value ?? 'james')
    setVisitStatus(removePropertyModal.defaults.visitStatus)
    setVisitPrice('')
    setTargetRoundId('')
    setNotes('')
    setPauseReason(removePropertyModal.extension.pause.defaults.reason)
    setPauseDurationId(removePropertyModal.extension.pause.defaults.durationId)
    setPauseStartDate(removePropertyModal.extension.pause.defaults.startDate)
    setPauseResumeDate(removePropertyModal.extension.pause.defaults.resumeDate)
    setNotifyBySms(true)
  }

  useEffect(() => {
    if (!open) return
    resetForm()
  }, [open])

  useEffect(() => {
    if (!item) return
    setVisitPrice(item.price)
  }, [item])

  function applyOptionDefaults(nextOptionId: RemovePropertyOptionId) {
    setOptionId(nextOptionId)

    if (nextOptionId === 'move-to-another-round') {
      setVisitDate(removePropertyModal.defaults.moveVisitDate)
      setVisitStatus(removePropertyModal.defaults.moveVisitStatus)
      setVisitPrice(item?.price ?? '£18')
      return
    }

    if (nextOptionId === 'remove-from-round-only') {
      setVisitDate(removePropertyModal.defaults.visitDate)
      setVisitStatus(removePropertyModal.defaults.visitStatus)
      setVisitPrice(item?.price ?? '')
      return
    }

    if (nextOptionId === 'pause-after-visit') {
      setPauseReason(removePropertyModal.extension.pause.defaults.reason)
      setPauseDurationId(removePropertyModal.extension.pause.defaults.durationId)
      setPauseStartDate(removePropertyModal.extension.pause.defaults.startDate)
      setPauseResumeDate(removePropertyModal.extension.pause.defaults.resumeDate)
      setNotifyBySms(true)
    }
  }

  if (!item) return null

  const statusLabel = listView.statusLabels[item.status]
  const selectedOption = removePropertyModal.options.find((option) => option.id === optionId)
  const modalTitle = optionId ? removePropertyModal.titles[optionId] : removePropertyModal.title
  const confirmLabel = optionId ? removePropertyModal.actions.confirm[optionId] : 'Confirm'
  const outcome = optionId ? removePropertyModal.summaryOutcomes[optionId] : ''
  const technicianLabel =
    removePropertyModal.technicianOptions.find((option) => option.value === technicianId)?.label ??
    item.technician

  function handleClose() {
    setShowDeleteConfirm(false)
    onClose()
  }

  function handleConfirm() {
    if (!optionId) return

    if (optionId === 'delete-recurring') {
      setShowDeleteConfirm(true)
      return
    }

    onClose()
    showToast(removePropertyModal.successToast)
  }

  function handleDeleteConfirm() {
    setShowDeleteConfirm(false)
    onClose()
    showToast(removePropertyModal.deleteSuccessToast)
  }

  return (
    <>
      <Modal
        open={open && !showDeleteConfirm}
        onClose={handleClose}
        title={modalTitle}
        showCloseButton
        stacked
        size="compact"
        maxWidthClass="max-w-lg"
        className={cn(optionId && 'max-h-[min(92dvh,48rem)]')}
        bodyClassName="space-y-4"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <ModalButton compact variant="secondary" className="w-full" onClick={handleClose}>
              {removePropertyModal.actions.cancel}
            </ModalButton>
            <ModalButton
              compact
              variant={optionId === 'delete-recurring' ? 'danger' : 'primary'}
              className="w-full"
              disabled={!optionId}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </ModalButton>
          </div>
        }
      >
        <section>
          <p className="mb-2 text-sm font-semibold text-foreground">
            {removePropertyModal.fields.propertyDetails}
          </p>
          <div className={modalInfoPanelClass}>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <InfoRow label={removePropertyModal.fields.customer} value={item.customer} />
              <InfoRow label={removePropertyModal.fields.address} value={item.address} />
              <InfoRow label={removePropertyModal.fields.currentRound} value={item.round} />
              <InfoRow label={removePropertyModal.fields.price} value={item.price} />
              <InfoRow label={removePropertyModal.fields.frequency} value={item.frequency} />
              <InfoRow label={removePropertyModal.fields.status} value={statusLabel} />
            </dl>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold text-foreground">
            {removePropertyModal.fields.recurringRemoval}
          </p>
          <div className="mt-3 space-y-2">
            {removePropertyModal.options.map((option) => (
              <RemovalOption
                key={option.id}
                option={option}
                selected={optionId === option.id}
                onSelect={() => applyOptionDefaults(option.id)}
              />
            ))}
          </div>
        </section>

        {optionId === 'remove-from-round-only' && selectedOption ? (
          <RemoveOnlyExtension
            optionTitle={selectedOption.title}
            item={item}
            visitDate={visitDate}
            technicianId={technicianId}
            visitStatus={visitStatus}
            visitPrice={visitPrice}
            notifyCustomer={notifyCustomer}
            outcome={outcome}
            technicianLabel={technicianLabel}
            onVisitDateChange={setVisitDate}
            onTechnicianChange={setTechnicianId}
            onVisitStatusChange={setVisitStatus}
            onVisitPriceChange={setVisitPrice}
            onNotifyCustomerChange={setNotifyCustomer}
          />
        ) : null}

        {optionId === 'move-to-another-round' && selectedOption ? (
          <MoveExtension
            optionTitle={selectedOption.title}
            item={item}
            visitDate={visitDate}
            technicianId={technicianId}
            visitStatus={visitStatus}
            visitPrice={visitPrice}
            targetRoundId={targetRoundId}
            notes={notes}
            notifyCustomer={notifyCustomer}
            outcome={outcome}
            technicianLabel={technicianLabel}
            onVisitDateChange={setVisitDate}
            onTechnicianChange={setTechnicianId}
            onVisitStatusChange={setVisitStatus}
            onVisitPriceChange={setVisitPrice}
            onTargetRoundChange={setTargetRoundId}
            onNotesChange={setNotes}
            onNotifyCustomerChange={setNotifyCustomer}
          />
        ) : null}

        {optionId === 'pause-after-visit' && selectedOption ? (
          <PauseExtension
            item={item}
            notifyCustomer={notifyCustomer}
            outcome={outcome}
            technicianLabel={technicianLabel}
            pauseReason={pauseReason}
            pauseDurationId={pauseDurationId}
            pauseStartDate={pauseStartDate}
            pauseResumeDate={pauseResumeDate}
            notifyBySms={notifyBySms}
            onNotifyCustomerChange={setNotifyCustomer}
            onPauseReasonChange={setPauseReason}
            onPauseDurationChange={setPauseDurationId}
            onPauseStartDateChange={setPauseStartDate}
            onPauseResumeDateChange={setPauseResumeDate}
            onNotifyBySmsChange={setNotifyBySms}
          />
        ) : null}

        {optionId === 'delete-recurring' ? (
          <DeleteExtension
            item={item}
            notifyCustomer={notifyCustomer}
            outcome={outcome}
            technicianLabel={technicianLabel}
            onNotifyCustomerChange={setNotifyCustomer}
          />
        ) : null}
      </Modal>

      <DeletePropertyConfirmModal
        open={open && showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

function DeletePropertyConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { deleteConfirmModal } = roundPlannerContent.removePropertyModal

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={deleteConfirmModal.title}
      showHeader={false}
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      bodyClassName="py-6"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onCancel}>
            {deleteConfirmModal.cancel}
          </ModalButton>
          <ModalButton compact variant="danger" className="w-full" onClick={onConfirm}>
            {deleteConfirmModal.confirm}
          </ModalButton>
        </div>
      }
    >
      <p className="text-center text-sm font-semibold leading-relaxed text-foreground">
        {deleteConfirmModal.message}
      </p>
    </Modal>
  )
}

function ExtensionShell({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-in space-y-4 border-t border-border pt-4">{children}</div>
  )
}

function SummaryPanel({
  item,
  visitDate,
  technicianLabel,
  outcome,
  roundLabel,
}: {
  item: RoundPlannerListItem
  visitDate?: string
  technicianLabel: string
  outcome: string
  roundLabel?: string
}) {
  const { removePropertyModal } = roundPlannerContent
  const dateLabel = visitDate ?? removePropertyModal.visitDateLabel

  return (
    <div className={cn('text-xs text-muted', modalInfoPanelClass)}>
      <p className="mb-1 text-sm font-semibold text-foreground">{removePropertyModal.fields.summary}</p>
      Visit: {dateLabel} · {technicianLabel} · Round: {roundLabel ?? item.round} · {outcome}
    </div>
  )
}

function RemoveOnlyExtension({
  optionTitle,
  item,
  visitDate,
  technicianId,
  visitStatus,
  visitPrice,
  notifyCustomer,
  outcome,
  technicianLabel,
  onVisitDateChange,
  onTechnicianChange,
  onVisitStatusChange,
  onVisitPriceChange,
  onNotifyCustomerChange,
}: {
  optionTitle: string
  item: RoundPlannerListItem
  visitDate: string
  technicianId: string
  visitStatus: string
  visitPrice: string
  notifyCustomer: boolean
  outcome: string
  technicianLabel: string
  onVisitDateChange: (value: string) => void
  onTechnicianChange: (value: string) => void
  onVisitStatusChange: (value: string) => void
  onVisitPriceChange: (value: string) => void
  onNotifyCustomerChange: (checked: boolean) => void
}) {
  const { removePropertyModal } = roundPlannerContent

  return (
    <ExtensionShell>
      <p className="text-sm font-semibold text-foreground">{optionTitle}</p>
      <div className={modalWarningPanelClass}>{removePropertyModal.warning}</div>
      <VisitCreationFields
        visitDate={visitDate}
        technicianId={technicianId}
        visitStatus={visitStatus}
        visitPrice={visitPrice}
        onVisitDateChange={onVisitDateChange}
        onTechnicianChange={onTechnicianChange}
        onVisitStatusChange={onVisitStatusChange}
        onVisitPriceChange={onVisitPriceChange}
      />
      <ModalToggleRow
        compact
        label={removePropertyModal.fields.notifyCustomer}
        description={removePropertyModal.fields.notifyCustomerDescription}
        checked={notifyCustomer}
        onChange={onNotifyCustomerChange}
        ariaLabel={removePropertyModal.fields.notifyCustomer}
      />
      <SummaryPanel
        item={item}
        visitDate={visitDate}
        technicianLabel={technicianLabel}
        outcome={outcome}
      />
    </ExtensionShell>
  )
}

function MoveExtension({
  optionTitle,
  item,
  visitDate,
  technicianId,
  visitStatus,
  visitPrice,
  targetRoundId,
  notes,
  notifyCustomer,
  outcome,
  technicianLabel,
  onVisitDateChange,
  onTechnicianChange,
  onVisitStatusChange,
  onVisitPriceChange,
  onTargetRoundChange,
  onNotesChange,
  onNotifyCustomerChange,
}: {
  optionTitle: string
  item: RoundPlannerListItem
  visitDate: string
  technicianId: string
  visitStatus: string
  visitPrice: string
  targetRoundId: string
  notes: string
  notifyCustomer: boolean
  outcome: string
  technicianLabel: string
  onVisitDateChange: (value: string) => void
  onTechnicianChange: (value: string) => void
  onVisitStatusChange: (value: string) => void
  onVisitPriceChange: (value: string) => void
  onTargetRoundChange: (value: string) => void
  onNotesChange: (value: string) => void
  onNotifyCustomerChange: (checked: boolean) => void
}) {
  const { removePropertyModal } = roundPlannerContent
  const { extension } = removePropertyModal
  const targetRoundLabel =
    removePropertyModal.targetRounds.find((round) => round.value === targetRoundId)?.label ?? item.round

  return (
    <ExtensionShell>
      <p className="text-sm font-semibold text-foreground">{optionTitle}</p>
      <div className={modalWarningPanelClass}>{removePropertyModal.warning}</div>
      <VisitCreationFields
        visitDate={visitDate}
        technicianId={technicianId}
        visitStatus={visitStatus}
        visitPrice={visitPrice}
        onVisitDateChange={onVisitDateChange}
        onTechnicianChange={onTechnicianChange}
        onVisitStatusChange={onVisitStatusChange}
        onVisitPriceChange={onVisitPriceChange}
      />
      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">{extension.assignRound.title}</p>
        <Field label={extension.assignRound.selectRound} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={targetRoundId}
            onChange={(event) => onTargetRoundChange(event.target.value)}
            options={[...removePropertyModal.targetRounds]}
            className={modalInputClass}
          />
        </Field>
      </section>
      <Field label={extension.notes.label} size="sm" labelWeight="medium">
        <Textarea
          inputSize="sm"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder={extension.notes.placeholder}
          className={modalInputClass}
        />
      </Field>
      <ModalToggleRow
        compact
        label={removePropertyModal.fields.notifyCustomer}
        description={removePropertyModal.fields.notifyCustomerDescription}
        checked={notifyCustomer}
        onChange={onNotifyCustomerChange}
        ariaLabel={removePropertyModal.fields.notifyCustomer}
      />
      <SummaryPanel
        item={item}
        visitDate={visitDate}
        technicianLabel={technicianLabel}
        outcome={outcome}
        roundLabel={targetRoundLabel}
      />
    </ExtensionShell>
  )
}

function PauseExtension({
  item,
  notifyCustomer,
  outcome,
  technicianLabel,
  pauseReason,
  pauseDurationId,
  pauseStartDate,
  pauseResumeDate,
  notifyBySms,
  onNotifyCustomerChange,
  onPauseReasonChange,
  onPauseDurationChange,
  onPauseStartDateChange,
  onPauseResumeDateChange,
  onNotifyBySmsChange,
}: {
  item: RoundPlannerListItem
  notifyCustomer: boolean
  outcome: string
  technicianLabel: string
  pauseReason: string
  pauseDurationId: PauseDurationId
  pauseStartDate: string
  pauseResumeDate: string
  notifyBySms: boolean
  onNotifyCustomerChange: (checked: boolean) => void
  onPauseReasonChange: (value: string) => void
  onPauseDurationChange: (value: PauseDurationId) => void
  onPauseStartDateChange: (value: string) => void
  onPauseResumeDateChange: (value: string) => void
  onNotifyBySmsChange: (checked: boolean) => void
}) {
  const { removePropertyModal } = roundPlannerContent
  const { pause } = removePropertyModal.extension
  const smsPreview = pause.smsPreview.replace('{customer_name}', item.customer.split(' ')[0] ?? item.customer)

  return (
    <ExtensionShell>
      <ModalToggleRow
        compact
        label={removePropertyModal.fields.notifyCustomer}
        description={removePropertyModal.fields.notifyCustomerDescription}
        checked={notifyCustomer}
        onChange={onNotifyCustomerChange}
        ariaLabel={removePropertyModal.fields.notifyCustomer}
      />
      <SummaryPanel item={item} technicianLabel={technicianLabel} outcome={outcome} />

      <Field label={pause.reasonForPause} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={pauseReason}
          onChange={(event) => onPauseReasonChange(event.target.value)}
          options={[...pause.reasons]}
          className={modalInputClass}
        />
      </Field>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{pause.pauseDuration}</p>
        {pause.durationOptions.map((option) => (
          <PauseDurationOption
            key={option.id}
            option={option}
            selected={pauseDurationId === option.id}
            onSelect={() => onPauseDurationChange(option.id)}
          />
        ))}
      </section>

      {pauseDurationId === 'date-range' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={pause.startDate} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              type="text"
              value={pauseStartDate}
              onChange={(event) => onPauseStartDateChange(event.target.value)}
              className={modalInputClass}
            />
          </Field>
          <Field label={pause.resumeDate} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              type="text"
              value={pauseResumeDate}
              onChange={(event) => onPauseResumeDateChange(event.target.value)}
              className={modalInputClass}
            />
          </Field>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onNotifyBySmsChange(!notifyBySms)}
        className="flex w-full items-start gap-3 text-left"
      >
        <span
          className={cn(
            'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border',
            notifyBySms ? 'border-primary bg-primary' : 'border-muted bg-muted/40',
          )}
          aria-hidden="true"
        />
        <span>
          <span className="block text-sm font-semibold text-foreground">{pause.notifyBySms}</span>
          <span className="mt-0.5 block text-xs text-muted">{pause.notifyBySmsDescription}</span>
        </span>
      </button>

      {notifyBySms ? (
        <div className="space-y-2">
          <div className="rounded-none border border-border bg-surface px-4 py-3 text-sm text-foreground">
            {smsPreview}
          </div>
          <p className="text-xs text-muted">{pause.smsMeta}</p>
        </div>
      ) : null}

      <div className="flex gap-3 rounded-none border border-warning-border bg-warning-surface px-4 py-3">
        <DashboardIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-semibold text-warning">{pause.visitsCancelledTitle}</p>
          <p className="mt-0.5 text-warning-foreground">{pause.visitsCancelledDescription}</p>
        </div>
      </div>
    </ExtensionShell>
  )
}

function DeleteExtension({
  item,
  notifyCustomer,
  outcome,
  technicianLabel,
  onNotifyCustomerChange,
}: {
  item: RoundPlannerListItem
  notifyCustomer: boolean
  outcome: string
  technicianLabel: string
  onNotifyCustomerChange: (checked: boolean) => void
}) {
  const { removePropertyModal } = roundPlannerContent

  return (
    <ExtensionShell>
      <div className={modalWarningPanelClass}>{removePropertyModal.extension.delete.message}</div>
      <ModalToggleRow
        compact
        label={removePropertyModal.fields.notifyCustomer}
        description={removePropertyModal.fields.notifyCustomerDescription}
        checked={notifyCustomer}
        onChange={onNotifyCustomerChange}
        ariaLabel={removePropertyModal.fields.notifyCustomer}
      />
      <SummaryPanel item={item} technicianLabel={technicianLabel} outcome={outcome} />
    </ExtensionShell>
  )
}

function PauseDurationOption({
  option,
  selected,
  onSelect,
}: {
  option: RoundPlannerPauseDurationOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full gap-3 rounded-none border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-accent-surface ring-1 ring-primary'
          : 'border-border bg-card hover:bg-surface',
      )}
    >
      <span
        className={cn(
          'mt-1 h-3.5 w-3.5 shrink-0 rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-muted bg-muted/40',
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

function VisitCreationFields({
  visitDate,
  technicianId,
  visitStatus,
  visitPrice,
  onVisitDateChange,
  onTechnicianChange,
  onVisitStatusChange,
  onVisitPriceChange,
}: {
  visitDate: string
  technicianId: string
  visitStatus: string
  visitPrice: string
  onVisitDateChange: (value: string) => void
  onTechnicianChange: (value: string) => void
  onVisitStatusChange: (value: string) => void
  onVisitPriceChange: (value: string) => void
}) {
  const { removePropertyModal } = roundPlannerContent
  const { visitCreation } = removePropertyModal.extension

  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{visitCreation.title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={visitCreation.visitDate} size="sm" labelWeight="medium">
          <Input
            inputSize="sm"
            type="text"
            value={visitDate}
            onChange={(event) => onVisitDateChange(event.target.value)}
            className={modalInputClass}
          />
        </Field>
        <Field label={visitCreation.assignedTechnician} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={technicianId}
            onChange={(event) => onTechnicianChange(event.target.value)}
            options={[...removePropertyModal.technicianOptions]}
            className={modalInputClass}
          />
        </Field>
        <Field label={visitCreation.visitStatus} size="sm" labelWeight="medium">
          <Select
            inputSize="sm"
            value={visitStatus}
            onChange={(event) => onVisitStatusChange(event.target.value)}
            options={[...removePropertyModal.visitStatuses]}
            className={modalInputClass}
          />
        </Field>
        <Field label={visitCreation.price} size="sm" labelWeight="medium">
          <Input
            inputSize="sm"
            type="text"
            value={visitPrice}
            onChange={(event) => onVisitPriceChange(event.target.value)}
            className={modalInputClass}
          />
        </Field>
      </div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  )
}

function RemovalOption({
  option,
  selected,
  onSelect,
}: {
  option: RoundPlannerRemovePropertyOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 py-1 text-left">
      <span
        className={cn(
          'h-3.5 w-3.5 shrink-0 rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-muted bg-muted/40',
        )}
        aria-hidden="true"
      />
      <span className="text-sm text-foreground">{option.title}</span>
    </button>
  )
}
