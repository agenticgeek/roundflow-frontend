export type CustomerStatus = 'active' | 'hold' | 'cancelled'

export type CustomerPaymentStatus = 'paid' | 'hold' | 'pending'

export interface CustomerPropertyRecord {
  id: string
  propertyId: string
  customer: string
  address: string
  status: CustomerStatus
  round: string
  frequency: string
  price: string
  technician: string
  nextDue: string
  paymentStatus: CustomerPaymentStatus
  amountDue?: string
  needsAssignment?: boolean
}

export interface CustomerFilterOption {
  value: string
  label: string
}

export const customersContent = {
  header: {
    title: 'Customers & Properties',
    subtitle: 'Showing 5 sample customers with complete records',
  },
  howToUse:
    'How to use: Click any customer row below to view their full property record. All text on this screen is selectable - just highlight and copy (Ctrl/Cmd+C).',
  search: {
    label: 'Search customers',
    placeholder: 'Search customers by name, address, or postcode...',
  },
  metrics: [
    { id: 'total', label: 'Total Customers', value: '5', tone: 'default' },
    { id: 'active', label: 'Active', value: '2', tone: 'success' },
    { id: 'payment-holds', label: 'Payment Holds', value: '1', tone: 'danger' },
    { id: 'amount-due', label: 'Amount Due', value: '£84', tone: 'warning' },
  ] satisfies {
    id: string
    label: string
    value: string
    tone: 'default' | 'success' | 'danger' | 'warning'
  }[],
  filters: {
    round: {
      label: 'Rounds',
      options: [
        { value: 'all', label: 'All' },
        { value: 'alnwick-monday', label: 'Alnwick Monday' },
        { value: 'alnwick-tuesday', label: 'Alnwick Tuesday' },
        { value: 'morpeth-wednesday', label: 'Morpeth Wednesday' },
        { value: 'not-assigned', label: 'Not Assigned' },
      ] satisfies CustomerFilterOption[],
    },
    status: {
      label: 'Status',
      allLabel: 'All Statuses',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'hold', label: 'Hold' },
        { value: 'payment-overdue', label: 'Payment Overdue' },
        { value: 'cancelled', label: 'Cancelled' },
      ] satisfies CustomerFilterOption[],
    },
  },
  recordLabels: {
    round: 'Round',
    frequency: 'Frequency',
    price: 'Price',
    technician: 'Technician',
    nextDue: 'Next Due',
    paymentStatus: 'Payment Status',
  },
  statusLabels: {
    active: 'Active',
    hold: 'Hold',
    cancelled: 'Cancelled',
    paid: 'paid',
    pending: 'pending',
  },
  assignment: {
    title: 'Not assigned to a round or technician yet',
    description:
      'Assign this property to a round so visits can be scheduled and payments collected.',
    action: 'Assign to Round & Technician',
  },
  assignToRoundModal: {
    title: 'Assign to Round',
    subtitle: '{customer} — {address}',
    fields: {
      round: 'Round',
      technician: 'Technician',
      roundPlaceholder: 'Select round',
      technicianPlaceholder: 'Select technician',
      technicianHint: 'The technician assigned to the selected round will be pre-filled',
    },
    rounds: [
      { value: '', label: 'Select round' },
      { value: 'alnwick-monday', label: 'Alnwick Monday', technicianId: 'james' },
      { value: 'alnwick-tuesday', label: 'Alnwick Tuesday', technicianId: 'james' },
      { value: 'morpeth-wednesday', label: 'Morpeth Wednesday', technicianId: 'james' },
      { value: 'bamburgh-friday', label: 'Bamburgh Friday', technicianId: 'sarah' },
    ],
    technicianOptions: [
      { value: '', label: 'Select technician' },
      { value: 'james', label: 'James' },
      { value: 'sarah', label: 'Sarah' },
    ] satisfies CustomerFilterOption[],
    actions: {
      cancel: 'Cancel',
      confirm: 'Assign Property',
    },
    successToast: 'Property assigned to round',
  },
  emptyLabel: 'No customers match the selected filters.',
  records: [
    {
      id: 'customer-1',
      propertyId: '12-market-street',
      customer: 'John Smith',
      address: '12 Market Street, NE66 1SS',
      status: 'active',
      round: 'Alnwick Monday',
      frequency: 'Every 4 weeks',
      price: '£35',
      technician: 'James',
      nextDue: '15/06/2026',
      paymentStatus: 'paid',
    },
    {
      id: 'customer-2',
      propertyId: '45-bondgate-within',
      customer: 'Mary Johnson',
      address: '45 Bondgate Within, NEE 1SX',
      status: 'active',
      round: 'Alnwick Tuesday',
      frequency: 'Every 4 weeks',
      price: '£35',
      technician: 'James',
      nextDue: '15/06/2026',
      paymentStatus: 'paid',
    },
    {
      id: 'customer-3',
      propertyId: '12-market-street-hold',
      customer: 'John Smith',
      address: '12 Market Street, NE66 1SS',
      status: 'hold',
      round: 'Alnwick Monday',
      frequency: 'Every 4 weeks',
      price: '£35',
      technician: 'James',
      nextDue: '15/06/2026',
      paymentStatus: 'hold',
      amountDue: '£84 due',
    },
    {
      id: 'customer-4',
      propertyId: '12-avenue-park',
      customer: 'David Beckham',
      address: '12 Avenue Park, NE67 1DD',
      status: 'active',
      round: 'Not Assigned',
      frequency: 'Every 4 weeks',
      price: '£35',
      technician: 'Not assigned',
      nextDue: '—',
      paymentStatus: 'pending',
      needsAssignment: true,
    },
    {
      id: 'customer-5',
      propertyId: '12-market-street-morpeth',
      customer: 'John Smith',
      address: '12 Market Street, NE66 1SS',
      status: 'active',
      round: 'Morpeth Wednesday',
      frequency: 'Every 4 weeks',
      price: '£35',
      technician: 'James',
      nextDue: '15/06/2026',
      paymentStatus: 'paid',
    },
  ] satisfies CustomerPropertyRecord[],
} as const

export function getCustomerRecordByPropertyId(propertyId: string): CustomerPropertyRecord | null {
  return customersContent.records.find((record) => record.propertyId === propertyId) ?? null
}
