import type { TodayAggregate, TodayRoundSummary, TodayTechnicianWorkload } from '@/api/today.api'
import type {
  RoundTodayResult,
  RoundTodayStop,
} from '@/api/rounds.api'
import type {
  TechnicianWorkloadItem,
  TodaysWorkJob,
  TodaysWorkJobStatus,
  TodaysWorkMetric,
  TodaysWorkRound,
  TodaysWorkRoundStatus,
} from '@/content/todays-work'

function formatMoney(value: number | null | undefined) {
  if (value == null) return '£0'
  return `£${value.toFixed(value % 1 === 0 ? 0 : 2)}`
}

function initialOf(name: string) {
  const trimmed = name.trim()
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
}

function mapRoundStatus(status: TodayRoundSummary['status']): TodaysWorkRoundStatus {
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'in-progress'
  return 'scheduled'
}

function formatEta(minutes: number | null | undefined) {
  if (minutes == null) return '—'
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `~${hours}h` : `~${hours}h ${rem}m`
}

function mapJobStatus(status: RoundTodayStop['status']): TodaysWorkJobStatus {
  switch (status) {
    case 'COMPLETED':
      return 'completed'
    case 'SKIPPED':
      return 'skipped'
    case 'IN_PROGRESS':
      return 'in-progress'
    default:
      return 'scheduled'
  }
}

export function formatTodayDateLabel(isoDate: string | undefined) {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function todayKpiToMetrics(data: TodayAggregate | undefined): TodaysWorkMetric[] {
  const kpi = data?.kpi
  return [
    { label: 'Scheduled Stops', value: String(kpi?.totalStops ?? '—') },
    { label: 'In Progress', value: String(kpi?.inProgress ?? '—'), tone: 'primary' },
    { label: 'Completed', value: String(kpi?.completed ?? '—'), tone: 'success' },
    { label: 'Skipped', value: String(kpi?.skipped ?? '—'), tone: 'warning' },
    { label: 'Issues', value: String(kpi?.issues ?? '—'), tone: 'danger' },
    { label: 'Payment Holds', value: String(kpi?.paymentHolds ?? '—'), tone: 'warning' },
    {
      label: 'Value Completed',
      value: kpi ? formatMoney(kpi.valueCompleted) : '—',
    },
  ]
}

export function todayRoundToUi(round: TodayRoundSummary): TodaysWorkRound {
  const technician = round.technicianName ?? '—'
  return {
    id: round.roundId,
    status: mapRoundStatus(round.status),
    round: round.roundName,
    technician,
    technicianId: round.technicianId,
    technicianInitial: initialOf(technician),
    progressCompleted: round.completed,
    progressTotal: round.total,
    completed: round.completed,
    skipped: round.skipped,
    issues: round.issueCount,
    paymentHolds: round.paymentHolds,
    value: formatMoney(round.value),
    eta: formatEta(round.etaMinutes),
    jobs: [],
  }
}

export function todayTechniciansToWorkload(
  rows: TodayTechnicianWorkload[] | undefined,
): TechnicianWorkloadItem[] {
  return (rows ?? []).map((row) => {
    const status: TechnicianWorkloadItem['status'] = row.onTrack
      ? row.remaining === 0
        ? 'completed'
        : 'on-track'
      : 'attention'
    return {
      id: row.technicianId,
      name: row.technicianName,
      initial: initialOf(row.technicianName),
      summary: `${row.completed} done · ${row.remaining} left`,
      roundLabel: row.roundName ?? '—',
      statusLabel:
        status === 'completed' ? 'Completed' : status === 'on-track' ? 'On track' : 'Needs attention',
      status,
      issuesCount: row.issueCount > 0 ? row.issueCount : undefined,
    }
  })
}

export function roundTodayStopsToJobs(stops: RoundTodayStop[] | undefined): TodaysWorkJob[] {
  return (stops ?? []).map((stop) => ({
    id: stop.visitId,
    customer: stop.customerName,
    address: stop.addressLine,
    status: mapJobStatus(stop.status),
    paymentHold: stop.paymentHold || undefined,
    issueNote: stop.issueFlag ?? undefined,
  }))
}

export function mergeRoundTodayDetail(
  base: TodaysWorkRound,
  detail: RoundTodayResult | undefined,
): TodaysWorkRound {
  if (!detail) return base
  const technician = detail.technicianName ?? base.technician
  return {
    ...base,
    round: detail.roundName || base.round,
    technician,
    technicianId: detail.technicianId ?? base.technicianId,
    technicianInitial: initialOf(technician),
    status: mapRoundStatus(detail.status),
    progressCompleted: detail.progress.completed,
    progressTotal: detail.progress.total,
    completed: detail.progress.completed,
    skipped: detail.progress.skipped,
    issues: detail.progress.issues,
    jobs: roundTodayStopsToJobs(detail.stops),
  }
}

export function scheduledStopCount(round: TodaysWorkRound) {
  if (round.jobs.length > 0) {
    return round.jobs.filter((job) => job.status === 'scheduled').length
  }
  return Math.max(0, round.progressTotal - round.progressCompleted - round.skipped)
}

export { formatMoney }
