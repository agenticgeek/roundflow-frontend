import type {
  DebtBoardItem,
  DebtBucket,
  DebtInvoiceDetail,
  DebtKpis,
  DebtPaymentMethodParam,
} from '@/api/debt.api'
import type {
  DebtCustomerRecord,
  DebtPaymentMethod,
  DebtRecentVisitTone,
  DebtStatusTab,
} from '@/content/debt-payment'
import { debtPaymentContent } from '@/content/debt-payment'

export const DEBT_BUCKETS: DebtBucket[] = [
  'INVOICE_SENT',
  'DUE_BEFORE_CLEAN',
  'FAILED_GC',
  'SEVEN_DAYS_OVER',
  'FOURTEEN_DAYS_OVER',
  'ON_HOLD',
  'BAD_DEBT',
]

export const UI_TAB_TO_BUCKET: Record<DebtStatusTab, DebtBucket> = {
  'invoice-sent': 'INVOICE_SENT',
  'due-before': 'DUE_BEFORE_CLEAN',
  'failed-gc': 'FAILED_GC',
  '7-days-over': 'SEVEN_DAYS_OVER',
  '14-days-over': 'FOURTEEN_DAYS_OVER',
  'on-hold': 'ON_HOLD',
  'bad-debt': 'BAD_DEBT',
}

export const BUCKET_TO_UI_TAB: Record<DebtBucket, DebtStatusTab> = {
  INVOICE_SENT: 'invoice-sent',
  DUE_BEFORE_CLEAN: 'due-before',
  FAILED_GC: 'failed-gc',
  SEVEN_DAYS_OVER: '7-days-over',
  FOURTEEN_DAYS_OVER: '14-days-over',
  ON_HOLD: 'on-hold',
  BAD_DEBT: 'bad-debt',
}

export const UI_METHOD_TO_API: Record<string, DebtPaymentMethodParam | undefined> = {
  all: undefined,
  gocardless: 'GOCARDLESS',
  cash: 'CASH',
  cheque: 'CHEQUE',
  bacs: 'BACS',
  stripe: 'STRIPE',
}

function formatMoney(value: number) {
  return `£${value.toLocaleString('en-GB', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

function paymentMethodLabel(method: string): DebtPaymentMethod {
  switch (method) {
    case 'GOCARDLESS':
      return 'GoCardless'
    case 'BACS':
      return 'BACS'
    case 'CASH':
      return 'Cash'
    case 'CHEQUE':
      return 'Cheque'
    case 'STRIPE':
      return 'Stripe'
    default:
      return method as DebtPaymentMethod
  }
}

function daysAgoLabel(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const diffMs = Date.now() - date.getTime()
  const days = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function daysOverdue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return 0
  const diffMs = Date.now() - due.getTime()
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}

function formatInvoiceDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** GAP-031: "Across N customers" from `totalOutstandingsCount` (0 when an older API omits it). */
function customersCaption(count: number | undefined) {
  const total = count ?? 0
  return `Across ${total} customer${total === 1 ? '' : 's'}`
}

export function kpisToMetrics(kpis: DebtKpis | undefined) {
  return [
    {
      id: 'total-outstandings',
      label: 'Total Outstandings',
      value: kpis ? formatMoney(kpis.totalOutstandings) : '—',
      helper: kpis ? customersCaption(kpis.totalOutstandingsCount) : '—',
      tone: 'accent' as const,
    },
    {
      id: 'failed-gocardless',
      label: 'Failed GoCardless',
      value: kpis ? String(kpis.failedGoCardless) : '—',
      helper: 'Requires immediate follow-up',
      tone: 'danger' as const,
    },
    {
      id: 'due-before-clean',
      label: 'Due Before Clean',
      value: kpis ? String(kpis.dueBeforeClean) : '—',
      helper: 'Next clean within 7 days',
      tone: 'warning' as const,
    },
    {
      id: 'hold-next-clean',
      label: 'Hold Next Clean',
      value: kpis ? String(kpis.holdNextClean) : '—',
      helper: 'Blocked from next visit',
      tone: 'accent' as const,
    },
    {
      id: 'bad-debt',
      label: 'Bad Debt',
      value: kpis ? formatMoney(kpis.badDebt) : '—',
      helper: kpis ? `${kpis.badDebtCount ?? 0} manually flagged` : 'Manually flagged',
      tone: 'danger' as const,
    },
  ]
}

export function boardItemToRecord(
  item: DebtBoardItem,
  bucket: DebtBucket,
): DebtCustomerRecord {
  const lastContact = daysAgoLabel(item.lastContactedAt)
  const address = [item.addressLine, item.postcode].filter(Boolean).join(', ')

  return {
    // ON_HOLD rows are per customer and may have no invoice (GAP-026).
    id: item.invoiceId ?? `customer:${item.customerId}`,
    invoiceId: item.invoiceId ?? undefined,
    invoiceNumber: item.invoiceNumber ?? undefined,
    customerId: item.customerId,
    customer: item.customerName,
    address: address || '—',
    amountOwed: formatMoney(item.amount),
    amountValue: item.amount,
    paymentMethod: paymentMethodLabel(item.paymentMethod ?? '—'),
    paymentMethodCode: item.paymentMethod ?? null,
    round: '—',
    status: BUCKET_TO_UI_TAB[bucket],
    contactStatus: item.lastContactedAt ? 'contacted' : 'not-contacted',
    lastContact,
    badDebt: item.badDebt,
    holdNextClean: item.holdNextClean,
    phone: '—',
    email: '—',
    invoiceDate: formatInvoiceDate(item.dueDate),
    daysOverdue: daysOverdue(item.dueDate),
    nextVisit: '—',
    nextCleanBlocked: item.holdNextClean,
    recentVisits: [],
  }
}

export function boardToRecords(
  items: DebtBoardItem[] | undefined,
  bucket: DebtBucket,
): DebtCustomerRecord[] {
  return (items ?? []).map((item) => boardItemToRecord(item, bucket))
}

const VISIT_STATUS_TONE: Record<string, DebtRecentVisitTone> = {
  COMPLETED: 'success',
  SCHEDULED: 'neutral',
  IN_PROGRESS: 'warning',
  SKIPPED: 'danger',
  CANCELLED: 'neutral',
}

/**
 * Fills in what the board row doesn't carry (phone, email, round, next visit, mandate,
 * recent visits) from GET /debt/:id. The row's own fields stay as they are.
 */
export function withInvoiceDetail(
  record: DebtCustomerRecord,
  detail: DebtInvoiceDetail | undefined,
): DebtCustomerRecord {
  if (!detail) return record
  const statusLabels = debtPaymentContent.detailPanel.visitStatus
  return {
    ...record,
    phone: detail.phone || '—',
    email: detail.email || '—',
    round: detail.roundName ?? '—',
    nextVisit: detail.nextVisitDate ? formatInvoiceDate(detail.nextVisitDate) : '—',
    gocardlessId: detail.mandateId ?? undefined,
    mandateStatus: detail.mandateStatus ?? undefined,
    recentVisits: detail.recentVisits.map((visit) => ({
      id: visit.visitId,
      date: formatInvoiceDate(visit.date),
      amount: formatMoney(visit.amount),
      status: statusLabels[visit.status] ?? visit.status,
      tone: VISIT_STATUS_TONE[visit.status] ?? 'neutral',
    })),
  }
}
