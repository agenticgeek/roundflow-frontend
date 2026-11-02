export type TechnicianStatus = 'in-progress' | 'available' | 'off-duty'
export type TechnicianAppStatus = 'PENDING_INVITE' | 'ACTIVE' | 'INACTIVE'

export interface TechnicianRound {
  id: string
  name: string
  stops: number
  completed: number
  revenue: string
  status: TechnicianStatus
}

export interface TechnicianRecord {
  id: string
  name: string
  initials: string
  role: string
  phone: string
  email: string
  areas: string[]
  serviceAreaIds: string[]
  notes: string
  status: TechnicianStatus
  appStatus?: TechnicianAppStatus
  appActive: boolean
  memberSince: string
  revenue: string
  revenuePerHour: string
  valueCompleted: string
  timeOnJob: string
  complaints: number
  issues: number
  rounds: TechnicianRound[]
}

export const techniciansContent = {
  overview: {
    title: 'Technicians',
    subtitle: "Monitor your team's activity, performance and assigned rounds.",
    add: 'Add Technician',
    assignedRounds: 'Assigned Rounds',
    sendMessage: 'Send Message',
    viewDetails: 'View Details',
    viewPhotos: 'View Photos',
  },
  detail: {
    back: 'Technicians',
    sendMessage: 'Send Message',
    activity: "Today's Activity",
    performance: 'Performance (This Month)',
    info: 'Technician Info',
    workload: 'Workload Summary',
    edit: 'Edit Details',
  },
  form: {
    addTitle: 'Add Technician',
    addSubtitle: 'Add a new team member and assign them to rounds.',
    editTitle: 'Edit Technician',
    editSubtitle: 'Update {name}’s personal details and access settings.',
    personalDetails: 'Personal Details',
    fullName: 'Full Name',
    mobile: 'Mobile Number',
    email: 'Email Address',
    role: 'Role',
    area: 'Service areas',
    areaPlaceholder: 'Select areas...',
    notes: 'Notes',
    optional: 'optional',
    appAccess: 'App Access',
    appAccessActive: 'App Access Active',
    inviteBySms: 'Send App Invite',
    inviteDescription: 'Technician will receive an email invite to join RoundFlow',
    inviteNotice: 'An invite email will be sent to the address above once you save.',
    inviteSent: 'App invite already sent.',
    resend: 'Resend invite?',
    danger: 'Danger Zone',
    dangerDescription: 'Deactivate this technician. They stay in history but cannot be assigned to new rounds.',
    remove: 'Deactivate Technician',
    cancel: 'Cancel',
    save: 'Save Changes',
    add: 'Add Technician',
  },
  conversation: {
    back: 'Back to {name}',
    title: 'Conversation with {name}',
    subtitle: 'Viewing live chat thread for the current week',
    approveAll: 'Approve All',
    archiveTitle: 'Photo Archive',
    archiveSubtitle: 'Searchable gallery for {name}',
    collapse: 'Collapse',
    search: 'Search customer, address, job ref...',
    recentPhotos: 'Recent Photos',
    visitFallback: 'Visit',
    before: 'Before',
    after: 'After',
    empty: 'No photos yet.',
    emptySearch: 'No photos match your search.',
    loadError: 'Photos could not be loaded.',
    retry: 'Retry',
    approve: 'Approve',
    reject: 'Reject',
    visitApproved: 'Visit photos approved.',
    visitRejected: 'Visit photos rejected.',
    reviewError: 'Could not update the photos',
    status: { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' },
  },
  modals: {
    approveTitle: 'Approve All Photos?',
    approveDescription: 'This will mark {count} pending {photos} in the current view as approved.',
    approve: 'Approve All',
    approving: 'Approving…',
    removeTitle: 'Deactivate this technician?',
    removeDescription:
      'They will be marked inactive and cannot be assigned to rounds. Existing scheduled visits are not changed — reassign those separately if needed.',
    remove: 'Deactivate',
    cancel: 'Cancel',
  },
} as const

export const technicianStatusLabels: Record<TechnicianStatus, string> = {
  'in-progress': 'In Progress',
  available: 'Available',
  'off-duty': 'Off Duty',
}
