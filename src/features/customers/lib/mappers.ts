import type {
  CleaningFrequency,
  CustomerDetail,
  CustomerListRow,
  CustomerListRowPaymentStatus,
  LifecycleStatus,
  NoteType,
  PaymentMethod,
} from '@/api/types'
import type {
  CustomerPaymentStatus,
  CustomerPropertyRecord,
  CustomerStatus,
} from '@/content/customers'
import type {
  PropertyDetailRecord,
  PropertyNoteCategory,
  PropertyNoteRecord,
  PropertyPaymentRecord,
  PropertyPaymentStatus,
  PropertyPlanStatus,
  PropertyServiceStatus,
  PropertyVisitRecord,
  VisitInvoiceAction,
  VisitPaymentStatus,
  VisitStatus,
} from '@/content/property-detail'

const FREQUENCY_LABELS: Record<CleaningFrequency, string> = {
  FORTNIGHTLY: 'Fortnightly',
  FOUR_WEEKLY: 'Every 4 weeks',
  SIX_WEEKLY: 'Every 6 weeks',
  EIGHT_WEEKLY: 'Every 8 weeks',
  MONTHLY: 'Monthly',
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  GOCARDLESS: 'GoCardless',
  STRIPE: 'Stripe',
  CASH: 'Cash',
  BACS: 'Bank transfer',
  CHEQUE: 'Cheque',
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return undefined
  return `£${value.toFixed(value % 1 === 0 ? 0 : 2)}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function mapListStatus(
  status: LifecycleStatus | undefined,
  onHold: boolean | undefined,
): CustomerStatus {
  if (onHold) return 'hold'
  if (status === 'CANCELLED') return 'cancelled'
  if (status === 'PAUSED') return 'hold'
  return 'active'
}

function mapPaymentStatus(
  status: CustomerListRowPaymentStatus | string | undefined,
): CustomerPaymentStatus {
  if (status === 'hold') return 'hold'
  if (status === 'pending' || status === 'overdue' || status === 'failed') return 'pending'
  return 'paid'
}

export function customerListRowToRecord(row: CustomerListRow): CustomerPropertyRecord {
  const customerId = row.customerId ?? ''
  const propertyId = row.propertyId ?? customerId
  const address = [row.addressLine, row.postcode].filter(Boolean).join(', ')
  const amountDue =
    row.amountDue != null && row.amountDue > 0 ? formatMoney(row.amountDue) : undefined

  return {
    id: customerId,
    propertyId,
    customer: row.customerName ?? '—',
    address: address || '—',
    status: mapListStatus(row.status, row.onHold),
    round: row.roundName ?? 'Not Assigned',
    frequency: row.frequency ? FREQUENCY_LABELS[row.frequency] : '—',
    price: formatMoney(row.price) ?? '—',
    technician: row.technicianName ?? '—',
    nextDue: formatDate(row.nextDueDate),
    paymentStatus: mapPaymentStatus(row.paymentStatus),
    amountDue,
    needsAssignment: !row.roundId,
  }
}

function mapServiceStatus(
  propertyStatus: LifecycleStatus | undefined,
  planStatus: LifecycleStatus | undefined,
  hasRound: boolean,
  onHold: boolean,
): PropertyServiceStatus {
  if (onHold) return 'hold'
  if (!hasRound) return 'unassigned'
  if (propertyStatus === 'PAUSED' || planStatus === 'PAUSED') return 'paused'
  return 'active'
}

function mapPlanStatus(
  planStatus: LifecycleStatus | undefined,
  hasRound: boolean,
  onHold: boolean,
): PropertyPlanStatus {
  if (onHold) return 'hold'
  if (!hasRound) return 'pending'
  if (planStatus === 'PAUSED') return 'paused'
  return 'active'
}

function mapDetailPaymentStatus(
  status: string | undefined,
): PropertyPaymentStatus {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'hold') return 'hold'
  if (normalized === 'pending' || normalized === 'overdue' || normalized === 'failed') {
    return 'pending'
  }
  return 'paid'
}

export function customerDetailToPropertyRecord(
  detail: CustomerDetail,
): PropertyDetailRecord | null {
  const customer = detail.customer
  const property = detail.property
  const plan = detail.servicePlan
  const standing = detail.standingInfo
  if (!customer?.id) return null

  const hasRound = Boolean(property?.roundId)
  const onHold = (standing?.paymentStatus ?? '').toLowerCase() === 'hold'
  const addressLine = property?.addressLine ?? ''
  const postcode = property?.postcode ?? ''
  const fullAddress = [addressLine, postcode].filter(Boolean).join(', ') || '—'

  return {
    id: property?.id ?? customer.id,
    customerName: customer.name ?? '—',
    shortAddress: addressLine || '—',
    fullAddress,
    serviceStatus: mapServiceStatus(property?.status, plan?.status, hasRound, onHold),
    roundLabel: property?.roundName ?? 'Not Assigned',
    propertyType: property?.propertyType ?? '—',
    frequency: standing?.frequency
      ? FREQUENCY_LABELS[standing.frequency]
      : '—',
    price: formatMoney(plan?.price) ?? '—',
    cleanMethod: plan?.cleanMethod ?? '—',
    nextDue: formatDate(plan?.nextDueDate),
    lastCompleted: formatDate(plan?.lastCompleted),
    assignedRound: standing?.assignedRound ?? property?.roundName ?? 'Not Assigned',
    technician: standing?.technicianName ?? '—',
    paymentStatus: mapDetailPaymentStatus(standing?.paymentStatus),
    outstandingBalance:
      standing?.outstandingBalance != null
        ? (formatMoney(standing.outstandingBalance) ?? '£0')
        : '—',
    paymentMethod: plan?.paymentMethod
      ? PAYMENT_METHOD_LABELS[plan.paymentMethod]
      : '—',
    lastPayment: formatDate(standing?.lastPaymentDate),
    issuesCount: standing?.issuesCount ?? 0,
    nextVisitStatus: standing?.nextVisitStatus ?? '—',
    accessNotes: property?.accessNotes?.trim() || 'No access notes',
    riskNotes: property?.riskNotes?.trim() || 'No risk notes',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    serviceType: plan?.serviceName ?? undefined,
    planStatus: mapPlanStatus(plan?.status, hasRound, onHold),
    needsAssignment: !hasRound,
    customerRecordId: customer.id,
  }
}

function mapVisitStatus(status: string | undefined): VisitStatus {
  return status === 'COMPLETED' ? 'completed' : 'scheduled'
}

function mapVisitPayment(status: string | null | undefined): VisitPaymentStatus {
  return status === 'PAID' ? 'paid' : 'pending'
}

export function customerDetailToVisits(detail: CustomerDetail): PropertyVisitRecord[] {
  return (detail.tabs?.visitHistory ?? []).map((row, index) => ({
    id: row.visitId ?? `visit-${index}`,
    visitDate: formatDate(row.date),
    round: row.roundName ?? '—',
    technician: '—',
    status: mapVisitStatus(row.status),
    payment: mapVisitPayment(row.paymentStatus),
    price: '—',
    invoice: (row.paymentStatus === 'PAID' ? 'sent' : 'generate') as VisitInvoiceAction,
  }))
}

export function customerDetailToPayments(
  detail: CustomerDetail,
): PropertyPaymentRecord[] | undefined {
  const payments = detail.tabs?.payments
  if (payments === undefined) return undefined

  return (payments.rows ?? []).map((row, index) => ({
    id: row.paymentId ?? row.visitId ?? `payment-${index}`,
    visitDate: formatDate(row.visitDate),
    visitDateRaw: row.visitDate ?? '',
    round: '—',
    technician: row.technicianName ?? '—',
    amount: formatMoney(row.amount) ?? '—',
    payment: row.paymentStatus === 'PAID' ? 'paid' : 'unpaid',
    invoice: row.canDownload ? 'sent' : 'none',
    action: row.canDownload ? 'download' : 'generate',
  }))
}

function noteTypeToCategory(type: NoteType | undefined): PropertyNoteCategory {
  if (type === 'RISK_WARNING') return 'risk'
  if (type === 'CUSTOMER') return 'customer'
  return 'internal'
}

export function customerDetailToNotes(detail: CustomerDetail): PropertyNoteRecord[] {
  return (detail.tabs?.notes ?? []).map((note, index) => ({
    id: note.id ?? `note-${index}`,
    category: noteTypeToCategory(note.type),
    body: note.body ?? '',
    author: note.authorName ?? 'Unknown',
    addedOn: formatDate(note.createdAt),
  }))
}

export function categoryToNoteType(category: PropertyNoteCategory): NoteType {
  if (category === 'risk') return 'RISK_WARNING'
  if (category === 'customer') return 'CUSTOMER'
  return 'INTERNAL'
}

export { FREQUENCY_LABELS, PAYMENT_METHOD_LABELS, formatDate, formatMoney }
