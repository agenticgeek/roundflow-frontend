import { useEffect, useMemo, useState } from 'react'
import type { ReassignApplyToId, ReassignApplyToOption, TodaysWorkRound } from '@/content/todays-work'
import { todaysWorkContent } from '@/content/todays-work'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import {
  Modal,
  ModalButton,
  ModalFooter,
  modalInfoPanelClass,
  modalInputClass,
  ModalToggleRow,
} from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useReassignRoundTechnician, useRoundToday } from '@/features/today/hooks/useToday'
import { mergeRoundTodayDetail } from '@/features/today/lib/mappers'
import { useTechnicians } from '@/features/settings/hooks/useSettings'
import { settingsTechniciansToRows } from '@/features/settings/lib/mappers'
import { useAppBootstrap } from '@/providers/AppBootstrapProvider'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface ReassignTechnicianModalProps {
  open: boolean
  round: TodaysWorkRound | null
  onClose: () => void
}

function countAffectedJobs(round: TodaysWorkRound, applyTo: ReassignApplyToId) {
  if (applyTo === 'all') {
    return round.jobs.length > 0 ? round.jobs.length : round.progressTotal
  }
  if (round.jobs.length > 0) {
    return round.jobs.filter(
      (job) => job.status === 'scheduled' || job.status === 'in-progress',
    ).length
  }
  return Math.max(0, round.progressTotal - round.progressCompleted - round.skipped)
}

/** Reassign round jobs — POST /rounds/:id/reassign. */
export function ReassignTechnicianModal({ open, round, onClose }: ReassignTechnicianModalProps) {
  const { reassignTechnicianModal } = todaysWorkContent
  const { showToast } = useToast()
  const { canMutate } = useAppBootstrap()
  const reassign = useReassignRoundTechnician()
  const techniciansQuery = useTechnicians(open)
  const detailQuery = useRoundToday(round?.id ?? '', open && Boolean(round?.id))

  const [newTechnicianId, setNewTechnicianId] = useState('')
  const [applyToId, setApplyToId] = useState<ReassignApplyToId>('remaining')
  const [note, setNote] = useState('')
  const [notifyTechnician, setNotifyTechnician] = useState(false)

  const liveRound = useMemo(() => {
    if (!round) return null
    return mergeRoundTodayDetail(round, detailQuery.data)
  }, [detailQuery.data, round])

  const technicianOptions = useMemo(() => {
    return settingsTechniciansToRows(techniciansQuery.data)
      .filter((tech) => tech.appStatus !== 'inactive')
      .map((tech) => ({
        value: tech.id,
        label: tech.displayName,
      }))
  }, [techniciansQuery.data])

  const fromTechnicianId = liveRound?.technicianId ?? ''
  const newTechnicianOptions = useMemo(() => {
    const placeholder = { value: '', label: 'Select Technician' }
    const options = technicianOptions.filter((option) => option.value !== fromTechnicianId)
    return [placeholder, ...options]
  }, [fromTechnicianId, technicianOptions])

  const applyToOption =
    reassignTechnicianModal.applyToOptions.find((option) => option.id === applyToId) ??
    reassignTechnicianModal.applyToOptions[0]

  const affectedJobsCount = liveRound ? countAffectedJobs(liveRound, applyToId) : 0
  const jobsLabel = reassignTechnicianModal.jobsAffected.jobsLabel.replace(
    '{count}',
    String(affectedJobsCount),
  )

  useEffect(() => {
    if (!open || !round) return
    setNewTechnicianId('')
    setApplyToId('remaining')
    setNote('')
    setNotifyTechnician(false)
  }, [open, round])

  if (!liveRound) return null

  const subtitle = reassignTechnicianModal.subtitle.replace(
    '{technician}',
    liveRound.technician,
  )

  async function handleConfirm() {
    if (!canMutate || !liveRound || !fromTechnicianId || !newTechnicianId || reassign.isPending) {
      if (!fromTechnicianId) showToast('This round has no technician to reassign from')
      return
    }

    try {
      const result = await reassign.mutateAsync({
        id: liveRound.id,
        input: {
          fromTechnicianId,
          toTechnicianId: newTechnicianId,
          scope: applyToId,
          note: note.trim() || null,
          notify: notifyTechnician,
        },
      })
      onClose()
      showToast(reassignTechnicianModal.successToast, {
        description: `${result.updatedCount} job${result.updatedCount === 1 ? '' : 's'} updated.`,
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        showToast(error.message)
        return
      }
      showToast(error instanceof Error ? error.message : 'Could not reassign technician')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reassignTechnicianModal.title}
      subtitle={subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-lg"
      className="max-h-[min(92dvh,44rem)]"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <ModalFooter compact>
          <ModalButton compact variant="secondary" onClick={onClose}>
            {reassignTechnicianModal.actions.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            disabled={!canMutate || !newTechnicianId || !fromTechnicianId || reassign.isPending}
            onClick={() => void handleConfirm()}
          >
            {reassign.isPending ? 'Reassigning…' : reassignTechnicianModal.actions.confirm}
          </ModalButton>
        </ModalFooter>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-none bg-accent-surface text-accent">
        <DashboardIcon name="arrows-horizontal" className="h-5 w-5" />
      </span>

      {!canMutate ? (
        <p className="rounded-lg border border-warning-border bg-warning-surface px-3 py-2 text-sm text-warning-foreground">
          You don&apos;t have permission to reassign technicians.
        </p>
      ) : null}

      <Field label={reassignTechnicianModal.fields.round} size="sm" labelWeight="medium">
        <Input
          inputSize="sm"
          readOnly
          value={liveRound.round}
          className={cn(modalInputClass, 'bg-surface text-foreground')}
        />
      </Field>

      <Field label={reassignTechnicianModal.fields.currentTechnician} size="sm" labelWeight="medium">
        <Input
          inputSize="sm"
          readOnly
          value={liveRound.technician}
          className={cn(modalInputClass, 'bg-surface text-foreground')}
        />
      </Field>

      <Field label={reassignTechnicianModal.fields.newTechnician} size="sm" labelWeight="medium">
        <Select
          inputSize="sm"
          value={newTechnicianId}
          onChange={(event) => setNewTechnicianId(event.target.value)}
          options={newTechnicianOptions}
          className={modalInputClass}
        />
      </Field>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{reassignTechnicianModal.fields.applyTo}</p>
        {reassignTechnicianModal.applyToOptions.map((option) => (
          <ApplyToOption
            key={option.id}
            option={option}
            selected={applyToId === option.id}
            onSelect={() => setApplyToId(option.id)}
          />
        ))}
      </section>

      <div className={cn('border-primary/25 bg-accent-surface', modalInfoPanelClass)}>
        <p className="text-sm font-semibold text-primary">{reassignTechnicianModal.jobsAffected.title}</p>
        <p className="mt-1 text-2xl font-semibold text-primary">{jobsLabel}</p>
        <p className="mt-0.5 text-xs text-primary/80">{applyToOption?.title}</p>
      </div>

      <Field label={reassignTechnicianModal.fields.note} size="sm" labelWeight="medium">
        <Textarea
          inputSize="sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={reassignTechnicianModal.fields.notePlaceholder}
          className={modalInputClass}
        />
      </Field>

      <ModalToggleRow
        compact
        label={reassignTechnicianModal.fields.notifyTechnician}
        description=""
        checked={notifyTechnician}
        onChange={setNotifyTechnician}
        ariaLabel={reassignTechnicianModal.fields.notifyTechnician}
      />

      <div className="flex gap-3 rounded-none border border-accent/25 bg-accent-surface px-4 py-3">
        <DashboardIcon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm text-foreground">{reassignTechnicianModal.infoAlert}</p>
      </div>
    </Modal>
  )
}

function ApplyToOption({
  option,
  selected,
  onSelect,
}: {
  option: ReassignApplyToOption
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
