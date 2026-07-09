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

export interface OneOffJobCustomerOption {
  id: string
  label: string
}

export interface OneOffJobSelectOption {
  value: string
  label: string
}

export interface DashboardMetric {
  label: string
  value: string
  description: string
  icon: string
  tone?: DashboardTone
  trend?: string
}

export type DashboardAlertId = 'skipped' | 'failed-payments' | 'complaint-revisits'

export interface DashboardAlert {
  id: DashboardAlertId
  value: string
  label: string
  description: string
  icon: string
  tone: DashboardTone
}

export interface SkippedJobItem {
  address: string
  customer: string
  round: string
  technician: string
  reason: string
  time: string
}

export interface FailedPaymentItem {
  customer: string
  address: string
  amount: string
  attempts: string
}

export interface ComplaintRevisitItem {
  customer: string
  priority: 'High' | 'Medium' | 'Low'
  address: string
  complaint: string
  technician: string
  dueDate: string
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

export interface IssueBar {
  label: string
  complaints: number
  strikes: number
  upsells: number
}

export interface TodayRound {
  round: string
  technician: string
  stops: number
  done: number
  skip: number
  issues: number
  value: string
  status: 'in-progress' | 'completed'
}

export const dashboardContent = {
  header: {
    title: 'Dashboard',
    subtitle: "Live view of today's rounds, jobs, payments, and issues",
    date: 'Wednesday 13 May 2026',
    lastUpdated: 'Last updated 10:42 AM',
    autoRefresh: 'Auto-refresh on',
  },
  metrics: [
    {
      label: 'Jobs Scheduled',
      value: '48',
      description: 'Across 5 rounds',
      icon: 'calendar',
      trend: '+4 vs last week',
    },
    {
      label: 'Open Complaints',
      value: '2',
      description: 'Require attention today',
      icon: 'flag',
      tone: 'danger',
      trend: '+1 high priority',
    },
    {
      label: 'Clean Unpaid',
      value: '£1,240',
      description: '18 customers outstanding',
      icon: 'alert',
      tone: 'warning',
      trend: '-£120 last month',
    },
    {
      label: 'Monthly Revenue',
      value: '£12,400',
      description: 'Across all completed jobs',
      icon: 'pound',
      tone: 'success',
      trend: '+12% last month',
    },
  ] satisfies DashboardMetric[],
  alerts: [
    {
      id: 'skipped',
      value: '4',
      label: 'Needs review',
      description: 'Skipped',
      icon: 'skip',
      tone: 'warning',
    },
    {
      id: 'failed-payments',
      value: '7',
      label: 'Requires payment follow-up',
      description: 'Failed payments',
      icon: 'card',
      tone: 'danger',
    },
    {
      id: 'complaint-revisits',
      value: '2',
      label: 'Due today + this week',
      description: 'Complaint revisits',
      icon: 'message',
      tone: 'danger',
    },
  ] satisfies DashboardAlert[],
  alertModals: {
    skipped: {
      title: 'Skipped Today',
      summary: '4 jobs need review',
      footerAction: 'Manage skipped jobs',
      items: [
        {
          address: '14 High Street',
          customer: 'John Smith',
          round: 'Alnwick Monday',
          technician: 'James',
          reason: 'Gate locked',
          time: '08:42',
        },
        {
          address: '22 Park View',
          customer: 'Sarah Jones',
          round: 'Morpeth Wednesday',
          technician: 'Sarah',
          reason: 'Customer unavailable',
          time: '09:15',
        },
        {
          address: '8 Station Road',
          customer: 'Mark Evans',
          round: 'Alnwick Monday',
          technician: 'James',
          reason: 'Access blocked',
          time: '10:03',
        },
        {
          address: '3 Church Lane',
          customer: 'Emma Wilson',
          round: 'Bamburgh Tuesday',
          technician: 'Sarah',
          reason: 'Dog in garden',
          time: '11:20',
        },
      ] satisfies SkippedJobItem[],
    },
    'failed-payments': {
      title: 'Failed Payments',
      summary: '£248 outstanding',
      footerAction: 'Open Debt Board',
      items: [
        {
          customer: 'Alice Cooper',
          address: '9 River Lane',
          amount: '£42',
          attempts: '2x tried · 18 Jun',
        },
        {
          customer: 'Robert Green',
          address: '15 Mill Close',
          amount: '£36',
          attempts: '1x tried · 17 Jun',
        },
        {
          customer: 'Helen Price',
          address: '4 Oak Avenue',
          amount: '£28',
          attempts: '3x tried · 16 Jun',
        },
        {
          customer: 'Tom Baker',
          address: '27 West End',
          amount: '£54',
          attempts: '2x tried · 15 Jun',
        },
        {
          customer: 'Lisa Morgan',
          address: '11 Field Drive',
          amount: '£32',
          attempts: '1x tried · 14 Jun',
        },
        {
          customer: 'Chris Adams',
          address: '6 Hilltop Road',
          amount: '£28',
          attempts: '2x tried · 13 Jun',
        },
        {
          customer: 'Nina Patel',
          address: '2 Bridge Street',
          amount: '£28',
          attempts: '1x tried · 12 Jun',
        },
      ] satisfies FailedPaymentItem[],
    },
    'complaint-revisits': {
      title: 'Complaint Revisits',
      summary: 'Due this week',
      footerAction: 'Open Complaints Board',
      items: [
        {
          customer: 'David Harris',
          priority: 'Medium',
          address: '18 Castle View, Alnwick',
          complaint: 'Missed conservatory roof',
          technician: 'James',
          dueDate: '19 Jun',
        },
        {
          customer: 'Karen White',
          priority: 'Low',
          address: '5 Meadow Lane, Morpeth',
          complaint: 'Streaks on upstairs windows',
          technician: 'Sarah',
          dueDate: '21 Jun',
        },
      ] satisfies ComplaintRevisitItem[],
    },
  },
  gps: {
    title: 'Live GPS Tracking',
    statusLabel: 'Live',
    mapTitle: 'GPS Map View',
    mapSubtitle: 'Real-time vehicle locations',
    mapCaption: 'Integration with GPS tracking provider',
    techniciansTitle: 'Technicians (4)',
    technicians: [
      {
        name: 'James',
        status: 'At Job',
        current: '14 High Street',
        lastSeen: '2 min ago',
        tone: 'success',
        position: { x: 18, y: 55 },
      },
      {
        name: 'Sarah',
        status: 'Driving',
        lastSeen: '5 min ago',
        tone: 'primary',
        position: { x: 40, y: 38 },
      },
    ] satisfies TechnicianLocation[],
  },
  kpis: {
    title: 'Technician KPIs',
    subtitle: 'Per-technician performance tracking',
    filters: ['James', 'Sarah'],
    period: ['Monthly', 'Yearly'],
    metrics: [
      { label: 'Value Completed', value: '£1,880', detail: '+ 4% prev mo' },
      { label: 'Time on Job', value: '180h', detail: 'this month' },
      { label: 'Revenue / Hour', value: '£22.80', detail: '+ 4% prev mo', tone: 'success' },
      { label: 'Complaints', value: '1', detail: 'Requires review', tone: 'warning' },
      { label: 'Strikes', value: '1', detail: 'Internal issues', tone: 'warning' },
      { label: 'Damages', value: '0', detail: 'No incidents', tone: 'success' },
      { label: 'Upsells', value: '9', detail: 'additional jobs', tone: 'success' },
    ] satisfies KpiMetric[],
    valueChartTitle: 'Value of Work Completed (Monthly)',
    revenueChartTitle: 'Revenue Per Hour (Monthly)',
    issuesChartTitle: 'Issues Over Time (Monthly)',
    valueChart: [
      { label: 'Jan', value: 62 },
      { label: 'Feb', value: 55 },
      { label: 'Mar', value: 70 },
      { label: 'Apr', value: 66 },
      { label: 'May', value: 76 },
      { label: 'Jun', value: 82 },
    ] satisfies ChartBar[],
    revenueLine: [
      { label: 'Jan', value: 12 },
      { label: 'Feb', value: 32 },
      { label: 'Mar', value: 62 },
      { label: 'Apr', value: 56 },
      { label: 'May', value: 70 },
      { label: 'Jun', value: 86 },
    ] satisfies ChartBar[],
    issueChart: [
      { label: 'Jan', complaints: 1, strikes: 0, upsells: 5 },
      { label: 'Feb', complaints: 0, strikes: 1, upsells: 4 },
      { label: 'Mar', complaints: 2, strikes: 0, upsells: 7 },
      { label: 'Apr', complaints: 1, strikes: 0, upsells: 6 },
      { label: 'May', complaints: 0, strikes: 1, upsells: 8 },
      { label: 'Jun', complaints: 1, strikes: 1, upsells: 9 },
    ] satisfies IssueBar[],
  },
  todayRounds: {
    title: "Today's Rounds",
    viewAll: 'View All',
    columns: {
      round: 'Round',
      technician: 'Technician',
      stops: 'Stops',
      done: 'Done',
      skip: 'Skip',
      issues: 'Issues',
      value: 'Value',
      status: 'Status',
    },
    rows: [
      {
        round: 'Alnwick Monday',
        technician: 'James',
        stops: 12,
        done: 8,
        skip: 1,
        issues: 1,
        value: '£220',
        status: 'in-progress',
      },
      {
        round: 'Alnwick Tuesday',
        technician: 'Sarah',
        stops: 15,
        done: 6,
        skip: 2,
        issues: 0,
        value: '£180',
        status: 'completed',
      },
      {
        round: 'Morpeth Wednesday',
        technician: 'James',
        stops: 10,
        done: 7,
        skip: 3,
        issues: 1,
        value: '£245',
        status: 'in-progress',
      },
    ] satisfies TodayRound[],
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
      customer: { label: 'Customer / Property' },
      serviceType: { label: 'Service Type' },
      date: { label: 'Date' },
      time: { label: 'Time' },
      price: { label: 'Price' },
      technician: { label: 'Technician' },
      paymentMethod: { label: 'Payment Method' },
      notes: { label: 'Notes', placeholder: 'Add any special instructions or notes...' },
    },
    notice: {
      title: 'One-off job',
      body: "This job will not be added to regular rounds and won't recur automatically",
    },
    actions: {
      cancel: 'Cancel',
      create: 'Create One-Off Visit',
    },
    defaults: {
      customerId: '12-market-street',
      serviceTypeId: 'window-cleaning',
      date: '2025-08-03',
      time: '09:00',
      price: '45.00',
      technicianId: 'assign-later',
      paymentMethodId: 'cash',
      notes: '',
    },
    customers: [
      { id: '12-market-street', label: '12 Market Street - John Smith' },
      { id: '14-high-street', label: '14 High Street - John Smith' },
      { id: '9-river-lane', label: '9 River Lane - Alice Cooper' },
      { id: '22-park-view', label: '22 Park View - Sarah Jones' },
    ] satisfies OneOffJobCustomerOption[],
    serviceTypes: [
      { value: 'window-cleaning', label: 'Window Cleaning' },
      { value: 'gutter-cleaning', label: 'Gutter Cleaning' },
      { value: 'conservatory', label: 'Conservatory Clean' },
      { value: 'pressure-washing', label: 'Pressure Washing' },
    ] satisfies OneOffJobSelectOption[],
    technicians: [
      { value: 'assign-later', label: 'Assign later' },
      { value: 'james', label: 'James' },
      { value: 'sarah', label: 'Sarah' },
    ] satisfies OneOffJobSelectOption[],
    paymentMethods: [
      { value: 'cash', label: 'Cash' },
      { value: 'card', label: 'Card' },
      { value: 'bank-transfer', label: 'Bank Transfer' },
      { value: 'direct-debit', label: 'Direct Debit' },
    ] satisfies OneOffJobSelectOption[],
  },
} as const
