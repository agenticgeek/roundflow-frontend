export type PropertyDetailTabId =
  | 'overview'
  | 'service-plan'
  | 'visit-history'
  | 'payments'
  | 'notes-risk'
  | 'photos'

export type PropertyServiceStatus = 'active' | 'paused' | 'unassigned' | 'hold'

export type PropertyPlanStatus = 'active' | 'pending' | 'paused' | 'hold'

export type PropertyPaymentStatus = 'paid' | 'hold' | 'pending'

export interface PropertyDetailRecord {
  id: string
  customerName: string
  shortAddress: string
  fullAddress: string
  serviceStatus: PropertyServiceStatus
  roundLabel: string
  propertyType: string
  frequency: string
  price: string
  cleanMethod: string
  nextDue: string
  lastCompleted: string
  assignedRound: string
  technician: string
  paymentStatus: PropertyPaymentStatus
  outstandingBalance: string
  paymentMethod: string
  lastPayment: string
  issuesCount: number
  nextVisitStatus: string
  accessNotes: string
  riskNotes: string
  phone: string
  landline: string
  email: string
  serviceType?: string
  planStatus?: PropertyPlanStatus
  needsAssignment?: boolean
  customerRecordId?: string
}

export type VisitStatus = 'completed' | 'scheduled'

export type VisitPaymentStatus = 'paid' | 'pending'

export type VisitInvoiceAction = 'generate' | 'sent' | 'draft'

export type PaymentRecordStatus = 'paid' | 'unpaid'

export type PaymentInvoiceStatus = 'sent' | 'draft' | 'none'

export type PaymentRowAction = 'download' | 'generate'

export interface PropertyPaymentRecord {
  id: string
  visitId?: string
  invoiceId?: string | null
  invoiceNumber?: string | null
  transactionId?: string | null
  visitDate: string
  visitDateRaw: string
  round: string
  technician: string
  amount: string
  payment: PaymentRecordStatus
  invoice: PaymentInvoiceStatus
  action: PaymentRowAction
}

export type PropertyNoteCategory = 'internal' | 'risk' | 'customer' | 'technician'

export interface PropertyNoteRecord {
  id: string
  category: PropertyNoteCategory
  body: string
  author: string
  addedOn: string
}

export interface PropertyVisitRecord {
  id: string
  visitDate: string
  round: string
  technician: string
  status: VisitStatus
  payment: VisitPaymentStatus
  price: string
  invoice: VisitInvoiceAction
  invoiceId?: string | null
}

export const propertyDetailContent = {
  backLabel: 'Back',
  actions: {
    edit: 'Edit',
    pauseService: 'Pause Service',
    sendMessage: 'Send Message',
  },
  editCustomerModal: {
    title: 'Edit Customer Record',
    subtitle: '{customer} — {street}',
    sections: {
      contactDetails: 'Contact Details',
      propertyAddress: 'Property Address',
      serviceDetails: 'Service Details',
      notes: 'Notes',
    },
    fields: {
      fullName: 'Full Name',
      phone: 'Phone Number',
      landline: 'Landline Number',
      email: 'Email Address',
      streetAddress: 'Street Address',
      postcode: 'Postcode',
      propertyType: 'Property Type',
      frequency: 'Frequency',
      price: 'Price (£)',
      cleanMethod: 'Clean Method',
      paymentMethod: 'Payment Method',
      accessNotes: 'Access Notes',
      riskNotes: 'Risk Notes',
      riskNotesHint: '— visible to all technicians',
    },
    placeholders: {
      accessNotes: 'e.g. Gate code: 1234, side access only...',
      riskNotes: 'e.g. Aggressive dog, slippery path...',
    },
    propertyTypeOptions: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
    ],
    frequencyOptions: [
      { value: 'every-4-weeks', label: 'Every 4 weeks' },
      { value: 'every-6-weeks', label: 'Every 6 weeks' },
      { value: 'every-8-weeks', label: 'Every 8 weeks' },
      { value: 'every-12-weeks', label: 'Every 12 weeks' },
    ],
    cleanMethodOptions: [
      { value: 'water-fed-pole', label: 'Water Fed Pole' },
      { value: 'traditional', label: 'Traditional' },
    ],
    paymentMethodOptions: [
      { value: 'gocardless', label: 'GoCardless' },
      { value: 'cash', label: 'Cash' },
      { value: 'bank-transfer', label: 'Bank Transfer' },
    ],
    actions: {
      cancel: 'Cancel',
      save: 'Save Changes',
    },
    validation: {
      fullNameRequired: "Enter the customer's full name.",
      phoneRequired: 'Enter a phone number.',
      phoneInvalid: 'Enter a valid phone number.',
      landlineInvalid: 'Enter a valid landline number.',
      emailInvalid: 'Enter a valid email address.',
      streetAddressRequired: 'Enter the street address.',
      postcodeRequired: 'Enter a postcode.',
      postcodeInvalid: 'Enter a valid UK postcode.',
      priceInvalid: 'Enter a price greater than 0.',
    },
    successToast: 'Customer record updated',
  },
  assignment: {
    title: 'Not assigned to a round or technician yet',
    description:
      'Assign this property to a round so visits can be scheduled and payments collected.',
    action: 'Assign to Round & Technician',
  },
  pauseServiceToast: {
    title: 'Customer/Property paused',
    description: 'The customer/property you selected has been paused from the recurring round',
  },
  pauseServiceModal: {
    title: 'Pause Service',
    subtitle: '{customer}',
    fields: {
      reason: 'Reason for Pause',
      duration: 'Pause Duration',
      startDate: 'Start Date',
      resumeDate: 'Resume Date',
      notifySms: 'Notify customer by SMS',
      notifySmsDescription: 'Send a message to let them know their service is paused',
    },
    reasons: [
      { value: 'holiday', label: 'Customer Holiday/ Away' },
      { value: 'payment', label: 'Payment Issue' },
      { value: 'property', label: 'Property Access Issue' },
      { value: 'other', label: 'Other' },
    ],
    durationOptions: [
      {
        id: 'range',
        title: 'Specific date range',
        description: 'Service will automatically resume on the end date.',
      },
      {
        id: 'indefinite',
        title: 'Indefinite pause',
        description: 'Must be manually resumed — no scheduled visits will be generated.',
      },
    ],
    defaultSmsMessage:
      "Hi {customer}, we're temporarily pausing your window cleaning service as requested. We'll be in touch to reschedule when you're ready. Thanks!",
    smsMeta: '{count} characters · 1 SMS',
    warning: {
      title: 'Upcoming visits will be cancelled',
      description:
        'Any scheduled visits during the pause period will not be generated. Payment collection will also be suspended.',
    },
    actions: {
      cancel: 'Cancel',
      pause: 'Pause Service',
    },
  },
  sendMessageModal: {
    title: 'Send Message',
    subtitle: '{customer}',
    sendVia: 'Send via',
    channels: {
      sms: 'SMS',
      email: 'Email',
    },
    fields: {
      template: 'Template',
      message: 'Message',
    },
    templates: [
      {
        value: 'visit-reminder',
        label: 'Visit Reminder',
        smsBody:
          'Hi {firstName}, just a reminder that your window cleaning is scheduled for {nextDue}. Our technician {technician} will arrive between 8am and 12pm. Thanks!',
        emailBody:
          'Hi {firstName},\n\nJust a reminder that your window cleaning is scheduled for {nextDue}. Our technician {technician} will arrive between 8am and 12pm.\n\nThanks!',
      },
      {
        value: 'payment-reminder',
        label: 'Payment Reminder',
        smsBody:
          'Hi {firstName}, this is a friendly reminder about your upcoming window cleaning payment of {price}. Thanks!',
        emailBody:
          'Hi {firstName},\n\nThis is a friendly reminder about your upcoming window cleaning payment of {price}.\n\nThanks!',
      },
    ],
    meta: '{count} characters · 1 SMS',
    actions: {
      cancel: 'Cancel',
      sendSms: 'Send SMS',
      sendEmail: 'Send Email',
    },
    successSmsToast: 'SMS sent to customer',
    successEmailToast: 'Email sent to customer',
  },
  statusLabels: {
    active: 'Active',
    paused: 'Paused',
    unassigned: 'Unassigned',
    hold: 'Hold',
  },
  paymentStatusLabels: {
    paid: 'paid',
    hold: 'hold',
    pending: 'pending',
  },
  planStatusLabels: {
    active: 'Active',
    pending: 'Pending',
    paused: 'Paused',
    hold: 'Hold',
  },
  summaryCards: {
    propertyInformation: 'Property Information',
    paymentStatus: 'Payment & Status',
  },
  summary: {
    propertyType: 'Property Type',
    frequency: 'Frequency',
    price: 'Price',
    cleanMethod: 'Clean Method',
    nextDue: 'Next Due',
    lastCompleted: 'Last Completed',
    assignedRound: 'Assigned Round',
    technician: 'Technician',
    paymentStatus: 'Payment Status',
    outstandingBalance: 'Outstanding Balance',
    paymentMethod: 'Payment Method',
    lastPayment: 'Last Payment',
    issuesCount: 'Issues Count',
    nextVisitStatus: 'Next Visit Status',
  },
  tabs: [
    { id: 'overview', label: 'Overview' },
    { id: 'service-plan', label: 'Service Plan' },
    { id: 'visit-history', label: 'Visit History' },
    { id: 'payments', label: 'Payments' },
    { id: 'notes-risk', label: 'Notes & Risk' },
    { id: 'photos', label: 'Photos' },
  ] satisfies { id: PropertyDetailTabId; label: string }[],
  overview: {
    propertyDetails: {
      title: 'Property Details',
      fullAddress: 'Full Address',
      propertyType: 'Property Type',
      accessNotes: 'Access Notes',
      riskNotes: 'Risk Notes',
      changeFrequency: 'Change Frequency',
    },
    contact: {
      title: 'Contact Information',
      name: 'Name',
      phone: 'Phone',
      landline: 'Landline',
      email: 'Email',
    },
  },
  changeFrequencyModal: {
    title: 'Change Service Frequency',
    labels: {
      customer: 'Customer',
      address: 'Address',
      currentFrequency: 'Current Frequency',
      currentRound: 'Current Round',
      newFrequency: 'New Frequency',
    },
    placeholder: 'Select new frequency',
    currentBadge: 'Current',
    helper:
      'The system will automatically find or create a matching round in the same service area.',
    actions: {
      cancel: 'Cancel',
      submit: 'Change Frequency',
    },
    successToast: 'Service frequency updated',
    options: [
      { value: 'FOUR_WEEKLY', label: 'Every 4 weeks' },
      { value: 'SIX_WEEKLY', label: 'Every 6 weeks' },
      { value: 'EIGHT_WEEKLY', label: 'Every 8 weeks' },
      { value: 'TWELVE_WEEKLY', label: 'Every 12 weeks' },
    ],
  },
  servicePlan: {
    title: 'Service Plan Details',
    frequency: 'Frequency',
    serviceType: 'Service Type',
    roundAssignment: 'Round Assignment',
    planStatus: 'Plan Status',
    notAssigned: 'Not assigned',
    defaultServiceType: 'Window Cleaning',
  },
  visitHistory: {
    title: 'Visit History',
    columns: {
      visitDate: 'Visit Date',
      round: 'Round',
      technician: 'Technician',
      status: 'Status',
      payment: 'Payment',
      price: 'Price',
      invoice: 'Invoice',
    },
    statusLabels: {
      completed: 'completed',
      scheduled: 'scheduled',
    },
    paymentLabels: {
      paid: 'paid',
      pending: 'pending',
    },
    invoiceActions: {
      generate: 'Generate',
      sent: 'Sent',
      draft: 'Draft',
    },
    emptyLabel: 'No visits recorded yet.',
  },
  paymentHistory: {
    title: 'Payment History',
    panelTitle: 'Visits & Invoices',
    visitsTotal: '{count} visits total',
    columns: {
      visitDate: 'Visit Date',
      technician: 'Technician',
      amount: 'Amount',
      payment: 'Payment',
      invoice: 'Invoice',
      transaction: 'Transaction',
      action: 'Action',
    },
    paymentLabels: {
      paid: 'Paid',
      unpaid: 'Unpaid',
    },
    invoiceLabels: {
      sent: 'Sent',
      draft: 'Draft',
    },
    actions: {
      download: 'View',
      generate: 'Generate',
      send: 'Send',
    },
    emptyLabel: 'No payment records yet.',
    downloadToast: 'Invoice PDF downloaded',
  },
  generateInvoiceModal: {
    title: 'Generate Invoice',
    subtitle: '{customer} · {visitDate}',
    summary: {
      customer: 'Customer',
      property: 'Property',
      visitDate: 'Visit Date',
      amount: 'Amount',
      customerEmail: 'Customer Email',
    },
    fields: {
      invoiceNumber: 'Invoice Number',
      dueDate: 'Due date',
      notes: 'Notes (optional)',
      notesPlaceholder: 'Add any additional notes to the invoice...',
    },
    paymentMethod: {
      label: 'Payment Method: {method}',
      description: 'Payment collected via {method}',
      defaultMethod: 'GoCardless',
    },
    email: {
      label: 'Also send to customer via email',
    },
    actions: {
      cancel: 'Cancel',
      preview: 'Preview Invoice',
      generate: 'Generate & Send',
      draft: 'Save as draft',
      sendNow: 'Send now',
    },
    defaultInvoiceNumber: 'INV-2026-217',
    successToast: 'Invoice generated and sent',
    draftToast: 'Invoice saved as draft',
    alreadyExists: 'This visit already has an invoice.',
    noEmailWarning: 'Add a customer email before sending this invoice.',
    previewToast: 'Invoice preview opened',
  },
  invoicePreviewModal: {
    title: 'Invoice Preview',
    subtitle: '{customer} · {visitDate}',
    invoiceHeading: 'INVOICE',
    billTo: 'Bill To',
    invoiceDetails: 'Invoice Details',
    fields: {
      invoiceDate: 'Invoice Date',
      visitDate: 'Visit Date',
      dueDate: 'Due Date',
      payment: 'Payment',
    },
    table: {
      description: 'Description',
      technician: 'Technician',
      amount: 'Amount',
    },
    serviceTitle: 'Window Cleaning Service',
    serviceSubtitle: '{round} · {visitDateFormatted}',
    totals: {
      subtotal: 'Subtotal',
      vat: 'VAT (0%)',
      totalDue: 'Total Due',
    },
    footer: 'Thank you for your business · RoundFlow · support@roundflow.co.uk',
    actions: {
      editDetails: 'Edit Details',
      print: 'Print',
      downloadPdf: 'Download PDF',
    },
    defaultInvoiceDate: '23/06/2026',
    defaultDueDate: '06/06/2026',
    printToast: 'Invoice sent to printer',
    downloadToast: 'Invoice PDF downloaded',
  },
  notesRisk: {
    title: 'Notes & Risk Information',
    addNote: 'Add Note',
    newNote: 'New Note',
    placeholder: 'Type your note here...',
    attribution: 'Note will be attributed to {author} - {date}',
    defaultAuthor: 'Admin',
    attributionDate: '25 Jun 2026',
    categories: [
      { id: 'internal', label: 'Internal' },
      { id: 'risk', label: 'Risk Warning' },
      { id: 'customer', label: 'Customer' },
      { id: 'technician', label: 'Technician' },
    ],
    categoryLabels: {
      internal: 'Internal Note',
      risk: 'Risk Warning',
      customer: 'Customer Note',
      technician: 'Technician Note',
    },
    actions: {
      cancel: 'Cancel',
      save: 'Save Note',
    },
    saveToast: 'Note saved',
  },
  placeholders: {
    payments: 'Payment history will appear here.',
    photos: 'Property photos will appear here.',
  },
  photosComingSoon: {
    badge: 'Coming Soon',
    title: 'Property photos are on the way',
    description: 'Before/after photos from each visit will appear here soon.',
  },
  notFound: {
    title: 'Property not found',
    description: 'This property could not be loaded. Return to the previous screen to try again.',
    action: 'Go back',
  },
} as const

export function paymentRecordToVisitRecord(record: PropertyPaymentRecord): PropertyVisitRecord {
  const [firstName] = record.technician.split(' ')

  return {
    id: record.visitId ?? record.id,
    visitDate: record.visitDateRaw,
    round: record.round,
    technician: firstName ?? record.technician,
    status: 'completed',
    payment: record.payment === 'paid' ? 'paid' : 'pending',
    price: record.amount,
    invoice:
      record.invoice === 'sent' ? 'sent' : record.invoice === 'draft' ? 'draft' : 'generate',
    invoiceId: record.invoiceId,
  }
}

