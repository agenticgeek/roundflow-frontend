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
    subtitle: 'Every customer and the properties you service for them',
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
    actions: {
      cancel: 'Cancel',
      confirm: 'Assign Property',
    },
    successToast: 'Property assigned to round',
  },
  emptyLabel: 'No customers match the selected filters.',
} as const
