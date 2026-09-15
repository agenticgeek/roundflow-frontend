import type { EmergencyAvailability, EmergencyStatus } from '@/api/emergencies.api'

export type EmergencyTab = 'ACTIVE' | 'RESOLVED' | 'ALL'

export const emergencyStatusLabels: Record<EmergencyStatus, string> = {
  ACTIVE: 'Active',
  RESOLVED: 'Resolved',
}

export const emergencyAvailabilityLabels: Record<EmergencyAvailability, string> = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
}

export const emergenciesContent = {
  bell: {
    label: 'Emergency notifications',
    tooltip: (count: number) =>
      count === 0 ? 'No active emergencies' : `${count} active ${count === 1 ? 'emergency' : 'emergencies'}`,
  },
  header: {
    title: 'Emergency Notifications',
    subtitle: 'Technicians who cannot finish their round — pick a replacement and confirm.',
    refresh: 'Refresh emergencies',
  },
  tabs: [
    { id: 'ACTIVE', label: 'Active' },
    { id: 'RESOLVED', label: 'Resolved' },
    { id: 'ALL', label: 'All' },
  ] satisfies { id: EmergencyTab; label: string }[],
  columns: {
    technician: 'Technician',
    round: 'Round',
    remainingStops: 'Remaining stops',
    lastLocation: 'Last location',
    windowEnd: 'Window end',
    reported: 'Reported',
    status: 'Status',
    action: 'Action',
  },
  actions: {
    view: 'View',
    confirm: 'Confirm reassignment',
    confirming: 'Reassigning…',
    cancel: 'Cancel',
  },
  states: {
    loading: 'Loading emergencies…',
    error: 'Could not load emergencies.',
    retry: 'Try again',
    emptyActive: 'No active emergencies — everyone is on track.',
    emptyResolved: 'No resolved emergencies yet.',
    emptyAll: 'No emergencies reported yet.',
  },
  detail: {
    title: 'Emergency details',
    fields: {
      technician: 'Reported by',
      round: 'Round',
      remainingStops: 'Remaining stops',
      lastLocation: 'Last location',
      windowEnd: 'Customer window ends',
      reportedAt: 'Reported',
      notes: 'Notes from technician',
      noNotes: 'No notes provided.',
      assignedTo: 'Reassigned to',
      resolvedAt: 'Resolved',
    },
    replacementTitle: 'Choose a replacement',
    replacementHint: 'Available technicians have no jobs left today. Busy ones can still be picked — your call.',
    jobsRemaining: (count: number) => `${count} ${count === 1 ? 'job' : 'jobs'} left today`,
    noTechnicians: 'No other active technicians to reassign to.',
    loadingTechnicians: 'Checking who is free…',
    selectRequired: 'Choose a replacement technician first.',
    alreadyResolved: 'This emergency has already been resolved.',
  },
  toasts: {
    reassigned: (technician: string, round: string) => `${technician} successfully reassigned to ${round}.`,
    notFound: 'Emergency not found.',
    alreadyResolved: 'This emergency has already been resolved.',
    genericError: 'Something went wrong, please try again.',
  },
  report: {
    button: 'Report Emergency',
    title: 'Report an emergency',
    subtitle: 'Let a manager know you cannot finish your round. They will reassign the remaining stops.',
    fields: {
      round: 'Round you are running',
      roundPlaceholder: 'Select round',
      remainingStops: 'Stops remaining',
      lastLocation: 'Last location (optional)',
      lastLocationPlaceholder: 'e.g. High Street, Alnwick',
      windowEnd: 'Customer window ends (optional)',
      notes: 'What happened? (optional)',
      notesPlaceholder: 'e.g. Car broken down, cannot continue',
    },
    noRounds: 'You have no rounds scheduled today.',
    validation: {
      roundRequired: 'Select the round you are running.',
      stopsInvalid: 'Enter how many stops are left (0 or more).',
    },
    submit: 'Report emergency',
    submitting: 'Reporting…',
    cancel: 'Cancel',
    success: 'Emergency reported. A manager has been notified.',
  },
} as const
