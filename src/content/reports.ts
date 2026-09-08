export type ReportsPeriod = 'Daily' | 'Weekly' | 'Monthly'

export type VisitStatus = 'completed' | 'skipped' | 'in-progress' | 'pending' | 'scheduled'

export type ActivityIcon = 'calendar' | 'home' | 'technicians' | 'refresh'

export interface ReportsMetric {
  id: string
  label: string
  value: string
  trend: string
  trendPositive: boolean
  icon: string
}

export interface RevenuePoint {
  label: string
  value: number
}

export interface TechnicianPerformanceRow {
  id: string
  name: string
  email: string
  completed: number
  skipped: number
  efficiency: string
  revenueImpact: string
}

export interface VisitHistoryRow {
  id: string
  date: string
  property: string
  round: string
  technician: string
  status: VisitStatus
  amount: string
}

export interface ActivityLogItem {
  id: string
  title: string
  meta: string
  icon: ActivityIcon
}

export const reportsContent = {
  title: 'Reports & History',
  subtitle: 'View performance, revenue, completed rounds, and system history',
  cycleLabel: 'Cycle: 6 May – 2 Jun',
  statusFilter: {
    label: 'Status',
    options: [
      { value: 'all', label: 'All statuses' },
      { value: 'completed', label: 'Completed' },
      { value: 'skipped', label: 'Skipped' },
      { value: 'scheduled', label: 'Scheduled' },
    ],
  },
  exportLabel: 'Export',
  viewAllLabel: 'View All',
  periods: ['Daily', 'Weekly', 'Monthly'] as const satisfies readonly ReportsPeriod[],
  periodHints: {
    Daily: 'Today',
    Weekly: 'Last 7 days',
    Monthly: 'Last 30 days',
  } as const satisfies Record<ReportsPeriod, string>,
  sections: {
    revenueOverview: 'Revenue Overview',
    technicianPerformance: 'Technician Performance',
    visitHistory: 'Visit History',
    activityLog: 'System Activity Log',
  },
  visitStatusLabels: {
    completed: 'Completed',
    skipped: 'Skipped',
    'in-progress': 'In Progress',
    pending: 'Pending',
    scheduled: 'Scheduled',
  } as const satisfies Record<VisitStatus, string>,
  metrics: [
    {
      id: 'total-revenue',
      label: 'Total Revenue',
      value: '£24,903',
      trend: '+8.6 vs last 30 days',
      trendPositive: true,
      icon: 'calendar',
    },
    {
      id: 'completed-visits',
      label: 'Completed Visits',
      value: '1,294',
      trend: '+8.6 vs last 30 days',
      trendPositive: true,
      icon: 'check-circle',
    },
    {
      id: 'completed-rounds',
      label: 'Completed Rounds',
      value: '56',
      trend: '+12.3 vs last 30 days',
      trendPositive: true,
      icon: 'refresh',
    },
    {
      id: 'undone-payments',
      label: 'Undone Payments',
      value: '£12,345',
      trend: '-8.3 vs last 30 days',
      trendPositive: false,
      icon: 'briefcase',
    },
  ] as const satisfies readonly ReportsMetric[],
} as const
