export type ReportsPeriod = 'Daily' | 'Weekly' | 'Monthly'

export type VisitStatus = 'completed' | 'skipped' | 'in-progress' | 'pending'

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
      { value: 'all', label: 'Status' },
      { value: 'completed', label: 'Completed' },
      { value: 'skipped', label: 'Skipped' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'pending', label: 'Pending' },
    ],
  },
  exportLabel: 'Export',
  viewAllLabel: 'View All',
  periods: ['Daily', 'Weekly', 'Monthly'] as const satisfies readonly ReportsPeriod[],
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
  revenueByPeriod: {
    Daily: [
      { label: 'Jan', value: 80_000 },
      { label: 'Feb', value: 42_000 },
      { label: 'Mar', value: 60_000 },
      { label: 'Apr', value: 110_000 },
      { label: 'May', value: 82_000 },
      { label: 'Jun', value: 95_000 },
      { label: 'Jul', value: 60_000 },
      { label: 'Aug', value: 120_000 },
      { label: 'Sep', value: 128_000 },
      { label: 'Oct', value: 91_000 },
      { label: 'Nov', value: 104_000 },
      { label: 'Dec', value: 148_000 },
    ],
    Weekly: [
      { label: 'Jan', value: 38_000 },
      { label: 'Feb', value: 52_000 },
      { label: 'Mar', value: 61_000 },
      { label: 'Apr', value: 55_000 },
      { label: 'May', value: 78_000 },
      { label: 'Jun', value: 92_000 },
      { label: 'Jul', value: 85_000 },
      { label: 'Aug', value: 108_000 },
      { label: 'Sep', value: 115_000 },
      { label: 'Oct', value: 98_000 },
      { label: 'Nov', value: 122_000 },
      { label: 'Dec', value: 140_000 },
    ],
    Monthly: [
      { label: 'Jan', value: 55_000 },
      { label: 'Feb', value: 62_000 },
      { label: 'Mar', value: 70_000 },
      { label: 'Apr', value: 68_000 },
      { label: 'May', value: 82_000 },
      { label: 'Jun', value: 90_000 },
      { label: 'Jul', value: 96_000 },
      { label: 'Aug', value: 105_000 },
      { label: 'Sep', value: 112_000 },
      { label: 'Oct', value: 120_000 },
      { label: 'Nov', value: 130_000 },
      { label: 'Dec', value: 145_000 },
    ],
  } as const satisfies Record<ReportsPeriod, readonly RevenuePoint[]>,
  technicians: [
    {
      id: 'tech-james',
      name: 'James',
      email: 'james@gmail.com',
      completed: 65,
      skipped: 1,
      efficiency: '98%',
      revenueImpact: '£6,549 (40%)',
    },
    {
      id: 'tech-sarah',
      name: 'Sarah',
      email: 'sarah@gmail.com',
      completed: 65,
      skipped: 1,
      efficiency: '98%',
      revenueImpact: '£6,549 (40%)',
    },
    {
      id: 'tech-david',
      name: 'David Beckham',
      email: 'david@gmail.com',
      completed: 65,
      skipped: 18,
      efficiency: '98%',
      revenueImpact: '£6,549 (40%)',
    },
    {
      id: 'tech-laura',
      name: 'Laura Chen',
      email: 'laura@gmail.com',
      completed: 52,
      skipped: 3,
      efficiency: '94%',
      revenueImpact: '£5,210 (32%)',
    },
    {
      id: 'tech-michael',
      name: "Michael O'Neil",
      email: 'michael@gmail.com',
      completed: 48,
      skipped: 5,
      efficiency: '91%',
      revenueImpact: '£4,880 (29%)',
    },
    {
      id: 'tech-carlos',
      name: 'Carlos Mia',
      email: 'carlos@gmail.com',
      completed: 41,
      skipped: 8,
      efficiency: '84%',
      revenueImpact: '£3,920 (24%)',
    },
  ] as const satisfies readonly TechnicianPerformanceRow[],
  visits: [
    {
      id: 'visit-1',
      date: '20 May 2025',
      property: '12 Castle View, Alnwick',
      round: 'Alnwick Monday',
      technician: 'James Smith',
      status: 'completed',
      amount: '£6,549 (40%)',
    },
    {
      id: 'visit-2',
      date: '20 May 2025',
      property: '12 Castle View, Alnwick',
      round: 'Alnwick Monday',
      technician: 'James Smith',
      status: 'completed',
      amount: '£6,549 (40%)',
    },
    {
      id: 'visit-3',
      date: '20 May 2025',
      property: '12 Castle View, Alnwick',
      round: 'Alnwick Monday',
      technician: 'Carlos Mia',
      status: 'skipped',
      amount: '£6,549 (40%)',
    },
    {
      id: 'visit-4',
      date: '20 May 2025',
      property: '12 Castle View, Alnwick',
      round: 'Alnwick Monday',
      technician: 'James Smith',
      status: 'completed',
      amount: '£6,549 (40%)',
    },
    {
      id: 'visit-5',
      date: '22 May 2025',
      property: '18 Green Lane, Alnwick',
      round: 'Alnwick Wednesday',
      technician: 'Laura Chen',
      status: 'in-progress',
      amount: '£4,200 (26%)',
    },
    {
      id: 'visit-6',
      date: '24 May 2025',
      property: '4 Harbour Road, Seahouses',
      round: 'Seahouses Thursday',
      technician: "Michael O'Neil",
      status: 'pending',
      amount: '£3,150 (19%)',
    },
    {
      id: 'visit-7',
      date: '20 May 2025',
      property: '12 Castle View, Alnwick',
      round: 'Alnwick Monday',
      technician: 'James Smith',
      status: 'completed',
      amount: '£6,549 (40%)',
    },
  ] as const satisfies readonly VisitHistoryRow[],
  activity: [
    {
      id: 'act-1',
      title: 'Visits generated for Alnwick Monday (4-week cycle)',
      meta: '20 May 2025, 09:30 AM by Admin',
      icon: 'calendar',
    },
    {
      id: 'act-2',
      title: 'Property added: 18 Green Lane, Alnwick',
      meta: '20 May 2025, 09:30 AM by Admin',
      icon: 'home',
    },
    {
      id: 'act-3',
      title: 'Technician assigned: Sarah Johnson to Alnwick Wednesday',
      meta: '20 May 2025, 09:30 AM by Admin',
      icon: 'technicians',
    },
    {
      id: 'act-4',
      title: 'Round updated: Newcastle Friday',
      meta: '20 May 2025, 09:30 AM by Admin',
      icon: 'refresh',
    },
    {
      id: 'act-5',
      title: 'Round results: Manchester Wednesday',
      meta: '21 May 2025, 10:15 AM by Contributor',
      icon: 'refresh',
    },
    {
      id: 'act-6',
      title: 'Round analysis: Birmingham Thursday',
      meta: '22 May 2025, 02:45 PM by Analyst',
      icon: 'refresh',
    },
    {
      id: 'act-7',
      title: 'Round schedule: Liverpool Saturday',
      meta: '23 May 2025, 11:00 AM by Moderator',
      icon: 'refresh',
    },
    {
      id: 'act-8',
      title: 'Round summary: Bristol Sunday',
      meta: '24 May 2025, 01:30 PM by Reporter',
      icon: 'refresh',
    },
  ] as const satisfies readonly ActivityLogItem[],
} as const
