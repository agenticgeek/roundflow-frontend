export type TechnicianStatus = 'in-progress' | 'available' | 'off-duty'
export type PhotoReviewStatus = 'approved' | 'pending' | 'flagged'

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
  notes: string
  status: TechnicianStatus
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

export interface TechnicianPhotoJob {
  id: string
  property: string
  customer: string
  service: string
  date: string
  status: PhotoReviewStatus
  before: string[]
  after: string[]
}

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=75`

export const techniciansContent = {
  overview: {
    title: 'Technicians',
    subtitle: "Monitor your team's activity, performance and assigned rounds.",
    date: 'Monday 18 May 2026',
    add: 'Add Technician',
    metrics: [
      { label: 'Active now', value: '1', accent: true },
      { label: 'Total rounds', value: '2' },
      { label: "This week's revenue", value: '£1,880' },
      { label: 'Avg rev / hour', value: '£21.65' },
    ],
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
    issueFlagged: '1 issue flagged on Alnwick Monday',
  },
  form: {
    addTitle: 'Add Technician',
    addSubtitle: 'Add a new team member and assign them to rounds.',
    editTitle: 'Edit Technician',
    editSubtitle: "Update James's personal details and access settings.",
    personalDetails: 'Personal Details',
    fullName: 'Full Name',
    mobile: 'Mobile Number',
    email: 'Email Address',
    role: 'Role',
    area: 'Default Area',
    notes: 'Notes',
    optional: 'optional',
    appAccess: 'App Access',
    appAccessActive: 'App Access Active',
    inviteBySms: 'Send App Invite via SMS',
    inviteDescription: 'Technician will receive a link to download the RoundFlow mobile app',
    inviteNotice: 'A text message will be sent to the mobile number above once you save.',
    inviteSent: 'App invite already sent.',
    resend: 'Resend invite?',
    danger: 'Danger Zone',
    dangerDescription: 'This will permanently remove James from all rounds.',
    remove: 'Remove Technician',
    cancel: 'Cancel',
    save: 'Save Changes',
    add: 'Add Technician',
  },
  conversation: {
    back: 'Back to James',
    title: 'Conversation with James',
    subtitle: 'Viewing live chat thread for the current week',
    approveAll: 'Approve All',
    archiveTitle: 'Photo Archive',
    archiveSubtitle: 'Searchable gallery for James',
    collapse: 'Collapse',
    search: 'Search customer, address, job ref...',
    recentPhotos: 'Recent Photos',
    messages: [
      {
        id: 'chat-1',
        from: 'technician',
        body: 'Starting job at 12 Market Street - here are the before photos',
        time: '14:20',
      },
      {
        id: 'chat-2',
        from: 'admin',
        body: 'Looks good, approved. Please proceed with the job.',
        time: '14:22',
      },
      {
        id: 'chat-3',
        from: 'technician',
        body: 'Job complete - here are the after photos',
        time: '15:45',
      },
      {
        id: 'chat-4',
        from: 'admin',
        body: 'Can you retake the after photo of the conservatory? It’s a bit blurry.',
        time: '15:49',
      },
    ],
  },
  photos: {
    back: 'Back to James',
    titlePrefix: 'Property Photos',
    pendingReview: 'Pending Review',
    approveAll: 'Approve All',
    before: 'Before Photos',
    after: 'After Photos',
    notes: 'Notes from Technician',
    notesBody:
      'All windows cleaned, guttering cleared. One pane on the back had existing crack - see before photo #3. Guttering was quite full of moss near the garage.',
    jobDetails: 'Job Details',
    previousIssues: 'Previous Issues',
    previousIssue: 'Stubborn bird lime on conservatory',
    viewCustomer: 'View Customer Profile',
    contact: 'Contact Technician',
  },
  modals: {
    approveTitle: 'Approve All Photos?',
    approveDescription:
      'This will mark all 24 photos in the current view as approved. This action cannot be undone.',
    approve: 'Approve All',
    removeTitle: 'Are you sure you want to remove the technician James from the system?',
    remove: 'Remove',
    cancel: 'Cancel',
  },
  technicians: [
    {
      id: 'james',
      name: 'James Smith',
      initials: 'J',
      role: 'Lead Technician',
      phone: '07123 456789',
      email: 'james@example.com',
      areas: ['Alnwick', 'Morpeth'],
      notes: 'Prefers morning shifts. Has own equipment.',
      status: 'in-progress',
      appActive: true,
      memberSince: 'Jan 2024',
      revenue: '£1,880',
      revenuePerHour: '£22.80',
      valueCompleted: '£4,100',
      timeOnJob: '180h',
      complaints: 1,
      issues: 2,
      rounds: [
        {
          id: 'alnwick-monday',
          name: 'Alnwick Monday',
          stops: 5,
          completed: 2,
          revenue: '£940',
          status: 'in-progress',
        },
        {
          id: 'morpeth-wednesday',
          name: 'Morpeth Wednesday',
          stops: 5,
          completed: 0,
          revenue: '£940',
          status: 'in-progress',
        },
      ],
    },
  ] satisfies TechnicianRecord[],
  photoJobs: [
    {
      id: '12-market-street',
      property: '12 Market Street',
      customer: 'John Smith',
      service: 'Window Cleaning (Monthly)',
      date: '3/08/2025',
      status: 'pending',
      before: [
        photo('photo-1560518883-ce09059eeffa'),
        photo('photo-1527515637462-cff94eecc1ac'),
        photo('photo-1511818966892-d7d671e672a2'),
        photo('photo-1484154218962-a197022b5858'),
      ],
      after: [
        photo('photo-1600585154340-be6161a56a0c'),
        photo('photo-1600566753190-17f0baa2a6c3'),
        photo('photo-1600607687920-4e2a09cf159d'),
        photo('photo-1600573472550-8090b5e0745e'),
      ],
    },
    {
      id: '45-bondgate-within',
      property: '45 Bondgate Within',
      customer: 'Emma Taylor',
      service: 'Window Cleaning',
      date: 'Today · 14:20',
      status: 'pending',
      before: [
        photo('photo-1570129477492-45c003edd2be'),
        photo('photo-1449844908441-8829872d2607'),
      ],
      after: [
        photo('photo-1600047509807-ba8f99d2cdde'),
        photo('photo-1600566753086-00f18fb6b3ea'),
      ],
    },
    {
      id: '8-oak-lane',
      property: '8 Oak Lane',
      customer: 'Peter Brown',
      service: 'Window Cleaning',
      date: 'Yesterday · 09:10',
      status: 'approved',
      before: [photo('photo-1600585152915-d208bec867a1')],
      after: [photo('photo-1600573472591-ee6b68d14c68')],
    },
  ] satisfies TechnicianPhotoJob[],
} as const

export const technicianStatusLabels: Record<TechnicianStatus, string> = {
  'in-progress': 'In Progress',
  available: 'Available',
  'off-duty': 'Off Duty',
}
