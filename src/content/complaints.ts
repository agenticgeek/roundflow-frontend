import type { ComplaintSeverity, ComplaintStatus } from '@/api/complaints.api'

export const complaintStatusLabels: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  IN_REVIEW: 'In Review',
  REVISIT_BOOKED: 'Revisit Booked',
  RESOLVED: 'Resolved',
}

export const complaintSeverityLabels: Record<ComplaintSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const complaintsContent = {
  header: {
    title: 'Complaints',
    subtitle: 'Customer service quality issues',
    activeSubtitle: 'All active quality issues',
    action: 'Log Complaint',
  },
  searchPlaceholder: 'Search by customer or issue...',
  empty: 'No complaints match your search.',
  loadError: 'Could not load complaints.',
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
    loadError: 'Could not load this complaint.',
    messagesLoadError: 'Could not load messages.',
    actions: {
      assign: 'Assign Technician',
      revisit: 'Schedule Revisit',
      review: 'Mark In Review',
      resolve: 'Resolve',
      reopen: 'Reopen Complaint',
    },
    fields: {
      issueType: 'Issue type',
      priority: 'Priority',
      dateReported: 'Date reported',
      technicianAssigned: 'Technician assigned',
      customerPhone: 'Customer phone',
      customerEmail: 'Customer email',
      propertyAddress: 'Property address',
    },
    unassigned: 'Unassigned',
    notSupplied: 'Not supplied',
  },
  modal: {
    title: 'Log New Complaint',
    subtitle: 'Record a customer service complaint',
    customerSection: 'Customer',
    complaintSection: 'Complaint Details',
    visitSection: 'Assignment',
    customerSearchPlaceholder: 'Search customers by name...',
    customerSearchHint: 'Type at least 2 characters to search',
    customerSearchEmpty: 'No matching customers.',
    changeCustomer: 'Change',
    issuePlaceholder: 'Select issue type',
    descriptionPlaceholder: 'Describe the issue in detail',
    priorityLabel: 'Priority Level',
    technicianPlaceholder: 'Technician involved (optional)',
    cancel: 'Cancel',
    submit: 'Log Complaint',
    issueTypes: [
      'Missed Clean',
      'Damaged Property',
      'Rude Technician',
      'Streaky Windows',
      'Other',
    ],
  },
  assignTechnician: {
    title: 'Assign Technician',
    subtitle: 'Assign a technician to this complaint',
    searchPlaceholder: 'Search technicians...',
    empty: 'No technicians match your search.',
    cancel: 'Cancel',
    assign: 'Assign',
  },
  revisit: {
    title: 'Schedule Revisit',
    dateLabel: 'Revisit date',
    confirm: 'Confirm',
    cancel: 'Cancel',
    invalidDate: 'Enter a valid revisit date.',
  },
  resolve: {
    title: 'Resolve Complaint',
    description:
      'Are you sure you want to mark this complaint as resolved? This will update the complaint status and notify the customer.',
    cancel: 'Cancel',
    confirm: 'Mark as Resolved',
  },
  resolutionMessage: (resolvedBy: string) =>
    `Issue resolved — revisit completed successfully. Resolved by ${resolvedBy}`,
  toasts: {
    logged: 'Complaint logged successfully',
    markedInReview: 'Marked for in-review!',
    revisitScheduled: 'Revisit scheduled',
    resolved: 'Complaint resolved successfully.',
    reopened: 'Complaint reopened',
    assigned: (name: string) => `Assigned to ${name} successfully!`,
    replySent: 'Reply sent to customer.',
    permissionDenied: "You don't have permission to do that.",
  },
} as const
