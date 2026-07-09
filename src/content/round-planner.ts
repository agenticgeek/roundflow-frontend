import type { DashboardTone } from '@/content/dashboard'

export type RoundPlannerView = 'calendar' | 'map' | 'list'

export type RoundPlannerDayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'

export type RoundPlannerRoundStatus = 'in-progress' | 'completed' | 'scheduled'

export type RoundPlannerPropertyStatus = 'completed' | 'payment-hold' | 'scheduled'

export interface RoundPlannerWeek {
  id: string
  label: string
  value: string
}

export interface RoundPlannerRound {
  id: string
  title: string
  stops: number
  value: string
  technician: string
  status: RoundPlannerRoundStatus
  statusLabel: string
  completedStops: number
  estimatedTime: string
  paymentHolds: number
  properties: RoundPlannerProperty[]
}

export interface RoundPlannerProperty {
  id: string
  address: string
  customer: string
  price: string
  status: RoundPlannerPropertyStatus
}

export interface RoundPlannerDay {
  id: string
  weekId: string
  dateLabel: string
  dayOfWeek: RoundPlannerDayOfWeek
  rounds: RoundPlannerRound[]
}

export interface RoundPlannerMetric {
  label: string
  value: string
  tone?: DashboardTone
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

export type RoundPlannerListStatus = 'completed' | 'hold' | 'scheduled'

export interface RoundPlannerListItem {
  id: string
  propertyId: string
  address: string
  customer: string
  round: string
  price: string
  status: RoundPlannerListStatus
  technician: string
  lastCompleted: string
  frequency: string
  nextDue: string
  paymentStatus: 'paid' | 'hold' | 'pending'
  paymentMethod: string
  access: string
  risk?: string
}

export type RemovePropertyOptionId =
  | 'remove-from-round-only'
  | 'pause-after-visit'
  | 'move-to-another-round'
  | 'delete-recurring'

export interface RoundPlannerRemovePropertyOption {
  id: RemovePropertyOptionId
  title: string
}

export type PauseDurationId = 'date-range' | 'indefinite'

export interface RoundPlannerPauseDurationOption {
  id: PauseDurationId
  title: string
  description: string
}

const weekDays: RoundPlannerDayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

function buildWeekDays(
  weekId: string,
  mondayLabel: string,
  roundsByDay: Partial<Record<RoundPlannerDayOfWeek, RoundPlannerRound[]>>,
): RoundPlannerDay[] {
  const labels = mondayLabel.split('|')

  return weekDays.map((dayOfWeek, index) => ({
    id: `${weekId}-${dayOfWeek.toLowerCase()}`,
    weekId,
    dateLabel: labels[index] ?? '',
    dayOfWeek,
    rounds: roundsByDay[dayOfWeek] ?? [],
  }))
}

export const roundPlannerContent = {
  header: {
    title: 'Round Planner',
    subtitle: 'Manage cleaning rounds, properties, technicians, and visit schedules',
    cycleLabel: 'Cycle: 6 May – 2 June',
    syncLabel: 'Sync cycle',
  },
  views: [
    { id: 'calendar', label: 'Calendar' },
    { id: 'map', label: 'Map' },
    { id: 'list', label: 'List' },
  ] satisfies { id: RoundPlannerView; label: string }[],
  filters: {
    week: { label: 'Week' },
    area: { label: 'Area' },
    search: { label: 'Search', placeholder: 'Search property, customer, postcode...' },
    technician: { label: 'Technician' },
    status: { label: 'Status' },
  },
  actions: {
    addRound: 'Add Round',
  },
  detailPanel: {
    metrics: {
      totalStops: 'Total Stops',
      roundValue: 'Round Value',
      completed: 'Completed',
      estimatedTime: 'Estimated Time',
    },
    paymentHold: 'payment hold',
    propertiesTitle: 'Properties',
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
  removePropertyModal: {
    title: 'Remove Property from Round',
    titles: {
      'remove-from-round-only': 'Remove Property from Round',
      'pause-after-visit': 'Pause Property Service',
      'move-to-another-round': 'Move Property from Round',
      'delete-recurring': 'Delete Recurring Service',
    } satisfies Record<RemovePropertyOptionId, string>,
    fields: {
      customer: 'Customer',
      address: 'Address',
      currentRound: 'Current Round',
      price: 'Price',
      frequency: 'Frequency',
      status: 'Status',
      propertyDetails: 'Property Details',
      recurringRemoval: 'Recurring Removal',
      notifyCustomer: 'Notify customer',
      notifyCustomerDescription: 'Send SMS about the change to this customer',
      summary: 'Summary',
    },
    extension: {
      visitCreation: {
        title: 'Visit Creation',
        visitDate: 'Visit Date',
        assignedTechnician: 'Assigned Technician',
        visitStatus: 'Visit Status',
        price: 'Price',
      },
      assignRound: {
        title: 'Assign New Round',
        selectRound: 'Select Round',
      },
      notes: {
        label: 'Notes (optional)',
        placeholder: 'Add any notes…',
      },
      pause: {
        reasonForPause: 'Reason for Pause',
        pauseDuration: 'Pause Duration',
        startDate: 'Start Date',
        resumeDate: 'Resume Date',
        notifyBySms: 'Notify customer by SMS',
        notifyBySmsDescription: 'Send a message to let them know their service is paused',
        smsPreview:
          "Hi {customer_name}, we're temporarily pausing your window cleaning service as requested. We'll be in touch to reschedule when you're ready. Thanks!",
        smsMeta: '142 characters · 1 SMS',
        visitsCancelledTitle: 'Upcoming visits will be cancelled',
        visitsCancelledDescription:
          'Any scheduled visits during the pause period will not be generated. Payment collection will also be suspended.',
        reasons: [
          { value: 'customer-holiday', label: 'Customer Holiday/ Away' },
          { value: 'payment-issue', label: 'Payment issue' },
          { value: 'property-access', label: 'Property access problem' },
          { value: 'customer-request', label: 'Customer request' },
        ] satisfies RoundPlannerSelectOption[],
        durationOptions: [
          {
            id: 'date-range',
            title: 'Specific date range',
            description: 'Service will automatically resume on the end date',
          },
          {
            id: 'indefinite',
            title: 'Indefinite pause',
            description: 'Must be manually resumed — no scheduled visits will be generated',
          },
        ] satisfies RoundPlannerPauseDurationOption[],
        defaults: {
          reason: 'customer-holiday',
          startDate: '22/05/2026',
          resumeDate: '22/06/2026',
          durationId: 'date-range' as PauseDurationId,
        },
      },
      delete: {
        message:
          'This permanently deletes the recurring service plan. A final visit will still be created for the assigned technician.',
      },
    },
    deleteConfirmModal: {
      title: 'Confirm deletion',
      message: 'Are you sure you want to delete this Customer/Property from the system?',
      cancel: 'Cancel',
      confirm: 'Delete',
      successToast: 'Customer/property deleted from the system',
    },
    warning:
      'This will: create a visit for the technician, remove the property from the recurring round, and stop future recurring visits from this round.',
    visitDateLabel: '20 May 2026',
    defaults: {
      visitDate: '20 May 2026',
      visitStatus: 'scheduled',
      moveVisitDate: '20/08/2025',
      moveVisitStatus: 'completed',
    },
    visitStatuses: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'completed', label: 'Completed' },
      { value: 'skipped', label: 'Skipped' },
    ] satisfies RoundPlannerSelectOption[],
    targetRounds: [
      { value: '', label: 'Select Round' },
      { value: 'alnwick-monday', label: 'Alnwick Monday' },
      { value: 'alnwick-tuesday', label: 'Alnwick Tuesday' },
      { value: 'morpeth-wednesday', label: 'Morpeth Wednesday' },
      { value: 'bamburgh-friday', label: 'Bamburgh Friday' },
    ] satisfies RoundPlannerSelectOption[],
    technicianOptions: [
      { value: 'james', label: 'James' },
      { value: 'sarah', label: 'Sarah' },
    ] satisfies RoundPlannerSelectOption[],
    options: [
      { id: 'remove-from-round-only', title: 'Remove from this recurring round only' },
      { id: 'pause-after-visit', title: 'Pause service plan after this visit' },
      { id: 'move-to-another-round', title: 'Move to another round instead' },
      { id: 'delete-recurring', title: 'Delete recurring service completely' },
    ] satisfies RoundPlannerRemovePropertyOption[],
    summaryOutcomes: {
      'remove-from-round-only': 'Future visits stopped',
      'pause-after-visit': 'Service paused after visit',
      'move-to-another-round': 'Will move to another round',
      'delete-recurring': 'Recurring service deleted',
    } satisfies Record<RemovePropertyOptionId, string>,
    actions: {
      cancel: 'Cancel',
      confirm: {
        'remove-from-round-only': 'Remove',
        'pause-after-visit': 'Pause',
        'move-to-another-round': 'Move Round',
        'delete-recurring': 'Delete',
      } satisfies Record<RemovePropertyOptionId, string>,
    },
    successToast: 'Property removed from round',
    deleteSuccessToast: 'Customer/property deleted from the system',
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
  allWeeksOption: { value: 'all', label: 'Week' },
  weeks: [
    { id: 'week-1', value: 'week-1', label: 'Week 1 · 6–10 May' },
    { id: 'week-2', value: 'week-2', label: 'Week 2 · 13–17 May' },
    { id: 'week-3', value: 'week-3', label: 'Week 3 · 20–24 May' },
    { id: 'week-4', value: 'week-4', label: 'Week 4 · 27–31 May' },
  ] satisfies RoundPlannerWeek[],
  areas: [
    { value: 'alnwick', label: 'Alnwick' },
    { value: 'morpeth', label: 'Morpeth' },
    { value: 'bamburgh', label: 'Bamburgh' },
  ] satisfies RoundPlannerSelectOption[],
  technicians: [
    { value: 'all', label: 'Technician' },
    { value: 'james', label: 'James' },
    { value: 'sarah', label: 'Sarah' },
  ] satisfies RoundPlannerSelectOption[],
  statuses: [
    { value: 'all', label: 'Status' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'scheduled', label: 'Scheduled' },
  ] satisfies RoundPlannerSelectOption[],
  metrics: [
    { label: 'Total Stops', value: '10' },
    { label: 'Round Value', value: '£1,880' },
    { label: 'Estimated Duration', value: '13 hrs' },
    { label: 'Completion', value: '68%' },
    { label: 'Payment Holds', value: '2', tone: 'warning' },
    { label: 'Issues', value: '0', tone: 'danger' },
  ] satisfies RoundPlannerMetric[],
  calendar: {
    emptyLabel: 'No rounds',
    dayHeaders: weekDays,
  },
  mapView: {
    propertiesTitle: 'Properties',
    noProperties: 'No properties match the selected filters.',
    controls: {
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      expand: 'Expand map',
    },
    legendTitle: 'Status Legend',
    legend: [
      { label: 'Scheduled', status: 'scheduled' },
      { label: 'Completed', status: 'completed' },
      { label: 'Payment Hold', status: 'payment-hold' },
      { label: 'Issue', status: 'issue' },
    ],
    statusLabels: {
      scheduled: 'scheduled',
      completed: 'completed',
      'payment-hold': 'hold',
    },
  },
  listView: {
    actions: {
      bulkMessage: 'Bulk Message Round',
      addOneOffJob: 'Add One-off Job',
      removeProperty: 'Remove property',
    },
    columns: {
      property: 'Property / Customer',
      round: 'Round',
      price: 'Price',
      status: 'Status',
      technician: 'Technician',
      lastCompleted: 'Last Completed',
      action: 'Action',
    },
    emptyLabel: 'No properties match the selected filters.',
    details: {
      title: 'Details',
      frequency: 'Frequency',
      nextDue: 'Next Due',
      payment: 'Payment',
      method: 'Method',
      viewFull: 'View Full Details',
    },
    notes: {
      title: 'Notes',
      access: 'Access',
      risk: 'Risk',
    },
    statusLabels: {
      completed: 'Completed',
      hold: 'hold',
      scheduled: 'scheduled',
      paid: 'paid',
      pending: 'pending',
    },
    items: [
      {
        id: 'list-1',
        propertyId: '12-market-street',
        address: '12 Market Street',
        customer: 'John Smith',
        round: 'Alnwick Monday',
        price: '£35',
        status: 'completed',
        technician: 'James',
        lastCompleted: '5/6/2026',
        frequency: 'Every 4 weeks',
        nextDue: '6/3/2026',
        paymentStatus: 'paid',
        paymentMethod: 'GoCardless',
        access: 'Key under mat, side gate access',
        risk: 'Dog in back garden',
      },
      {
        id: 'list-2',
        propertyId: '45-bondgate-within',
        address: '45 Bondgate Within',
        customer: 'Mary Johnson',
        round: 'Alnwick Monday',
        price: '£28',
        status: 'completed',
        technician: 'James',
        lastCompleted: '5/6/2026',
        frequency: 'Every 4 weeks',
        nextDue: '6/3/2026',
        paymentStatus: 'paid',
        paymentMethod: 'GoCardless',
        access: 'Ring doorbell on arrival',
      },
      {
        id: 'list-3',
        propertyId: '78-narrowgate',
        address: '78 Narrowgate',
        customer: 'Robert Williams',
        round: 'Alnwick Monday',
        price: '£42',
        status: 'hold',
        technician: 'James',
        lastCompleted: '5/6/2026',
        frequency: 'Every 4 weeks',
        nextDue: '6/3/2026',
        paymentStatus: 'hold',
        paymentMethod: 'GoCardless',
        access: 'Rear lane access only',
      },
      {
        id: 'list-4',
        propertyId: '23-bailiffgate',
        address: '23 Bailiffgate',
        customer: 'Sarah Brown',
        round: 'Alnwick Monday',
        price: '£32',
        status: 'scheduled',
        technician: 'James',
        lastCompleted: '—',
        frequency: 'Every 4 weeks',
        nextDue: '6/3/2026',
        paymentStatus: 'paid',
        paymentMethod: 'GoCardless',
        access: 'Front door only',
      },
      {
        id: 'list-5',
        propertyId: '56-fenkle-street',
        address: '56 Fenkle Street',
        customer: 'David Miller',
        round: 'Alnwick Monday',
        price: '£25',
        status: 'scheduled',
        technician: 'James',
        lastCompleted: '—',
        frequency: 'Every 4 weeks',
        nextDue: '6/3/2026',
        paymentStatus: 'paid',
        paymentMethod: 'Cash',
        access: 'No special instructions',
      },
    ] satisfies RoundPlannerListItem[],
  },
  days: [
    ...buildWeekDays('week-1', 'May 6|May 7|May 8|May 9|May 10', {
      Monday: [
        {
          id: 'round-alnwick-mon',
          title: 'Alnwick Monday',
          stops: 5,
          value: '£940',
          technician: 'James',
          status: 'in-progress',
          statusLabel: 'In-progress',
          completedStops: 2,
          estimatedTime: '6.5 hrs',
          paymentHolds: 1,
          properties: [
            {
              id: 'alnwick-mon-1',
              address: '12 Market Street',
              customer: 'John Smith',
              price: '£35',
              status: 'completed',
            },
            {
              id: 'alnwick-mon-2',
              address: '45 Bondgate Within',
              customer: 'Mary Johnson',
              price: '£28',
              status: 'completed',
            },
            {
              id: 'alnwick-mon-3',
              address: '78 Narrowgate',
              customer: 'Robert Williams',
              price: '£42',
              status: 'payment-hold',
            },
            {
              id: 'alnwick-mon-4',
              address: '23 Bailiffgate',
              customer: 'Sarah Brown',
              price: '£32',
              status: 'scheduled',
            },
            {
              id: 'alnwick-mon-5',
              address: '56 Fenkle Street',
              customer: 'David Miller',
              price: '£25',
              status: 'scheduled',
            },
          ],
        },
      ],
      Tuesday: [
        {
          id: 'round-alnwick-tue',
          title: 'Alnwick Tuesday',
          stops: 5,
          value: '£940',
          technician: 'Sarah',
          status: 'completed',
          statusLabel: 'Completed',
          completedStops: 5,
          estimatedTime: '6.5 hrs',
          paymentHolds: 0,
          properties: [
            {
              id: 'alnwick-tue-1',
              address: '2 Castle View',
              customer: 'Alice Cooper',
              price: '£44',
              status: 'completed',
            },
            {
              id: 'alnwick-tue-2',
              address: '14 High Street',
              customer: 'John Smith',
              price: '£35',
              status: 'completed',
            },
            {
              id: 'alnwick-tue-3',
              address: '6 Hilltop Road',
              customer: 'Chris Adams',
              price: '£30',
              status: 'completed',
            },
            {
              id: 'alnwick-tue-4',
              address: '9 River Lane',
              customer: 'Alice Cooper',
              price: '£42',
              status: 'completed',
            },
            {
              id: 'alnwick-tue-5',
              address: '11 Field Drive',
              customer: 'Lisa Morgan',
              price: '£32',
              status: 'completed',
            },
          ],
        },
      ],
      Wednesday: [
        {
          id: 'round-morpeth-wed',
          title: 'Morpeth Wednesday',
          stops: 5,
          value: '£940',
          technician: 'James',
          status: 'in-progress',
          statusLabel: 'In-progress',
          completedStops: 2,
          estimatedTime: '6.5 hrs',
          paymentHolds: 1,
          properties: [
            {
              id: 'morpeth-wed-1',
              address: '12 Market Street',
              customer: 'John Smith',
              price: '£35',
              status: 'completed',
            },
            {
              id: 'morpeth-wed-2',
              address: '45 Bondgate Within',
              customer: 'Mary Johnson',
              price: '£28',
              status: 'completed',
            },
            {
              id: 'morpeth-wed-3',
              address: '78 Narrowgate',
              customer: 'Robert Williams',
              price: '£42',
              status: 'payment-hold',
            },
            {
              id: 'morpeth-wed-4',
              address: '23 Bailiffgate',
              customer: 'Sarah Brown',
              price: '£32',
              status: 'scheduled',
            },
            {
              id: 'morpeth-wed-5',
              address: '56 Fenkle Street',
              customer: 'David Miller',
              price: '£25',
              status: 'scheduled',
            },
          ],
        },
      ],
    }),
    ...buildWeekDays('week-2', 'May 13|May 14|May 15|May 16|May 17', {}),
    ...buildWeekDays('week-3', 'May 20|May 21|May 22|May 23|May 24', {}),
    ...buildWeekDays('week-4', 'May 27|May 28|May 29|May 30|May 31', {}),
  ] satisfies RoundPlannerDay[],
  defaults: {
    weekId: 'all',
    areaId: 'alnwick',
    technicianId: 'all',
    statusId: 'all',
    view: 'calendar' as RoundPlannerView,
    search: '',
  },
} as const
