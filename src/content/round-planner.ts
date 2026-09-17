import type { DashboardTone } from '@/content/dashboard'
import type { PlannerDayStatus, PlannerPeriod, PlannerStatusFilter } from '@/features/rounds/lib/planner'

export type RoundPlannerView = 'calendar' | 'map' | 'list'

export interface RoundPlannerMetric {
  label: string
  value: string
  tone?: DashboardTone
  /** Shown as a suffix hint, e.g. "est." for the duration heuristic. */
  hint?: string
}

export interface RoundPlannerSelectOption {
  value: string
  label: string
}

export interface RoundPlannerWeatherHoldOption {
  id: string
  title: string
  description: string
}

export interface RoundPlannerMessageTemplate {
  value: string
  label: string
  body: string
}

/** Visit statuses returned on planner stops. */
export type PlannerVisitStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'

export const plannerDayStatusLabels: Record<PlannerDayStatus, string> = {
  not_started: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const plannerVisitStatusLabels: Record<PlannerVisitStatus, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
}

export const roundPlannerContent = {
  header: {
    title: 'Round Planner',
    subtitle: 'Manage cleaning rounds, properties, technicians, and visit schedules',
    cyclePrefix: 'Cycle:',
    weekPrefix: 'Week:',
    syncLabel: 'Refresh planner',
    previousPeriod: 'Previous period',
    nextPeriod: 'Next period',
    today: 'Today',
  },
  views: [
    { id: 'calendar', label: 'Calendar' },
    { id: 'map', label: 'Map' },
    { id: 'list', label: 'List' },
  ] satisfies { id: RoundPlannerView; label: string }[],
  filters: {
    round: { label: 'Round', allLabel: 'All rounds' },
    period: {
      label: 'Period',
      options: [
        { value: 'week', label: 'Week' },
        { value: 'cycle', label: 'Cycle' },
      ] satisfies { value: PlannerPeriod; label: string }[],
    },
    search: { label: 'Search', placeholder: 'Search property, customer, postcode...' },
    technician: {
      label: 'Technician',
      allLabel: 'All technicians',
      unavailableOnCalendar: 'Technician filter applies to List and Map views only',
    },
    status: {
      label: 'Status',
      options: [
        { value: 'all', label: 'All statuses' },
        { value: 'not_started', label: 'Scheduled' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'completed', label: 'Completed' },
      ] satisfies { value: PlannerStatusFilter; label: string }[],
    },
  },
  actions: {
    addRound: 'Add Round',
  },
  kpis: {
    totalStops: 'Total Stops',
    roundValue: 'Round Value',
    estimatedDuration: 'Estimated Duration',
    estimatedHint: 'est.',
    completion: 'Completion',
    paymentHolds: 'Payment Holds',
    issues: 'Issues',
  },
  states: {
    loading: 'Loading planner…',
    error: 'Could not load the planner.',
    retry: 'Try again',
    noRounds: 'No rounds yet',
    noRoundsHint: 'Create a round to start planning visits.',
    noVisitsInWindow: 'No visits in this period',
    noVisitsHint:
      'Visits are generated during setup or added as one-off jobs. Adding a property or round on its own does not create visits.',
  },
  calendar: {
    emptyLabel: 'No rounds',
    dayHeaders: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    stops: 'stops',
    unassigned: 'Unassigned',
  },
  detailPanel: {
    metrics: {
      totalStops: 'Total Stops',
      roundValue: 'Round Value',
      completed: 'Completed',
      estimatedTime: 'Estimated Time',
    },
    paymentHold: 'payment hold',
    paymentHolds: 'payment holds',
    propertiesTitle: 'Stops',
    noStops: 'No stops on this date.',
    loadingStops: 'Loading stops…',
    technicianUnassigned: 'Unassigned',
    actions: {
      openMap: 'Open in Map View',
      openList: 'Open in List View',
      message: 'Message',
      weatherHold: 'Weather Hold',
    },
  },
  weatherHoldModal: {
    title: 'Weather Hold',
    subtitle: 'Postpone round due to weather',
    fields: {
      round: 'Round',
      weatherCondition: 'Weather Condition',
      rescheduling: 'Rescheduling',
      notifyCustomers: 'Notify customers',
    },
    statusLabel: 'Scheduled',
    conditions: [
      { value: 'heavy-rain', label: 'Heavy rain' },
      { value: 'high-winds', label: 'High winds' },
      { value: 'snow-ice', label: 'Snow / ice' },
      { value: 'technician-safety', label: 'Technician safety' },
    ] satisfies RoundPlannerSelectOption[],
    reschedulingOptions: [
      {
        id: 'next-available',
        title: 'Next available date',
        description: 'Schedule for tomorrow or next working day',
      },
      {
        id: 'next-cycle',
        title: 'Add to next round cycle',
        description: 'Merge with next scheduled occurrence',
      },
      {
        id: 'manual',
        title: 'Manual rescheduling',
        description: "I'll reschedule later",
      },
    ] satisfies RoundPlannerWeatherHoldOption[],
    messagePreview:
      "Hi {customer_name}, due to heavy rain we've postponed today's window cleaning. We'll reschedule for the next available date. Thanks for understanding!",
    messageMeta: '147 characters · 1 SMS per customer',
    affectedJobsLabel: 'jobs will be affected',
    affectedJobsDescription: 'All scheduled visits for this round will be postponed',
    actions: {
      cancel: 'Cancel',
      apply: 'Apply Weather Hold',
    },
    successToast: 'Applied Weather Hold successfully',
  },
  messageCustomersModal: {
    title: 'Message Customers',
    subtitle: 'Send SMS or WhatsApp to your customers',
    recipientAction: 'Change',
    fields: {
      template: 'Message Template',
      message: 'Message',
      variables: 'Available variables:',
      filters: 'Recipient Filters',
      sendOptions: 'Send Options',
      channel: 'Channel',
    },
    templates: [
      {
        value: 'appointment-reminder',
        label: 'Appointment Reminder',
        body: "Hi {customer_name}, this is a reminder that we'll be cleaning your windows tomorrow between 9am-3pm.\nPlease ensure we have access.\nThanks!",
      },
      {
        value: 'weather-delay',
        label: 'Weather Delay',
        body: "Hi {customer_name}, due to weather conditions we've had to reschedule your clean. We'll confirm the new date shortly. Thanks for understanding!",
      },
      {
        value: 'payment-reminder',
        label: 'Payment Reminder',
        body: 'Hi {customer_name}, this is a friendly reminder that payment of {amount} is due for your recent window clean. Thanks!',
      },
    ] satisfies RoundPlannerMessageTemplate[],
    variables: ['{customer_name}', '{property_address}', '{date}', '{time_window}', '{amount}', '{technician}'],
    filters: {
      excludePaymentHold: 'Exclude payment hold customers',
    },
    sendOptions: [
      {
        id: 'now',
        title: 'Send now',
        description: 'Messages will be sent immediately',
      },
      {
        id: 'schedule',
        title: 'Schedule for later',
        description: '',
      },
    ] satisfies RoundPlannerWeatherHoldOption[],
    channels: ['SMS', 'WhatsApp'],
    creditPricePerSms: 0.1,
    meta: {
      smsCredit: '1 SMS credit',
      totalPrefix: 'Total:',
      credits: 'credits',
    },
    actions: {
      cancel: 'Cancel',
      send: 'Send to {count} Customers',
    },
    successToast: 'Message sent successfully',
  },
  mapView: {
    propertiesTitle: 'Stops',
    noProperties: 'No stops on this date.',
    legendTitle: 'Status Legend',
    legend: [
      { label: 'Scheduled', status: 'scheduled' },
      { label: 'Completed', status: 'completed' },
      { label: 'Payment Hold', status: 'payment-hold' },
      { label: 'Issue', status: 'issue' },
    ],
    notConfigured: {
      badge: 'Setup needed',
      title: 'Google Maps isn’t configured',
      description:
        'Add VITE_GOOGLE_MAPS_API_KEY to your environment to enable the map. Use List view to see all stops for the day in the meantime.',
    },
    loading: 'Locating stops…',
    error: 'Could not load Google Maps.',
    unresolvedTitle: 'Could not locate',
    unresolvedHint: 'Check the address and postcode for these stops.',
  },
  listView: {
    actions: {
      bulkMessage: 'Bulk Message Round',
      addOneOffJob: 'Add One-off Job',
      previousDay: 'Previous day',
      nextDay: 'Next day',
    },
    dateLabel: 'Date',
    columns: {
      property: 'Property / Customer',
      round: 'Round',
      price: 'Price',
      status: 'Status',
      technician: 'Technician',
      completedAt: 'Completed',
      action: 'Action',
    },
    emptyLabel: 'No stops match the selected filters.',
    noVisits: 'No visits on this date.',
    routeOrderHint: 'Stops are listed in route order.',
    badges: {
      paymentHold: 'Payment hold',
      issue: 'Issue',
    },
    details: {
      title: 'Details',
      postcode: 'Postcode',
      propertyName: 'Property',
      completedAt: 'Completed at',
      issues: 'Issues',
      noIssues: 'No issues reported.',
      viewFull: 'View Full Details',
    },
    unassigned: 'Unassigned',
  },
  defaults: {
    roundId: 'all',
    period: 'week' as PlannerPeriod,
    technicianId: 'all',
    statusId: 'all' as PlannerStatusFilter,
    view: 'calendar' as RoundPlannerView,
    search: '',
  },
} as const
