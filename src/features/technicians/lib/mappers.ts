import type {
  TechnicianDetail,
  TechnicianListItem,
  TechnicianTodayWorkload,
} from '@/api/technicians.api'
import type {
  TechnicianRecord,
  TechnicianRound,
  TechnicianStatus,
} from '@/content/technicians'

function initialOf(name: string) {
  const trimmed = name.trim()
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
}

function formatMemberSince(iso: string | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function formatOverviewDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function mapAppStatusToUi(
  appStatus: TechnicianListItem['appStatus'],
  workload: TechnicianTodayWorkload[] | undefined,
): TechnicianStatus {
  if (appStatus === 'INACTIVE') return 'off-duty'
  const remaining = (workload ?? []).reduce((sum, row) => sum + row.remaining, 0)
  if (appStatus === 'ACTIVE' && remaining > 0) return 'in-progress'
  return 'available'
}

function workloadToRounds(workload: TechnicianTodayWorkload[] | undefined): TechnicianRound[] {
  return (workload ?? []).map((row) => ({
    id: row.roundId,
    name: row.roundName,
    stops: row.total,
    completed: row.completed,
    revenue: '—',
    status:
      row.remaining > 0
        ? row.completed > 0
          ? 'in-progress'
          : 'available'
        : 'available',
  }))
}

export function roundsFromNames(roundNames: string[] | undefined): TechnicianRound[] {
  return (roundNames ?? []).map((name, index) => ({
    id: `round-${index}`,
    name,
    stops: 0,
    completed: 0,
    revenue: '—',
    status: 'available' as const,
  }))
}

function toBaseRecord(item: TechnicianListItem, roundNames?: string[]): TechnicianRecord {
  const name = item.name?.trim() || 'Unnamed technician'
  return {
    id: item.id,
    name,
    initials: initialOf(name),
    role: item.role?.trim() || 'Technician',
    phone: item.phone?.trim() || '—',
    email: item.email?.trim() || '—',
    areas: item.serviceAreas.map((area) => area.serviceAreaName),
    serviceAreaId: item.serviceAreas[0]?.serviceAreaId ?? null,
    notes: item.notes?.trim() || '',
    status: mapAppStatusToUi(item.appStatus, undefined),
    appStatus: item.appStatus,
    appActive: item.active,
    memberSince: formatMemberSince(item.createdAt),
    revenue: '—',
    revenuePerHour: '—',
    valueCompleted: '—',
    timeOnJob: '—',
    complaints: 0,
    issues: 0,
    rounds: roundsFromNames(roundNames),
  }
}

/**
 * `GET /technicians` carries no round data — pass a technicianId → round names
 * map (built from `GET /rounds` + per-round detail) to show real round counts.
 */
export function technicianListToUi(
  items: TechnicianListItem[] | undefined,
  roundNamesByTechnicianId?: Map<string, string[]>,
): TechnicianRecord[] {
  return (items ?? []).map((item) => toBaseRecord(item, roundNamesByTechnicianId?.get(item.id)))
}

export function technicianDetailToUi(detail: TechnicianDetail | undefined): TechnicianRecord | null {
  if (!detail) return null
  const base = toBaseRecord(detail)
  const workloadRounds = workloadToRounds(detail.todayWorkload)
  const assignedRounds =
    workloadRounds.length > 0 ? workloadRounds : roundsFromNames(detail.roundNames)

  return {
    ...base,
    status: mapAppStatusToUi(detail.appStatus, detail.todayWorkload),
    rounds: assignedRounds,
  }
}

export function overviewMetricsFromList(items: TechnicianListItem[] | undefined) {
  const list = items ?? []
  const active = list.filter((item) => item.appStatus === 'ACTIVE').length
  const pending = list.filter((item) => item.appStatus === 'PENDING_INVITE').length
  const inactive = list.filter((item) => item.appStatus === 'INACTIVE').length
  return [
    { label: 'Active', value: String(active), accent: true as const },
    { label: 'Pending invite', value: String(pending) },
    { label: 'Inactive', value: String(inactive) },
    { label: 'Total technicians', value: String(list.length) },
  ]
}

export { formatOverviewDate }
