import type {
  ReportsActivityRow,
  ReportsPeriodParam,
  ReportsRevenuePoint,
  ReportsSummary,
  ReportsTechnicianRow,
  ReportsVisitRow,
  ReportsVisitStatusParam,
} from '@/api/reports.api'
import type {
  ActivityIcon,
  ActivityLogItem,
  ReportsMetric,
  ReportsPeriod,
  RevenuePoint,
  TechnicianPerformanceRow,
  VisitHistoryRow,
  VisitStatus,
} from '@/content/reports'

export const UI_PERIOD_TO_API: Record<ReportsPeriod, ReportsPeriodParam> = {
  Daily: 'today',
  Weekly: 'last7',
  Monthly: 'last30',
}

export const PERIOD_LABELS: Record<ReportsPeriodParam, string> = {
  today: 'Today',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
}

export function uiStatusToApi(status: string): ReportsVisitStatusParam | undefined {
  if (status === 'completed') return 'COMPLETED'
  if (status === 'skipped') return 'SKIPPED'
  if (status === 'scheduled' || status === 'pending') return 'SCHEDULED'
  return undefined
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function formatVisitDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatActivityMeta(createdAt: string, actorRole: string | null) {
  const date = new Date(createdAt)
  const when = Number.isNaN(date.getTime())
    ? createdAt
    : date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
  return actorRole ? `${when} by ${actorRole}` : when
}

function formatChartLabel(isoDate: string, period: ReportsPeriodParam) {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  if (period === 'today') {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function mapVisitStatus(status: ReportsVisitRow['status']): VisitStatus {
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

function activityIcon(type: string): ActivityIcon {
  switch (type) {
    case 'PROPERTY_ADDED':
      return 'home'
    case 'TECHNICIAN_ASSIGNED':
      return 'technicians'
    case 'VISITS_GENERATED':
    case 'DAY_CLOSED':
      return 'calendar'
    case 'ROUND_UPDATED':
    default:
      return 'refresh'
  }
}

export function summaryToMetrics(summary: ReportsSummary | undefined): ReportsMetric[] {
  return [
    {
      id: 'total-revenue',
      label: 'Total Revenue',
      value: summary ? formatMoney(summary.totalRevenue) : '—',
      trend: '',
      trendPositive: true,
      icon: 'calendar',
    },
    {
      id: 'completed-visits',
      label: 'Completed Visits',
      value: summary ? String(summary.completedVisits) : '—',
      trend: '',
      trendPositive: true,
      icon: 'check-circle',
    },
    {
      id: 'completed-rounds',
      label: 'Completed Rounds',
      value: summary ? String(summary.completedRounds) : '—',
      trend: '',
      trendPositive: true,
      icon: 'refresh',
    },
    {
      id: 'undone-payments',
      label: 'Undone Payments',
      value: summary ? formatMoney(summary.undonePayments) : '—',
      trend: '',
      trendPositive: false,
      icon: 'briefcase',
    },
  ]
}

export function revenueToPoints(
  rows: ReportsRevenuePoint[] | undefined,
  period: ReportsPeriodParam,
): RevenuePoint[] {
  return (rows ?? []).map((row) => ({
    label: formatChartLabel(row.date, period),
    value: row.amount,
  }))
}

export function techniciansToRows(
  rows: ReportsTechnicianRow[] | undefined,
): TechnicianPerformanceRow[] {
  return (rows ?? []).map((row) => ({
    id: row.technicianId,
    name: row.name || '—',
    email: row.email?.trim() || '—',
    completed: row.completed,
    skipped: row.skipped,
    efficiency: `${row.efficiency}%`,
    revenueImpact: formatMoney(row.revenueImpact),
  }))
}

export function visitsToRows(rows: ReportsVisitRow[] | undefined): VisitHistoryRow[] {
  return (rows ?? []).map((row) => ({
    id: row.visitId,
    date: formatVisitDate(row.date),
    property: row.postcode
      ? `${row.property}, ${row.postcode}`
      : row.property || '—',
    round: row.round || '—',
    technician: row.technician || '—',
    status: mapVisitStatus(row.status),
    amount: formatMoney(row.amount),
  }))
}

export function activityToItems(rows: ReportsActivityRow[] | undefined): ActivityLogItem[] {
  return (rows ?? []).map((row) => ({
    id: row.id,
    title: row.message,
    meta: formatActivityMeta(row.createdAt, row.actorRole),
    icon: activityIcon(row.type),
  }))
}

export function cycleLabelForPeriod(period: ReportsPeriodParam) {
  return `Period: ${PERIOD_LABELS[period]}`
}

export function niceChartMax(values: number[]) {
  const max = Math.max(0, ...values)
  if (max <= 0) return 100
  const padded = max * 1.15
  const magnitude = 10 ** Math.floor(Math.log10(padded))
  const normalized = padded / magnitude
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}
