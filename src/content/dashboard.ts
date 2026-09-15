import type { DashboardChartRange, DashboardPeriod, DashboardRoundStatus } from '@/api/dashboard.api'
import type { PaymentMethod } from '@/api/types'

export type DashboardTone = 'default' | 'primary' | 'success' | 'warning' | 'danger'

export interface BulkMessageRoundOption {
  id: string
  label: string
  customerCount: number
  customersOnHold: number
}

export interface BulkMessageTemplateOption {
  id: string
  label: string
  body: string
  smsCreditsPerCustomer: number
}

export interface DashboardMetric {
  label: string
  value: string
  description: string
  icon: string
  tone?: DashboardTone
}

export type DashboardAlertId = 'skipped' | 'failed-payments' | 'complaint-revisits'

export interface DashboardAlert {
  id: DashboardAlertId
  /** Undefined until the alerts query resolves. */
  value: number | undefined
  label: string
  description: string
  icon: string
  tone: DashboardTone
}

export interface TechnicianLocation {
  name: string
  status: string
  current?: string
  lastSeen: string
  tone: DashboardTone
  position: { x: number; y: number }
}

export interface KpiMetric {
  label: string
  value: string
  detail: string
  tone?: DashboardTone
}

export interface ChartBar {
  label: string
  value: number
}

export interface TodayRound {
  id: string
  round: string
  technician: string
  status: DashboardRoundStatus
  completed: number
  total: number
  skipped: number
  issues: number
  paymentHolds: number
  value: string
  eta: string
}

export const dashboardRoundStatusLabels: Record<DashboardRoundStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Completed',
}

export const dashboardContent = {
  header: {
    title: 'Dashboard',
    subtitle: "Live view of today's rounds, jobs, payments, and issues",
    lastUpdatedPrefix: 'Last updated',
    notLoaded: 'Not loaded yet',
    autoRefresh: 'Auto-refresh every minute',
    refreshLabel: 'Refresh dashboard',
  },
  states: {
    error: 'Something went wrong, please refresh.',
    retry: 'Refresh',
  },
  metrics: {
    jobsToday: { label: 'Jobs Today', description: 'Scheduled for today' },
    openComplaints: { label: 'Open Complaints', description: 'By priority' },
    cleanUnpaid: { label: 'Clean Unpaid', description: 'Completed this month, not yet paid' },
    monthlyRevenue: { label: 'Monthly Revenue', description: 'Completed jobs this calendar month' },
  },
  alerts: {
    skipped: { label: 'Needs review', description: 'Skipped today', action: 'Manage skipped jobs' },
    failedPayments: {
      label: 'Requires payment follow-up',
      description: 'Failed payments',
      action: 'Open Debt Board',
    },
    complaintRevisits: {
      label: 'Due this week',
      description: 'Complaint revisits',
      action: 'Open Complaints Board',
    },
  },
  gps: {
    title: 'Live GPS Tracking',
    statusLabel: 'Live',
    mapTitle: 'GPS Map View',
    mapSubtitle: 'Real-time vehicle locations',
    mapCaption: 'Integration with GPS tracking provider',
    techniciansTitle: 'Technicians',
    // Placeholder pins for the blurred "Coming Soon" preview — no GPS provider yet.
    technicians: [
      {
        name: 'Technician A',
        status: 'At Job',
        current: 'On site',
        lastSeen: '2 min ago',
        tone: 'success',
        position: { x: 18, y: 55 },
      },
      {
        name: 'Technician B',
        status: 'Driving',
        lastSeen: '5 min ago',
        tone: 'primary',
        position: { x: 40, y: 38 },
      },
    ] satisfies TechnicianLocation[],
    comingSoon: {
      badge: 'Coming Soon',
      title: 'Live GPS tracking is on the way',
      description: 'Real-time technician locations are coming soon.',
    },
  },
  kpis: {
    title: 'Technician KPIs',
    subtitle: 'Per-technician performance tracking',
    periodOptions: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ] satisfies { value: DashboardPeriod; label: string }[],
    noTechnicians: 'No active technicians yet.',
    tiles: {
      jobsCompleted: 'Jobs Completed',
      valueCompleted: 'Value Completed',
      openComplaints: 'Open Complaints',
      issues: 'Issues Raised',
      timeOnJob: 'Time on Job',
      strikes: 'Strikes',
      damages: 'Damages',
      upsells: 'Upsells',
      scopeAll: 'All technicians',
      requiresReview: 'Requires review',
      allClear: 'All clear',
      notAvailable: 'Coming in a later phase',
    },
    charts: {
      rangeOptions: [
        { value: '6m', label: '6M' },
        { value: '12m', label: '12M' },
      ] satisfies { value: DashboardChartRange; label: string }[],
      valueTitle: 'Value of Work Completed',
      issuesTitle: 'Issues Raised',
      revenueTitle: 'Revenue Per Hour',
      revenueUnavailable: 'Revenue per hour needs time tracking — coming in a later phase.',
      noData: {
        badge: 'No data',
        title: 'No data yet',
        description: 'This chart will fill in as data comes in for this period.',
      },
    },
  },
  todayRounds: {
    title: "Today's Rounds",
    viewAll: 'View All',
    empty: 'No rounds scheduled for today.',
    columns: {
      round: 'Round',
      technician: 'Technician',
      status: 'Status',
      progress: 'Progress',
      skipped: 'Skipped',
      issues: 'Issues',
      value: 'Value',
      eta: 'ETA',
    },
  },
  bulkMessageModal: {
    title: 'Bulk Message Round',
    subtitle: 'Send SMS/WhatsApp to customers',
    fields: {
      round: { label: 'Round' },
      template: { label: 'Message Template' },
      preview: { label: 'Message Preview' },
      excludeHold: { label: 'Exclude customers on payment hold' },
      sendOptions: { label: 'Send Options' },
    },
    sendOptions: [
      { id: 'now', label: 'Send now' },
      { id: 'schedule', label: 'Schedule' },
    ],
    actions: {
      cancel: 'Cancel',
      send: 'Send Message',
    },
    creditPricePerSms: 0.1,
    rounds: [
      { id: 'alnwick-monday', label: 'Alnwick Monday', customerCount: 32, customersOnHold: 0 },
      { id: 'alnwick-tuesday', label: 'Alnwick Tuesday', customerCount: 28, customersOnHold: 1 },
      { id: 'morpeth-wednesday', label: 'Morpeth Wednesday', customerCount: 24, customersOnHold: 0 },
      { id: 'bamburgh-tuesday', label: 'Bamburgh Tuesday', customerCount: 18, customersOnHold: 1 },
    ] satisfies BulkMessageRoundOption[],
    templates: [
      {
        id: 'weather-delay',
        label: 'Weather Delay',
        body: "Hi, due to adverse weather conditions, we've had to postpone today's window cleaning. We'll reschedule your appointment for the next available slot. Thanks for your understanding!",
        smsCreditsPerCustomer: 1,
      },
      {
        id: 'job-completed',
        label: 'Job Completed',
        body: 'Hi, your windows have been cleaned today. Thank you for your business!',
        smsCreditsPerCustomer: 1,
      },
      {
        id: 'payment-reminder',
        label: 'Payment Reminder',
        body: 'Hi, this is a friendly reminder that your window cleaning payment is due. Please contact us if you have any questions.',
        smsCreditsPerCustomer: 1,
      },
    ] satisfies BulkMessageTemplateOption[],
  },
  oneOffJobModal: {
    title: 'Add One-Off Job',
    subtitle: 'Create a single visit outside regular rounds',
    fields: {
      customer: {
        label: 'Customer / Property',
        placeholder: 'Search by customer, address or postcode...',
        hint: 'Type at least 2 characters to search.',
        searching: 'Searching…',
        empty: 'No properties found.',
        change: 'Change',
      },
      serviceType: { label: 'Service Type', placeholder: 'No service' },
      date: { label: 'Date' },
      price: { label: 'Price' },
      technician: { label: 'Technician', placeholder: 'Assign later' },
      paymentMethod: { label: 'Payment Method', placeholder: 'Not set' },
      round: { label: 'Round', none: "None — Today's Work only" },
      notes: { label: 'Notes', placeholder: 'Add any special instructions or notes...' },
    },
    notice: {
      title: 'One-off job',
      body: "This job will not be added to regular rounds and won't recur automatically",
    },
    actions: {
      cancel: 'Cancel',
      create: 'Create One-Off Visit',
      creating: 'Creating…',
    },
    errors: {
      property: 'Search for and select a property.',
      date: 'Choose a visit date.',
      price: 'Enter a price greater than 0.',
    },
    successToast: 'One-off visit created',
    successInPlanner: 'It will show in the Round Planner for the selected round.',
    successTodayOnly: "It will show in Today's Work on its date.",
  },
} as const

export const oneOffPaymentMethodLabels: Record<PaymentMethod, string> = {
  GOCARDLESS: 'GoCardless',
  STRIPE: 'Stripe (card)',
  CASH: 'Cash',
  BACS: 'Bank transfer (BACS)',
  CHEQUE: 'Cheque',
}
