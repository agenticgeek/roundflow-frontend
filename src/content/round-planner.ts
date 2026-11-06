import type { VisitStatus } from '@/lib/visit-status'
import type { WeatherCondition, WeatherRescheduling } from '@/api/rounds.api'
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

/** Visit statuses returned on planner stops. */
export type PlannerVisitStatus = VisitStatus

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
  CANCELLED: 'Cancelled',
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
    subtitle: 'Postpone this round-day because of the weather and tell customers',
    fields: {
      round: 'Round',
      weatherCondition: 'Weather Condition',
      rescheduling: 'Rescheduling',
      notifyCustomers: 'Notify customers',
    },
    /** Values are the API's `condition` enum. */
    conditions: [
      { value: 'heavy-rain', label: 'Heavy rain' },
      { value: 'high-winds', label: 'High winds' },
      { value: 'snow-ice', label: 'Snow / ice' },
      { value: 'technician-safety', label: 'Technician safety' },
    ] satisfies { value: WeatherCondition; label: string }[],
    /** Ids are the API's `rescheduling` enum. */
    reschedulingOptions: [
      {
        id: 'next-available',
        title: 'Next available date',
        description: 'Move the visits to the next working day',
      },
      {
        id: 'next-cycle',
        title: 'Add to next round cycle',
        description: 'Move each visit to its next regular visit date',
      },
      {
        id: 'manual',
        title: 'Manual rescheduling',
        description: "Take the visits off the list — I'll book new dates later",
      },
    ] satisfies (RoundPlannerWeatherHoldOption & { id: WeatherRescheduling })[],
    notifyHint: 'Message affected customers about the delay and their new date',
    messageMeta: '{count} characters',
    previewLoading: 'Loading preview…',
    previewError: 'Could not load the preview.',
    noMessage: 'No scheduled visits on this date, so there is nothing to hold.',
    optedOut: '{count} opted out of messages — they will not be contacted',
    newDate: 'New date: {date}',
    newDateManual: 'No new date — the visits are marked as skipped',
    affectedJobsLabel: 'visits will be affected',
    affectedJobsLabelOne: 'visit will be affected',
    affectedJobsDescription: 'Scheduled visits for this round on this date will be postponed',
    actions: {
      cancel: 'Cancel',
      done: 'Done',
      apply: 'Apply hold',
      applyNotify: 'Hold & notify customers',
      applying: 'Applying…',
    },
    successToast: 'Weather hold applied',
    result: {
      held: '{count} visits held',
      heldOne: '1 visit held',
      moved: ' · moved to {date}',
      skipped: ' · marked as skipped',
      notNotified: 'Customers were not notified.',
      notMessaged: 'Not messaged',
      notifyFailed: 'The hold was applied, but customers could not be notified: {error}',
    },
  },
  rescheduleModal: {
    title: 'Reschedule visit',
    subtitle: '{address}',
    action: 'Reschedule',
    dateLabel: 'New date',
    hint: 'The visit goes back on the list for that day and its reminders are re-queued.',
    pastDate: 'Pick today or a later date.',
    cancel: 'Cancel',
    save: 'Reschedule',
    saving: 'Saving…',
    toast: 'Visit rescheduled',
  },
  messageCustomersModal: {
    title: 'Message Customers',
    subtitle: 'Send SMS or WhatsApp to your customers',
    recipientAction: 'Change',
    recipientsLoading: 'Counting recipients…',
    recipientsError: 'Could not load recipients',
    unreachable: '{count} more won’t be messaged (opted out or no contact details on this channel)',
    noRecipients: 'No recipients to message.',
    fields: {
      template: 'Message Template',
      message: 'Message',
      variables: 'Available variables:',
      filters: 'Recipient Filters',
      sendOptions: 'Send Options',
      channel: 'Channel',
      sendAt: 'Send at',
    },
    customTemplate: 'Write my own',
    templatesLoading: 'Loading templates…',
    messagePlaceholder: 'Write a message, or pick a template above',
    variablesHint: 'Variables are filled in for each customer when the message is sent.',
    variables: [
      '{{customerName}}',
      '{{firstName}}',
      '{{address}}',
      '{{date}}',
      '{{amount}}',
      '{{technicianName}}',
    ],
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
        description: 'Messages are queued and sent at the time you pick',
      },
    ] satisfies RoundPlannerWeatherHoldOption[],
    scheduleInPast: 'Pick a time in the future.',
    channels: ['Email', 'SMS', 'WhatsApp'],
    meta: {
      characters: '{count} characters',
    },
    actions: {
      cancel: 'Cancel',
      done: 'Done',
      send: 'Send to {count} Customers',
      schedule: 'Schedule for {count} Customers',
    },
    result: {
      notMessaged: 'Not messaged',
    },
    successToast: 'Message sent successfully',
    scheduledToast: 'Message scheduled',
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
    unresolvedTitle: 'No pin yet',
    unresolvedHint: 'These stops have no coordinates yet. New properties and postcode changes can take up to 15 minutes to appear — refresh later, or check the postcode.',
    navigate: 'Navigate',
    /** Map date controls — the same day picker as the List, plus a whole-week view (GAP-023). */
    controls: {
      modeLabel: 'Show',
      day: 'Day',
      week: 'Week',
      previousDay: 'Previous day',
      nextDay: 'Next day',
      previousWeek: 'Previous week',
      nextWeek: 'Next week',
      dateLabel: 'Date',
      weekOf: 'Week of {date}',
    },
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

/** Round Planner → Assign technicians (opened from "You're live" after setup). */
export const assignTechniciansContent = {
  pageTitle: 'Round Planner',
  breadcrumb: { root: 'Round Planner', current: 'Assign technicians' },
  heading: 'Assign technicians',
  subheading: 'Upcoming visits with no technician. Assign per round — several technicians can share one.',
  info: 'Assignments apply to these visits only. Each new cycle starts unassigned and appears in the Round Planner’s “Upcoming recurrences” alert.',
  filters: {
    area: 'Service area',
    allAreas: 'All areas',
    areaOption: '{area} ({rounds} rounds · {unassigned} unassigned)',
    areaOptionNoRounds: '{area} (no rounds)',
    range: 'Visits in',
    onlyUnassigned: 'Only rounds needing a technician',
    hint: 'Choosing an area shows only its rounds.',
  },
  ranges: [
    { value: '7', label: 'Next 7 days' },
    { value: '14', label: 'Next 14 days' },
    { value: '28', label: 'Next 4 weeks' },
  ],
  round: {
    meta: '{date} · {visits} visits · {area}',
    noVisits: 'No visits in this period',
    assigned: 'Assigned · {count}/{count}',
    unassigned: 'Unassigned · 0/{count}',
    technicians: 'Technicians',
    suggested: 'Technicians (suggested: cover {area})',
    noTechnicians: 'No technicians yet — add them in Settings.',
    oneDoesAll: 'One technician does all jobs',
    split: { label: 'Split jobs between them', description: 'Each technician takes a share of the streets' },
    warning: 'Pick at least one technician before {date}, or these visits won’t appear in anyone’s app.',
    reviewSplit: 'Review job split →',
  },
  empty: 'No rounds match these filters.',
  steps: ['Choose technicians', 'Split jobs', 'Review'],
  stepOf: 'Step {current} of {total}',
  choose: {
    noChanges: 'Pick a technician for at least one round to continue.',
  },
  splitStep: {
    title: 'How should they share the work?',
    subtitle: 'Only rounds with two or more technicians need a choice.',
    nothing: 'Every round has one technician — nothing to split. Continue to review.',
    /** GAP-012: the split is real — each technician only sees their own properties in the app. */
    note: 'Each technician only sees their own properties in the app. Future visits follow this split.',
    modes: {
      SINGLE: { title: 'One technician does all jobs', description: 'The others are taken off this round.' },
      AUTO: { title: 'Split automatically', description: 'Balanced by the value of each property’s plan.' },
      MANUAL: { title: 'Choose per property', description: 'Pick a technician for every property.' },
    },
    singleLabel: 'Who does all the jobs?',
    manualProperty: 'Property',
    manualTechnician: 'Technician',
    manualPick: 'Choose technician',
    manualLoading: 'Loading properties…',
    manualEmpty: 'This round has no properties yet.',
    manualUnassigned: '{count} properties still need a technician.',
    manualUnassignedOne: '1 property still needs a technician.',
    balance: 'Balance',
    allocationLine: '{stops} stops · {value}',
    allocationLoading: 'Working out the split…',
    allocationVisits: '{count} upcoming visits will follow this split.',
  },
  review: {
    title: 'Check and save',
    subtitle: '{count} rounds will be updated.',
    subtitleOne: '1 round will be updated.',
    round: 'Round',
    technicians: 'Technicians',
    firstVisit: 'First visit',
    howShared: 'Sharing',
    allocation: 'Stops and value',
    oneDoesAll: 'One does all jobs',
    split: 'Split automatically',
    manual: 'Chosen per property',
    single: '—',
    removed: 'No technician',
    edit: 'Edit',
  },
  done: {
    title: 'Technicians assigned',
    body: '{rounds} rounds now have a technician, covering {visits} upcoming visits.',
    bodyOne: '1 round now has a technician, covering {visits} upcoming visits.',
    dashboard: 'Go to dashboard',
    planner: 'Back to Round Planner',
  },
  footer: {
    back: 'Back',
    backToPlanner: 'Round Planner',
    progress: '{assigned} of {total} rounds assigned',
    skip: 'Skip — assign later',
    continue: 'Continue',
    save: 'Save assignments',
    saving: 'Saving…',
  },
  toasts: { saved: 'Assignments saved', failed: 'Some assignments couldn’t be saved' },
  /** Shown on Review when a save fails — `{rounds}`: the rounds that failed, `{error}`: the server's message. */
  saveFailed: '{rounds}: {error}',
  loadError: 'Could not load rounds.',
  retry: 'Retry',
} as const

/** FLOW-02: what saving a round's technicians did to its visits. `{count}`, `{date}` are filled in. */
export const assignResultContent = {
  title: 'What this did to the visits',
  updated: '{count} upcoming visits now have this technician.',
  updatedOne: '1 upcoming visit now has this technician.',
  generated: '{count} new visits were created.',
  generatedOne: '1 new visit was created.',
  nextVisit: 'Next visit: {date}.',
  overridden: '{count} visits you assigned by hand were left as they are.',
  overriddenOne: '1 visit you assigned by hand was left as it is.',
  noVisitsWarning:
    'No visits exist yet for this round, so nothing shows in the technician’s app until the next visit is generated on {date}.',
  noVisitsWarningNoDate:
    'No visits exist yet for this round and none are due to be generated. Check that the round has properties with an active plan.',
  toastNoVisitsMany: '{count} rounds have no visits yet, so nothing shows in the technicians’ apps for them.',
  toastTotals: '{updated} visits updated, {generated} created.',
} as const

/**
 * A technician who hasn't accepted their invite can't be assigned (the API answers 400) —
 * shown disabled wherever technicians are picked, with a way to resend the invite (GAP-011).
 */
export const pendingInviteContent = {
  badge: 'Invite pending',
  hint: 'Can’t be assigned until they accept their app invite.',
  resend: 'Resend invite',
  resending: 'Sending…',
  resent: 'Invite resent to {name}',
  noEmail: 'Add an email to this technician before inviting them.',
} as const

/** Banner on the Round Planner when an active round with upcoming visits has no technician. */
export const unassignedRoundsAlertContent = {
  /** `{count}` visits — over the window below. */
  titleOne: '1 upcoming visit has no technician',
  titleMany: '{count} upcoming visits have no technician',
  /** Shown instead when the soonest affected round is today or tomorrow. */
  urgentTitle: '{round} is {when} and has no technician',
  urgentDetail: 'Its {count} visits won’t appear in anyone’s app until someone is assigned.',
  roundLine: '{round} · {date}',
  moreRounds: ' — and {count} more round',
  moreRoundsPlural: ' — and {count} more rounds',
  today: 'today',
  tomorrow: 'tomorrow',
  windowHint: 'Next 2 weeks',
  assign: 'Assign technicians',
  showRound: 'Show on planner',
} as const

/** Reassign technician modal additions (GAP-013) — the base copy lives in todays-work content. */
export const reassignContent = {
  unassignedFrom: 'Unassigned visits',
  unassignedHint: 'No technician is on these visits yet — they will all move to the technician you pick.',
  permanent: 'Make permanent',
  permanentHint: 'Also move these properties to the new technician, so future visits follow.',
  updatedOne: '1 job updated.',
  updatedMany: '{count} jobs updated.',
} as const

/** Planner stop chip for a customer on payment hold (GAP-026). */
export const plannerHoldContent = { onHold: 'On hold' } as const

/** Calendar card → assign a technician to an unassigned round without leaving the planner. */
export const quickAssignContent = {
  cardAction: 'Assign technician',
  title: 'Assign technician',
  subtitle: '{round} · {date} · {stops} stops',
  pick: 'Who’s doing this round?',
  hint: 'Pick more than one to share it. You can change this any time.',
  covers: 'Covers {area}',
  rounds: '{count} rounds',
  roundsOne: '1 round',
  noTechnicians: 'No technicians yet — add them on the Technicians page.',
  addTechnicians: 'Go to Technicians',
  loadError: 'Could not load technicians.',
  cancel: 'Cancel',
  save: 'Assign',
  saveMany: 'Assign {count}',
  toast: '{name} assigned to {round}',
  toastMany: '{count} technicians assigned to {round}',
  failed: 'Couldn’t assign technicians. Try again.',
} as const
