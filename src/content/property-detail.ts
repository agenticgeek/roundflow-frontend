export type PropertyDetailTabId =
  | 'overview'
  | 'service-plan'
  | 'visit-history'
  | 'payments'
  | 'notes-risk'
  | 'photos'

export type PropertyServiceStatus = 'active' | 'paused'

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
}

export const propertyDetailContent = {
  backLabel: 'Back to Round Planner',
  actions: {
    edit: 'Edit',
    pauseService: 'Pause Service',
    sendMessage: 'Send Message',
  },
  pauseServiceToast: {
    title: 'Customer/Property paused',
    description: 'The customer/property you selected has been paused from the recurring round',
  },
  statusLabels: {
    active: 'Active',
    paused: 'Paused',
    paid: 'paid',
    hold: 'hold',
    pending: 'pending',
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
  placeholders: {
    'service-plan': 'Service plan details will appear here.',
    'visit-history': 'Visit history will appear here.',
    payments: 'Payment history will appear here.',
    'notes-risk': 'Notes and risk information will appear here.',
    photos: 'Property photos will appear here.',
  },
  notFound: {
    title: 'Property not found',
    description: 'This property could not be loaded. Return to Round Planner to try again.',
    action: 'Back to Round Planner',
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
} as const

export function getPropertyDetail(propertyId: string | undefined): PropertyDetailRecord | null {
  if (!propertyId) return null
  return propertyDetailContent.records[propertyId as keyof typeof propertyDetailContent.records] ?? null
}
