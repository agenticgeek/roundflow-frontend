import type { CustomerPropertyRecord } from '@/content/customers'
import { customersContent } from '@/content/customers'

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
  email: string
  serviceType?: string
  planStatus?: PropertyPlanStatus
  needsAssignment?: boolean
  customerRecordId?: string
}

export type VisitStatus = 'completed' | 'scheduled'

export type VisitPaymentStatus = 'paid' | 'pending'

export type VisitInvoiceAction = 'generate' | 'sent'

export type PaymentRecordStatus = 'paid' | 'unpaid'

export type PaymentInvoiceStatus = 'sent' | 'none'

export type PaymentRowAction = 'download' | 'generate'

export interface PropertyPaymentRecord {
  id: string
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
      { value: 'every-8-weeks', label: 'Every 8 weeks' },
      { value: 'monthly', label: 'Monthly' },
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
    defaultStartDate: '22/05/2026',
    defaultResumeDate: '22/06/2026',
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
    },
    contact: {
      title: 'Contact Information',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
    },
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
    },
    actions: {
      download: 'Download',
      generate: 'Generate',
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
    },
    defaultInvoiceNumber: 'INV-2026-217',
    successToast: 'Invoice generated and sent',
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
  notFound: {
    title: 'Property not found',
    description: 'This property could not be loaded. Return to the previous screen to try again.',
    action: 'Go back',
  },
  records: {
    '12-market-street': {
      id: '12-market-street',
      customerName: 'John Smith',
      shortAddress: '12 Market Street, NE66 1SS',
      fullAddress: '12 Market Street, NE66 1SS',
      serviceStatus: 'active',
      roundLabel: 'Alnwick Monday',
      propertyType: 'Residential',
      frequency: 'Every 4 weeks',
      price: '£35',
      cleanMethod: 'Water Fed Pole',
      nextDue: '15/06/2026',
      lastCompleted: '20/05/2026',
      assignedRound: 'Alnwick Monday',
      technician: 'James',
      paymentStatus: 'paid',
      outstandingBalance: '£0',
      paymentMethod: 'GoCardless',
      lastPayment: '15/05/2026',
      issuesCount: 0,
      nextVisitStatus: 'Scheduled',
      accessNotes: 'No access notes',
      riskNotes: 'No risk notes',
      phone: '+44 7700 900000',
      email: 'customer@example.com',
    },
    '45-bondgate-within': {
      id: '45-bondgate-within',
      customerName: 'Mary Johnson',
      shortAddress: '45 Bondgate Within, NE66 1LX',
      fullAddress: '45 Bondgate Within, NE66 1LX',
      serviceStatus: 'active',
      roundLabel: 'Alnwick Monday',
      propertyType: 'Residential',
      frequency: 'Every 4 weeks',
      price: '£28',
      cleanMethod: 'Water Fed Pole',
      nextDue: '15/06/2026',
      lastCompleted: '20/05/2026',
      assignedRound: 'Alnwick Monday',
      technician: 'James',
      paymentStatus: 'paid',
      outstandingBalance: '£0',
      paymentMethod: 'GoCardless',
      lastPayment: '15/05/2026',
      issuesCount: 0,
      nextVisitStatus: 'Scheduled',
      accessNotes: 'Ring doorbell on arrival',
      riskNotes: 'No risk notes',
      phone: '+44 7700 900001',
      email: 'mary.johnson@example.com',
    },
    '78-narrowgate': {
      id: '78-narrowgate',
      customerName: 'Robert Williams',
      shortAddress: '78 Narrowgate, NE66 1JG',
      fullAddress: '78 Narrowgate, NE66 1JG',
      serviceStatus: 'active',
      roundLabel: 'Alnwick Monday',
      propertyType: 'Residential',
      frequency: 'Every 4 weeks',
      price: '£42',
      cleanMethod: 'Traditional',
      nextDue: '15/06/2026',
      lastCompleted: '20/05/2026',
      assignedRound: 'Alnwick Monday',
      technician: 'James',
      paymentStatus: 'hold',
      outstandingBalance: '£42',
      paymentMethod: 'GoCardless',
      lastPayment: '15/04/2026',
      issuesCount: 1,
      nextVisitStatus: 'Payment hold',
      accessNotes: 'Rear lane access only',
      riskNotes: 'Steep driveway',
      phone: '+44 7700 900002',
      email: 'robert.williams@example.com',
    },
    '23-bailiffgate': {
      id: '23-bailiffgate',
      customerName: 'Sarah Brown',
      shortAddress: '23 Bailiffgate, NE66 1LX',
      fullAddress: '23 Bailiffgate, NE66 1LX',
      serviceStatus: 'active',
      roundLabel: 'Alnwick Monday',
      propertyType: 'Residential',
      frequency: 'Every 4 weeks',
      price: '£32',
      cleanMethod: 'Water Fed Pole',
      nextDue: '15/06/2026',
      lastCompleted: '—',
      assignedRound: 'Alnwick Monday',
      technician: 'James',
      paymentStatus: 'paid',
      outstandingBalance: '£0',
      paymentMethod: 'GoCardless',
      lastPayment: '15/05/2026',
      issuesCount: 0,
      nextVisitStatus: 'Scheduled',
      accessNotes: 'Front door only',
      riskNotes: 'No risk notes',
      phone: '+44 7700 900003',
      email: 'sarah.brown@example.com',
    },
    '56-fenkle-street': {
      id: '56-fenkle-street',
      customerName: 'David Miller',
      shortAddress: '56 Fenkle Street, NE66 1JG',
      fullAddress: '56 Fenkle Street, NE66 1JG',
      serviceStatus: 'active',
      roundLabel: 'Alnwick Monday',
      propertyType: 'Residential',
      frequency: 'Every 4 weeks',
      price: '£25',
      cleanMethod: 'Water Fed Pole',
      nextDue: '15/06/2026',
      lastCompleted: '—',
      assignedRound: 'Alnwick Monday',
      technician: 'James',
      paymentStatus: 'paid',
      outstandingBalance: '£0',
      paymentMethod: 'Cash',
      lastPayment: '15/05/2026',
      issuesCount: 0,
      nextVisitStatus: 'Scheduled',
      accessNotes: 'No special instructions',
      riskNotes: 'No risk notes',
      phone: '+44 7700 900004',
      email: 'david.miller@example.com',
    },
  } satisfies Record<string, PropertyDetailRecord>,
  visitRecords: {
    default: [
      {
        id: 'visit-1',
        visitDate: '15/05/2026',
        round: 'Alnwick Monday',
        technician: 'James',
        status: 'completed',
        payment: 'paid',
        price: '£35',
        invoice: 'generate',
      },
      {
        id: 'visit-2',
        visitDate: '18/04/2026',
        round: 'Alnwick Monday',
        technician: 'James',
        status: 'completed',
        payment: 'paid',
        price: '£35',
        invoice: 'generate',
      },
      {
        id: 'visit-3',
        visitDate: '22/05/2026',
        round: 'Alnwick Monday',
        technician: 'James',
        status: 'scheduled',
        payment: 'pending',
        price: '£35',
        invoice: 'sent',
      },
    ] satisfies PropertyVisitRecord[],
  },
  paymentRecords: {
    default: [
      {
        id: 'payment-1',
        visitDate: '20 Jun 2026',
        visitDateRaw: '20/06/2026',
        round: 'Alnwick Monday',
        technician: 'James Smith',
        amount: '£35.00',
        payment: 'unpaid',
        invoice: 'none',
        action: 'generate',
      },
      {
        id: 'payment-2',
        visitDate: '20 May 2026',
        visitDateRaw: '20/05/2026',
        round: 'Alnwick Monday',
        technician: 'James Smith',
        amount: '£35.00',
        payment: 'paid',
        invoice: 'sent',
        action: 'download',
      },
      {
        id: 'payment-3',
        visitDate: '18 Apr 2026',
        visitDateRaw: '18/04/2026',
        round: 'Alnwick Monday',
        technician: 'James Smith',
        amount: '£35.00',
        payment: 'paid',
        invoice: 'sent',
        action: 'download',
      },
      {
        id: 'payment-4',
        visitDate: '21 Mar 2026',
        visitDateRaw: '21/03/2026',
        round: 'Alnwick Monday',
        technician: 'James Smith',
        amount: '£35.00',
        payment: 'paid',
        invoice: 'none',
        action: 'generate',
      },
      {
        id: 'payment-5',
        visitDate: '15 Feb 2026',
        visitDateRaw: '15/02/2026',
        round: 'Alnwick Monday',
        technician: 'James Smith',
        amount: '£35.00',
        payment: 'paid',
        invoice: 'sent',
        action: 'download',
      },
    ] satisfies PropertyPaymentRecord[],
  },
  noteRecords: {
    default: [
      {
        id: 'note-1',
        category: 'internal',
        body: 'Regular customer, always pays on time. Prefers morning visits.',
        author: 'Admin',
        addedOn: '10 Mar 2026',
      },
    ] satisfies PropertyNoteRecord[],
  },
} as const

function fromCustomerRecord(record: CustomerPropertyRecord): PropertyDetailRecord {
  const isUnassigned = Boolean(record.needsAssignment)

  return {
    id: record.propertyId,
    customerRecordId: record.id,
    customerName: record.customer,
    shortAddress: record.address,
    fullAddress: record.address,
    serviceStatus: isUnassigned ? 'unassigned' : record.status === 'hold' ? 'hold' : 'active',
    roundLabel: record.round,
    propertyType: 'Residential',
    frequency: record.frequency,
    price: record.price,
    cleanMethod: 'Water Fed Pole',
    nextDue: isUnassigned ? 'Pending Assignment' : record.nextDue,
    lastCompleted: isUnassigned ? '—' : '20/05/2026',
    assignedRound: isUnassigned ? '—' : record.round,
    technician: isUnassigned ? '—' : record.technician,
    paymentStatus: isUnassigned ? 'pending' : record.paymentStatus,
    outstandingBalance: isUnassigned ? '—' : record.amountDue ?? '£0',
    paymentMethod: isUnassigned ? '—' : 'GoCardless',
    lastPayment: isUnassigned ? '—' : '15/05/2026',
    issuesCount: isUnassigned ? 0 : record.paymentStatus === 'hold' ? 1 : 0,
    nextVisitStatus: isUnassigned ? 'Unscheduled' : record.status === 'hold' ? 'Payment hold' : 'Scheduled',
    accessNotes: 'No access notes',
    riskNotes: 'No risk notes',
    phone: '+44 7700 900000',
    email: 'customer@example.com',
    needsAssignment: isUnassigned,
    serviceType: 'Window Cleaning',
    planStatus: isUnassigned ? 'pending' : record.status === 'hold' ? 'hold' : 'active',
  }
}

function formatPaymentAmount(price: string) {
  const numeric = price.replace(/[£,\s]/g, '')
  if (!numeric) return '£0.00'
  return `£${Number(numeric).toFixed(2)}`
}

function technicianDisplayName(name: string) {
  return name.includes(' ') ? name : `${name} Smith`
}

export function getPropertyNotes(property: PropertyDetailRecord): PropertyNoteRecord[] {
  return propertyDetailContent.noteRecords.default.map((note) => ({
    ...note,
    id: `${property.id}-${note.id}`,
  }))
}

export function getPropertyPaymentHistory(property: PropertyDetailRecord): PropertyPaymentRecord[] {
  const hasAssignedRound = property.assignedRound !== '—' && property.assignedRound !== 'Not Assigned'
  const hasAssignedTechnician =
    property.technician !== '—' && property.technician !== 'Not assigned'
  const amount = formatPaymentAmount(property.price)

  return propertyDetailContent.paymentRecords.default.map((record) => ({
    ...record,
    id: `${property.id}-${record.id}`,
    round: hasAssignedRound ? property.assignedRound : record.round,
    technician: hasAssignedTechnician ? technicianDisplayName(property.technician) : record.technician,
    amount,
  }))
}

export function paymentRecordToVisitRecord(record: PropertyPaymentRecord): PropertyVisitRecord {
  const [firstName] = record.technician.split(' ')

  return {
    id: record.id,
    visitDate: record.visitDateRaw,
    round: record.round,
    technician: firstName ?? record.technician,
    status: 'completed',
    payment: record.payment === 'paid' ? 'paid' : 'pending',
    price: record.amount,
    invoice: 'generate',
  }
}

export function getPropertyVisitHistory(property: PropertyDetailRecord): PropertyVisitRecord[] {
  const hasAssignedRound = property.assignedRound !== '—' && property.assignedRound !== 'Not Assigned'
  const hasAssignedTechnician =
    property.technician !== '—' && property.technician !== 'Not assigned'

  return propertyDetailContent.visitRecords.default.map((visit) => ({
    ...visit,
    id: `${property.id}-${visit.id}`,
    round: hasAssignedRound ? property.assignedRound : visit.round,
    technician: hasAssignedTechnician ? property.technician : visit.technician,
    price: property.price,
  }))
}

export function getPropertyDetail(propertyId: string | undefined): PropertyDetailRecord | null {
  if (!propertyId) return null

  const customerRecord = customersContent.records.find((record) => record.propertyId === propertyId)
  if (customerRecord) return fromCustomerRecord(customerRecord)

  return propertyDetailContent.records[propertyId as keyof typeof propertyDetailContent.records] ?? null
}
