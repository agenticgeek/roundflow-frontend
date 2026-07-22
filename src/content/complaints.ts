export type ComplaintStatus = 'open' | 'in-review' | 'revisit-booked' | 'resolved'
export type ComplaintPriority = 'low' | 'medium' | 'high'

export interface ComplaintMessage {
  id: string
  author: string
  body: string
  sentAt: string
  kind?: 'message' | 'system'
}

export interface ComplaintRecord {
  id: string
  customer: string
  address: string
  phone: string
  email: string
  issueType: string
  subject: string
  description: string
  status: ComplaintStatus
  priority: ComplaintPriority
  technician: string
  round: string
  visitDate?: string
  revisitDate?: string
  createdAt: string
  messages: ComplaintMessage[]
}

export const complaintStatusLabels: Record<ComplaintStatus, string> = {
  open: 'Open',
  'in-review': 'In Review',
  'revisit-booked': 'Revisit Booked',
  resolved: 'Resolved',
}

export const complaintPriorityLabels: Record<ComplaintPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const complaintsContent = {
  header: {
    title: 'Complaints',
    subtitle: 'Customer service quality issues',
    activeSubtitle: 'All active quality issues',
    action: 'Log Complaint',
  },
  cycle: 'Cycle: 6 May – 2 June',
  searchPlaceholder: 'Search by customer or issue...',
  empty: 'No complaints match your search.',
  filters: [
    { id: 'all', label: 'All' },
    { id: 'my-work', label: 'My Work' },
  ],
  detail: {
    back: 'Back to list',
    messages: 'Messages',
    details: 'Details',
    replyLabel: 'Reply to customer',
    replyPlaceholder: 'Type your reply to the customer...',
    replyHint: 'Ctrl + Enter to send',
    actions: {
      assign: 'Assign Technician',
      revisit: 'Schedule Revisit',
      review: 'Mark In Review',
      resolve: 'Resolve',
    },
  },
  modal: {
    title: 'Log New Complaint',
    subtitle: 'Record a customer service complaint',
    customerSection: 'Customer Details',
    complaintSection: 'Complaint Details',
    visitSection: 'Visit Information',
    customerPlaceholder: 'Customer name',
    addressPlaceholder: 'Property address',
    phonePlaceholder: 'Phone number',
    emailPlaceholder: 'Email address',
    issuePlaceholder: 'Select issue type',
    descriptionPlaceholder: 'Describe the issue in detail',
    priorityLabel: 'Priority Level',
    technicianPlaceholder: 'Technician involved',
    datePlaceholder: 'Visit date',
    cancel: 'Cancel',
    submit: 'Log Complaint',
    issueTypes: [
      'Missed clean',
      'Quality of work',
      'Property damage',
      'Technician conduct',
      'Billing issue',
      'Other',
    ],
    technicians: ['James', 'Sophie', 'Liam', 'Unassigned'],
  },
  assignTechnician: {
    title: 'Assign Technician',
    subtitle: 'Assign a technician to this complaint',
    searchPlaceholder: 'Search technicians...',
    cancel: 'Cancel',
    assign: 'Assign',
    technicians: [
      {
        id: 'james',
        name: 'James',
        initials: 'J',
        rounds: 'Monday Alnwick, Morpeth Wednesday',
      },
      {
        id: 'sophie',
        name: 'Sophie',
        initials: 'S',
        rounds: 'Alnwick Tuesday',
      },
      {
        id: 'liam',
        name: 'Liam',
        initials: 'L',
        rounds: 'Alnwick Friday, Rothbury Thursday',
      },
    ],
  },
  revisit: {
    title: 'Schedule Revisit',
    dateLabel: 'Revisit date',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
  resolve: {
    title: 'Resolve Complaint',
    description:
      'Are you sure you want to mark this complaint as resolved? This will update the complaint status and notify the customer.',
    cancel: 'Cancel',
    confirm: 'Mark as Resolved',
  },
  records: [
    {
      id: 'complaint-1',
      customer: 'David Harris',
      address: 'Alnwick',
      phone: '07700 900123',
      email: 'david.harris@example.com',
      issueType: 'Missed clean',
      subject: 'Missed conservatory roof',
      description:
        'My conservatory roof was not cleaned again this time. This is the second time it has been missed. Please can someone come back out?',
      status: 'open',
      priority: 'medium',
      technician: 'James',
      round: 'Monday Alnwick',
      visitDate: '19 Jun 2026',
      createdAt: '19 Jun 2026',
      messages: [
        {
          id: 'message-1',
          author: 'David Harris',
          body:
            'Hi, my conservatory roof was not cleaned again this time. This is the second time it has been missed. Please can someone come back out?',
          sentAt: '19 Jun, 09:14',
        },
      ],
    },
    {
      id: 'complaint-2',
      customer: 'Carol Martin',
      address: '12 Baillifgate',
      phone: '07700 900456',
      email: 'carol.martin@example.com',
      issueType: 'Quality of work',
      subject: 'Streaky windows after clean',
      description: 'Several windows were left with visible streaks after the latest clean.',
      status: 'in-review',
      priority: 'low',
      technician: 'Sophie',
      round: 'Alnwick Tuesday',
      visitDate: '18 Jun 2026',
      createdAt: '18 Jun 2026',
      messages: [
        {
          id: 'message-2',
          author: 'Carol Martin',
          body: 'Several windows were left with visible streaks after the latest clean.',
          sentAt: '18 Jun, 14:30',
        },
      ],
    },
    {
      id: 'complaint-3',
      customer: 'Robert Wilson',
      address: '55 Church Street',
      phone: '07700 900789',
      email: 'robert.wilson@example.com',
      issueType: 'Property damage',
      subject: 'Damaged window frame',
      description: 'A window frame appears to have been damaged during the last visit.',
      status: 'revisit-booked',
      priority: 'high',
      technician: 'Liam',
      round: 'Rothbury Thursday',
      visitDate: '15 Jun 2026',
      revisitDate: '24 Jun 2026',
      createdAt: '15 Jun 2026',
      messages: [
        {
          id: 'message-3',
          author: 'Robert Wilson',
          body: 'A window frame appears to have been damaged during the last visit.',
          sentAt: '15 Jun, 16:05',
        },
      ],
    },
    {
      id: 'complaint-4',
      customer: 'Susan Davis',
      address: '31 Market Place',
      phone: '07700 900321',
      email: 'susan.davis@example.com',
      issueType: 'Technician conduct',
      subject: 'Technician rude / unprofessional',
      description: 'The technician was rude when I asked about the areas included in my clean.',
      status: 'resolved',
      priority: 'medium',
      technician: 'Liam',
      round: 'Alnwick Friday',
      visitDate: '13 Jun 2026',
      createdAt: '10 Jun 2026',
      messages: [
        {
          id: 'message-4',
          author: 'Susan Davis',
          body: 'The technician was rude when I asked about the areas included in my clean.',
          sentAt: '10 Jun, 11:22',
        },
        {
          id: 'message-4-resolution',
          author: 'Resolved by Liam',
          body: 'Issue resolved — revisit completed successfully.',
          sentAt: '10 Jun, 15:45',
          kind: 'system',
        },
      ],
    },
  ] satisfies ComplaintRecord[],
} as const
