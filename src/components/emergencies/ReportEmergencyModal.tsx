import { useEffect, useMemo, useState } from 'react'
import type { TodayRoundSummary } from '@/api/today.api'
import { emergenciesContent } from '@/content/emergencies'
import { DashboardIcon } from '@/components/dashboard/DashboardIcon'
import { Field, Input, Select, Textarea } from '@/components/ui'
import { Modal, ModalButton } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { useReportEmergency } from '@/features/emergencies/hooks/useEmergencies'
import { ApiError, errorMessage } from '@/lib/errors'

interface ReportEmergencyModalProps {
  open: boolean
  /** Today's rounds — the technician picks the one they are running. */
  rounds: readonly TodayRoundSummary[]
  onClose: () => void
}

/** Technician self-report — `POST /emergencies`. The manager bell lights up on success. */
export function ReportEmergencyModal({ open, rounds, onClose }: ReportEmergencyModalProps) {
  const { report } = emergenciesContent
  const { showToast } = useToast()
  const reportEmergency = useReportEmergency()

  // Only rounds with a technician can be reported (the API needs the reporter's technicianId).
  const options = useMemo(() => rounds.filter((round) => round.technicianId), [rounds])

  const [roundId, setRoundId] = useState('')
  const [remainingStops, setRemainingStops] = useState('')
  const [lastLocation, setLastLocation] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const first = options[0]
    setRoundId(first?.roundId ?? '')
    setRemainingStops(first ? String(remainingFor(first)) : '')
    setLastLocation('')
    setWindowEnd('')
    setNotes('')
    setError(null)
  }, [open, options])

  function selectRound(nextId: string) {
    setRoundId(nextId)
    const round = options.find((item) => item.roundId === nextId)
    if (round) setRemainingStops(String(remainingFor(round)))
    setError(null)
  }

  async function handleSubmit() {
    const round = options.find((item) => item.roundId === roundId)
    if (!round?.technicianId) return setError(report.validation.roundRequired)
    const stops = Number(remainingStops)
    if (!Number.isInteger(stops) || stops < 0) return setError(report.validation.stopsInvalid)
    setError(null)

    try {
      await reportEmergency.mutateAsync({
        technicianId: round.technicianId,
        roundId: round.roundId,
        remainingStops: stops,
        lastLocation: lastLocation.trim() || null,
        scheduledWindowEnd: windowEnd ? new Date(windowEnd).toISOString() : null,
        notes: notes.trim() || null,
      })
      showToast(report.success)
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 400 ? caught.message : errorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={report.title}
      subtitle={report.subtitle}
      showCloseButton
      stacked
      size="compact"
      maxWidthClass="max-w-md"
      headerClassName="pl-16"
      bodyClassName="space-y-4"
      footer={
        <div className="grid grid-cols-2 gap-3">
          <ModalButton compact variant="secondary" className="w-full" onClick={onClose}>
            {report.cancel}
          </ModalButton>
          <ModalButton
            compact
            variant="primary"
            className="w-full"
            disabled={reportEmergency.isPending || options.length === 0}
            onClick={() => void handleSubmit()}
          >
            {reportEmergency.isPending ? report.submitting : report.submit}
          </ModalButton>
        </div>
      }
    >
      <span className="absolute top-4 left-5 flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <DashboardIcon name="alert" className="h-5 w-5" />
      </span>

      {options.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
          {report.noRounds}
        </p>
      ) : (
        <>
          <Field label={report.fields.round} required size="sm" labelWeight="medium">
            <Select
              inputSize="sm"
              value={roundId}
              onChange={(event) => selectRound(event.target.value)}
              options={[
                { value: '', label: report.fields.roundPlaceholder },
                ...options.map((round) => ({ value: round.roundId, label: round.roundName })),
              ]}
            />
          </Field>

          <Field label={report.fields.remainingStops} required size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              type="number"
              min={0}
              inputMode="numeric"
              value={remainingStops}
              onChange={(event) => setRemainingStops(event.target.value)}
            />
          </Field>

          <Field label={report.fields.lastLocation} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              value={lastLocation}
              onChange={(event) => setLastLocation(event.target.value)}
              placeholder={report.fields.lastLocationPlaceholder}
            />
          </Field>

          <Field label={report.fields.windowEnd} size="sm" labelWeight="medium">
            <Input
              inputSize="sm"
              type="datetime-local"
              value={windowEnd}
              onChange={(event) => setWindowEnd(event.target.value)}
            />
          </Field>

          <Field label={report.fields.notes} size="sm" labelWeight="medium">
            <Textarea
              inputSize="sm"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={report.fields.notesPlaceholder}
            />
          </Field>
        </>
      )}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </Modal>
  )
}

function remainingFor(round: TodayRoundSummary): number {
  return Math.max(0, round.total - round.completed - round.skipped)
}
