import type {
  CleaningFrequency,
  CustomerDetail,
  CustomerListRow,
  CustomerListRowPaymentStatus,
  LifecycleStatus,
  NoteType,
  PaymentMethod,
  ServicePlanView,
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
  PropertyServicePlan,
  PropertyServicePlanStatus,
  PropertyServiceStatus,
  PropertyVisitRecord,
  VisitInvoiceAction,
  VisitPaymentStatus,
  VisitStatus,
} from '@/content/property-detail'

const FREQUENCY_LABELS: Record<CleaningFrequency, string> = {
  FOUR_WEEKLY: 'Every 4 weeks',
  SIX_WEEKLY: 'Every 6 weeks',
  EIGHT_WEEKLY: 'Every 8 weeks',
  TWELVE_WEEKLY: 'Every 12 weeks',
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

/**
 * All service plans on the customer's property. GET /customers/:id returns `servicePlans[]`
 * (multi-plan); falls back to `tabs.servicePlans`, then the legacy single `servicePlan`
 * for an environment still on the old backend.
 */
export function customerServicePlans(detail: CustomerDetail): ServicePlanView[] {
  if (detail.servicePlans) return detail.servicePlans
  if (detail.tabs?.servicePlans) return detail.tabs.servicePlans
  const legacy = detail.servicePlan ?? detail.tabs?.servicePlan
  return legacy ? [legacy] : []
}

/**
 * The plan standingInfo is based on. The backend now flags it (`isPrimary`); older responses
 * fall back to its old rule — first ACTIVE, else the first.
 */
export function primaryServicePlan(plans: readonly ServicePlanView[]): ServicePlanView | null {
  return (
    plans.find((plan) => plan.isPrimary) ??
    plans.find((plan) => plan.status === 'ACTIVE') ??
    plans[0] ??
    null
  )
}

function mapServicePlanStatus(status: LifecycleStatus | undefined): PropertyServicePlanStatus {
  if (status === 'PAUSED') return 'paused'
  if (status === 'CANCELLED') return 'cancelled'
  return 'active'
}

function servicePlanToRecord(
  plan: ServicePlanView,
  primary: ServicePlanView | null,
): PropertyServicePlan {
  const pauseWindow =
    plan.status === 'PAUSED' && (plan.pauseStartDate || plan.pauseEndDate)
      ? `${formatDate(plan.pauseStartDate)} – ${plan.pauseEndDate ? formatDate(plan.pauseEndDate) : 'until resumed'}`
      : null
  return {
    id: plan.id ?? '',
    serviceName: plan.serviceName?.trim() || '',
    frequency: plan.cleaningFrequency ? FREQUENCY_LABELS[plan.cleaningFrequency] : '—',
    price: formatMoney(plan.price) ?? '—',
    status: mapServicePlanStatus(plan.status),
    nextDue: formatDate(plan.nextDueDate),
    lastCompleted: formatDate(plan.lastCompleted),
    paymentMethod: plan.paymentMethod ? PAYMENT_METHOD_LABELS[plan.paymentMethod] : '—',
    pauseWindow,
    isPrimary: primary != null && plan.id === primary.id,
    values: {
      price: plan.price ?? null,
      cleaningFrequency: plan.cleaningFrequency ?? null,
      paymentMethod: plan.paymentMethod ?? null,
      cleanMethod: plan.cleanMethod ?? null,
    },
  }
}

export function customerDetailToPropertyRecord(
  detail: CustomerDetail,
): PropertyDetailRecord | null {
  const customer = detail.customer
  const property = detail.property
  const plans = customerServicePlans(detail)
  // Summary fields (price, next due, payment method…) follow the primary plan, matching
  // standingInfo on the backend; the Service Plan tab lists every plan.
  const plan = primaryServicePlan(plans)
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
    // CONTRACT-DIFF: the generated CustomerDetail.customer response type hasn't caught up
    // with landline yet, even though the Create/Update Customer input schemas already have it.
    landline: (customer as { landline?: string | null }).landline ?? '',
    email: customer.email ?? '',
    serviceType: serviceTypeLabel(plans),
    planStatus: mapPlanStatus(plan?.status, hasRound, onHold),
    needsAssignment: !hasRound,
    customerRecordId: customer.id,
    primaryPlanId: plan?.id ?? null,
    servicePlans: plans.map((item) => servicePlanToRecord(item, plan)),
  }
}

/** Service names of the non-cancelled plans, e.g. "Windows Only, Conservatory". */
function serviceTypeLabel(plans: readonly ServicePlanView[]): string | undefined {
  const names = plans
    .filter((item) => item.status !== 'CANCELLED')
    .map((item) => item.serviceName?.trim())
    .filter((name): name is string => Boolean(name))
  return names.length > 0 ? [...new Set(names)].join(', ') : undefined
}

function mapVisitStatus(status: string | undefined): VisitStatus {
  return status === 'COMPLETED' ? 'completed' : 'scheduled'
}

function mapVisitPayment(status: string | null | undefined): VisitPaymentStatus {
  return status === 'PAID' ? 'paid' : 'pending'
}

export function customerDetailToVisits(detail: CustomerDetail): PropertyVisitRecord[] {
  return (detail.tabs?.visitHistory ?? []).map((row, index) => {
    const extra = row as typeof row & {
      invoiceId?: string | null
      invoiceStatus?: string | null
    }
    const invoiceStatus = extra.invoiceStatus
    const invoice: VisitInvoiceAction =
      invoiceStatus === 'SENT' || invoiceStatus === 'PAID'
        ? 'sent'
        : invoiceStatus === 'DRAFT'
          ? 'draft'
          : extra.invoiceId
            ? 'draft'
            : 'generate'

    return {
      id: row.visitId ?? `visit-${index}`,
      visitDate: formatDate(row.date),
      round: row.roundName ?? '—',
      technician: '—',
      status: mapVisitStatus(row.status),
      payment: mapVisitPayment(row.paymentStatus),
      price: '—',
      invoice,
      invoiceId: extra.invoiceId ?? null,
    }
  })
}

export function customerDetailToPayments(
  detail: CustomerDetail,
): PropertyPaymentRecord[] | undefined {
  const payments = detail.tabs?.payments
  if (payments === undefined) return undefined

  return (payments.rows ?? []).map((row, index) => ({
    id: row.paymentId ?? row.visitId ?? `payment-${index}`,
    visitId: row.visitId,
    invoiceId: row.invoiceId ?? null,
    invoiceNumber: row.invoiceNumber ?? null,
    transactionId: row.transactionId ?? null,
    visitDate: formatDate(row.visitDate),
    visitDateRaw: row.visitDate ?? '',
    round: '—',
    technician: row.technicianName ?? '—',
    amount: formatMoney(row.amount) ?? '—',
    payment: row.paymentStatus === 'PAID' ? 'paid' : 'unpaid',
    invoice:
      row.invoiceStatus === 'DRAFT'
        ? 'draft'
        : row.invoiceStatus === 'SENT' || row.invoiceStatus === 'PAID' || row.canDownload
          ? 'sent'
          : 'none',
    action: row.canGenerate ? 'generate' : row.invoiceId || row.canDownload ? 'download' : 'generate',
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
