import type { DashboardTone } from '@/content/dashboard'

export type TodaysWorkRoundStatus = 'in-progress' | 'completed' | 'scheduled'

export type TechnicianWorkloadStatus = 'on-track' | 'completed' | 'attention'

export interface TodaysWorkMetric {
  label: string
  value: string
  tone?: DashboardTone
}

export interface TodaysWorkRound {
  id: string
  status: TodaysWorkRoundStatus
  round: string
  technician: string
  technicianInitial: string
  progressCompleted: number
  progressTotal: number
  completed: number
  skipped: number
  issues: number
  paymentHolds: number
  value: string
  eta: string
  jobs: TodaysWorkJob[]
}

export type TodaysWorkJobStatus = 'completed' | 'skipped' | 'scheduled' | 'in-progress'

export interface TodaysWorkJob {
  id: string
  customer: string
  address: string
  status: TodaysWorkJobStatus
  paymentHold?: boolean
  issueNote?: string
}

export interface TechnicianWorkloadItem {
  id: string
  name: string
  initial: string
  summary: string
  roundLabel: string
  statusLabel: string
  status: TechnicianWorkloadStatus
  issuesCount?: number
}

export type ReassignApplyToId = 'remaining' | 'all'

export interface ReassignApplyToOption {
  id: ReassignApplyToId
  title: string
  description: string
}

export interface TodaysWorkSelectOption {
  value: string
  label: string
}

export interface PushMissedJobsQuickSelectOption {
  id: string
  label: string
  date: string
}

export type CloseDayUnfinishedOptionId = 'push-to-tomorrow' | 'mark-as-skipped'

export interface CloseDayUnfinishedOption {
  id: CloseDayUnfinishedOptionId
  title: string
  description: string
}

export type CloseDaySummaryCardTone = 'primary' | 'warning' | 'danger' | 'default'

export interface CloseDaySummaryCard {
  id: string
  label: string
  value: string
  tone: CloseDaySummaryCardTone
  icon?: 'check-circle' | 'x-circle' | 'alert-circle'
}

export const todaysWorkContent = {
  header: {
    title: "Today's Work",
    subtitle: 'Monitor live round progress and technician activity',
    date: 'Monday 18 May 2026',
    liveLabel: 'LIVE',
    lastUpdated: 'Updated 18:10',
    refreshLabel: "Refresh today's work",
    closeDay: 'Close Day',
  },
  metrics: [
    { label: 'Scheduled Stops', value: '10' },
    { label: 'In Progress', value: '2', tone: 'primary' },
    { label: 'Completed', value: '7', tone: 'success' },
    { label: 'Skipped', value: '2', tone: 'warning' },
    { label: 'Issues', value: '2', tone: 'danger' },
    { label: 'Payment Holds', value: '2', tone: 'warning' },
    { label: 'Value Completed', value: '£214' },
  ] satisfies TodaysWorkMetric[],
  filters: {
    search: {
      label: 'Search',
      placeholder: 'Search technician, property, or round...',
    },
    showOnlyProblems: 'Show only problems',
  },
  table: {
    columns: {
      status: 'Status',
      round: 'Round',
      technician: 'Technician',
      progress: 'Progress',
      completed: 'Completed',
      skipped: 'Skipped',
      issues: 'Issues',
      paymentHolds: 'Payment Holds',
      value: 'Value',
      eta: 'ETA',
      actions: 'Actions',
    },
    emptyLabel: 'No rounds match the selected filters.',
  },
  workload: {
    title: 'Technician Workload',
  },
  statusLabels: {
    'in-progress': 'In progress',
    completed: 'Completed',
    scheduled: 'Scheduled',
  },
  detailPanel: {
    progress: 'Progress',
    progressMeta: '{completed}/{total} completed',
    summary: {
      completed: 'Completed',
      skipped: 'Skipped',
      issues: 'Issues',
    },
    jobsTitle: 'Jobs',
    paymentHold: 'Payment Hold',
    actions: {
      reassignTechnician: 'Reassign Technician',
      pushMissedJobs: 'Push Missed Jobs',
    },
    jobStatusLabels: {
      completed: 'Completed',
      skipped: 'Skipped',
      scheduled: 'Scheduled',
      'in-progress': 'In progress',
    },
  },
  reassignTechnicianModal: {
    title: 'Reassign Technician',
    subtitle: 'Reassign remaining jobs from {technician} to another technician',
    fields: {
      round: 'Round',
      currentTechnician: 'Current Technician',
      newTechnician: 'New Technician',
      applyTo: 'Apply to',
      note: 'Note (Optional)',
      notePlaceholder: 'Add a note about this reassignment…',
      notifyTechnician: 'Notify new technician of reassignment',
    },
    applyToOptions: [
      {
        id: 'remaining',
        title: 'Remaining jobs only',
        description: 'Only move uncompleted jobs to the new technician',
      },
      {
        id: 'all',
        title: 'All jobs',
        description: 'Move all jobs including completed ones',
      },
    ] satisfies ReassignApplyToOption[],
    jobsAffected: {
      title: 'Jobs Affected',
      jobsLabel: '{count} jobs',
    },
    infoAlert:
      'The new technician will receive these jobs in their schedule. Completed jobs stay with the original technician when using remaining jobs only.',
    technicianOptions: [
      { value: 'james', label: 'James' },
      { value: 'sarah', label: 'Sarah' },
    ] satisfies TodaysWorkSelectOption[],
    actions: {
      cancel: 'Cancel',
      confirm: 'Reassign Jobs',
    },
    successToast: 'Technician reassigned successfully',
  },
  pushMissedJobsModal: {
    title: 'Push Missed Jobs',
    subtitle: 'Move unfinished jobs to another date and optionally notify customers',
    fields: {
      round: 'Round',
      newDate: 'New Date',
      quickSelect: 'Quick Select',
      reason: 'Reason',
      assignTechnician: 'Assign Technician (Optional)',
      notifyCustomers: 'Notify customers',
      messagePreview: 'Message Preview',
    },
    missedJobs: {
      title: 'Missed Jobs',
      jobsLabel: '{count} jobs',
      description: 'These jobs will be moved to the new date.',
    },
    quickSelectOptions: [
      { id: 'tomorrow', label: 'Tomorrow', date: '19/05/2026' },
      { id: 'next-week', label: 'Next Week', date: '25/05/2026' },
      { id: 'next-month', label: 'Next Month', date: '18/06/2026' },
    ] satisfies PushMissedJobsQuickSelectOption[],
    reasons: [
      { value: '', label: 'Select Reason (Weather Conditions…)' },
      { value: 'weather', label: 'Weather Conditions' },
      { value: 'access', label: 'Access Issues' },
      { value: 'technician', label: 'Technician Unavailable' },
      { value: 'customer', label: 'Customer Request' },
    ] satisfies TodaysWorkSelectOption[],
    technicianOptions: [
      { value: 'keep', label: 'Keep current technician' },
      { value: 'james', label: 'James' },
      { value: 'sarah', label: 'Sarah' },
    ] satisfies TodaysWorkSelectOption[],
    messageMeta: '{characters} characters · {credits} SMS credits',
    recipientsMeta: 'Will be sent to {count} customers',
    warning:
      "All selected jobs will be removed from today's schedule and added to the new date. Make sure the selected date has capacity for these additional jobs.",
    defaults: {
      newDate: '24/03/2026',
      reason: '',
      assignTechnician: 'keep',
      message: '',
    },
    actions: {
      cancel: 'Cancel',
      confirm: 'Move Jobs',
    },
    successToast: 'Missed jobs moved successfully',
  },
  closeOperationalDayModal: {
    title: 'Close Operational Day',
    subtitle: "Review today's summary and finalize",
    closingDateLabel: 'Closing: {date}',
    summaryTitle: "Today's Summary",
    summaryCards: [
      { id: 'completed', label: 'Completed Jobs', value: '5', tone: 'primary', icon: 'check-circle' },
      { id: 'skipped', label: 'Skipped Jobs', value: '1', tone: 'warning', icon: 'x-circle' },
      { id: 'outstanding', label: 'Outstanding', value: '7', tone: 'danger', icon: 'alert-circle' },
      { id: 'issues', label: 'Issues', value: '2', tone: 'default' },
      { id: 'payment-holds', label: 'Payment Holds', value: '2', tone: 'default' },
      { id: 'revenue', label: 'Revenue', value: '£178', tone: 'default' },
    ] satisfies CloseDaySummaryCard[],
    unfinishedJobs: {
      title: 'What to do with {count} unfinished jobs?',
      options: [
        {
          id: 'push-to-tomorrow',
          title: 'Push to tomorrow',
          description: "Move all unfinished jobs to tomorrow's schedule",
        },
        {
          id: 'mark-as-skipped',
          title: 'Mark as skipped',
          description: 'Record unfinished jobs as skipped for today',
        },
      ] satisfies CloseDayUnfinishedOption[],
      pushConfirmation: '→ {count} jobs added to {schedule} for {technician}',
      pushSchedule: 'Tuesday 19 May',
      technician: 'James',
      count: 7,
    },
    alerts: {
      unfinished:
        'You have {count} unfinished jobs. Please decide how to handle them before closing the day.',
      issues: 'There are {count} active issues that may need follow-up.',
    },
    reviewInfo: {
      title: 'What happens when you close the day?',
      items: [
        'A close-of-day summary will be generated',
        'All technicians will be notified of completion',
        'Revenue and statistics will be finalized',
        "System will prepare for tomorrow's operations",
      ],
    },
    confirm: {
      unfinishedLabels: {
        'push-to-tomorrow': 'Push to Tomorrow',
        'mark-as-skipped': 'Marked as Skipped',
      } satisfies Record<CloseDayUnfinishedOptionId, string>,
      rows: {
        unfinishedJobs: 'Unfinished jobs',
        completedToday: 'Completed today',
        revenueEarned: 'Revenue earned',
        activeIssues: 'Active issues',
      },
      completedToday: '1 job',
      revenue: '£178',
      activeIssues: '2 — require follow-up',
      infoTitle: 'What happens when you confirm?',
      infoItems: [
        'A close-of-day summary report will be generated',
        'All technicians will be notified of completion',
        'Revenue and stats will be finalised',
        "System will prepare tomorrow's operations",
      ],
      warning:
        'This action cannot be undone. The operational day will be permanently closed.',
    },
    actions: {
      cancel: 'Cancel',
      closeDay: 'Close Operational Day',
      pushToTomorrow: 'Push to tomorrow',
      markAsSkipped: 'Mark as skipped',
    },
    successToast: 'Operational day closed successfully',
  },
  rounds: [
    {
      id: 'tw-alnwick-mon',
      status: 'in-progress',
      round: 'Alnwick Monday',
      technician: 'James',
      technicianInitial: 'J',
      progressCompleted: 2,
      progressTotal: 5,
      completed: 2,
      skipped: 1,
      issues: 1,
      paymentHolds: 1,
      value: '£94',
      eta: '14:30',
      jobs: [
        { id: 'job-mon-1', customer: 'John Smith', address: '12 Market Street', status: 'completed' },
        { id: 'job-mon-2', customer: 'Mary Johnson', address: '45 Bondgate Within', status: 'completed' },
        {
          id: 'job-mon-3',
          customer: 'Robert Williams',
          address: '78 Narrowgate',
          status: 'completed',
          paymentHold: true,
        },
        {
          id: 'job-mon-4',
          customer: 'Sarah Brown',
          address: '23 Bailiffgate',
          status: 'skipped',
          issueNote: 'Gate locked - no access',
        },
        { id: 'job-mon-5', customer: 'David Miller', address: '56 Fenkle Street', status: 'scheduled' },
      ],
    },
    {
      id: 'tw-alnwick-tue',
      status: 'completed',
      round: 'Alnwick Tuesday',
      technician: 'Sarah',
      technicianInitial: 'S',
      progressCompleted: 5,
      progressTotal: 5,
      completed: 5,
      skipped: 1,
      issues: 1,
      paymentHolds: 1,
      value: '£120',
      eta: '—',
      jobs: [
        { id: 'job-tue-1', customer: 'John Smith', address: '12 Market Street', status: 'completed' },
        { id: 'job-tue-2', customer: 'Mary Johnson', address: '45 Bondgate Within', status: 'completed' },
        {
          id: 'job-tue-3',
          customer: 'Robert Williams',
          address: '78 Narrowgate',
          status: 'completed',
          paymentHold: true,
        },
        {
          id: 'job-tue-4',
          customer: 'David Miller',
          address: '56 Fenkle Street',
          status: 'completed',
          issueNote: 'Gate locked - no access',
        },
        { id: 'job-tue-5', customer: 'Alice Cooper', address: '2 Castle View', status: 'completed' },
      ],
    },
    {
      id: 'tw-morpeth-wed',
      status: 'in-progress',
      round: 'Morpeth Wednesday',
      technician: 'James',
      technicianInitial: 'J',
      progressCompleted: 1,
      progressTotal: 3,
      completed: 1,
      skipped: 1,
      issues: 1,
      paymentHolds: 1,
      value: '£68',
      eta: '16:00',
      jobs: [
        { id: 'job-wed-1', customer: 'John Smith', address: '12 Market Street', status: 'completed' },
        {
          id: 'job-wed-2',
          customer: 'Mary Johnson',
          address: '45 Bondgate Within',
          status: 'skipped',
          issueNote: 'Customer unavailable',
        },
        {
          id: 'job-wed-3',
          customer: 'Robert Williams',
          address: '78 Narrowgate',
          status: 'scheduled',
          paymentHold: true,
        },
      ],
    },
  ] satisfies TodaysWorkRound[],
  technicians: [
    {
      id: 'wl-james-alnwick',
      name: 'James',
      initial: 'J',
      summary: '2 completed · 3 remaining',
      roundLabel: 'Alnwick Monday',
      statusLabel: 'On track',
      status: 'on-track',
      issuesCount: 1,
    },
    {
      id: 'wl-sarah',
      name: 'Sarah',
      initial: 'S',
      summary: '5 completed · 0 remaining',
      roundLabel: 'Alnwick Tuesday',
      statusLabel: 'Completed',
      status: 'completed',
    },
    {
      id: 'wl-james-morpeth',
      name: 'James',
      initial: 'J',
      summary: '1 completed · 2 remaining',
      roundLabel: 'Morpeth Wednesday',
      statusLabel: 'On track',
      status: 'on-track',
    },
  ] satisfies TechnicianWorkloadItem[],
  defaults: {
    search: '',
    showOnlyProblems: false,
  },
} as const
