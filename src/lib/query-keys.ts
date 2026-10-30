import type { QueryClient } from '@tanstack/react-query'

/** Debt board page size — matches the backend default (max 100). */
export const DEBT_BOARD_PAGE_SIZE = 50

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
    preferences: ['auth', 'preferences'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpis: ['dashboard', 'kpis'] as const,
    alerts: ['dashboard', 'alerts'] as const,
    rounds: ['dashboard', 'rounds'] as const,
    technicianKpis: (period: string) => ['dashboard', 'technician-kpis', period] as const,
    charts: (range: string, technicianIds: readonly string[] = []) =>
      ['dashboard', 'charts', range, [...technicianIds].sort().join(',')] as const,
  },
  emergencies: {
    all: ['emergencies'] as const,
    list: (status?: string) => ['emergencies', 'list', status ?? 'ALL'] as const,
    detail: (id: string) => ['emergencies', 'detail', id] as const,
    availableTechnicians: (id: string) => ['emergencies', 'available-technicians', id] as const,
  },
  setup: {
    all: ['setup'] as const,
    status: ['setup', 'status'] as const,
    step: (n: number) => ['setup', 'step', n] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (filters: Record<string, string | number | undefined>) =>
      ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    /** GET /customers/:id/visits — full history incl. CANCELLED (GAP-020). */
    visits: (id: string, page = 1) => ['customers', 'visits', id, page] as const,
  },
  properties: {
    all: ['properties'] as const,
    notes: (id: string) => ['properties', 'notes', id] as const,
  },
  /** GAP-019 photo galleries (signed URLs expire after 1 h — refetched on focus). */
  photos: {
    all: ['photos'] as const,
    property: (id: string, type = 'ALL', page = 1) => ['photos', 'property', id, type, page] as const,
    technician: (id: string, page = 1) => ['photos', 'technician', id, page] as const,
    visit: (id: string) => ['photos', 'visit', id] as const,
  },
  rounds: {
    all: ['rounds'] as const,
    list: (status?: string) => ['rounds', 'list', status ?? 'ALL'] as const,
    detail: (id: string) => ['rounds', 'detail', id] as const,
    /** GET /rounds/:id/allocation (GAP-012). */
    allocation: (id: string) => ['rounds', 'allocation', id] as const,
    today: (id: string) => ['rounds', 'today', id] as const,
    /** Batch occurrences for a chunk of rounds (ids joined in request order). */
    occurrencesBatch: (roundIds: readonly string[], from?: string, to?: string) =>
      ['rounds', 'occurrences-batch', roundIds.join(','), from ?? '', to ?? ''] as const,
    occurrences: (id: string, from?: string, to?: string) =>
      ['rounds', 'occurrences', id, from ?? '', to ?? ''] as const,
    /** Day stops for many rounds in one call (GET /rounds/planner/occurrences/:date). */
    occurrenceDayBatch: (roundIds: readonly string[], date: string) =>
      ['rounds', 'occurrence-day-batch', date, [...roundIds].sort().join(',')] as const,
    occurrenceDay: (id: string, date: string) =>
      ['rounds', 'occurrence-day', id, date] as const,
  },
  today: {
    all: ['today'] as const,
    aggregate: ['today', 'aggregate'] as const,
  },
  technicians: {
    all: ['technicians'] as const,
    list: ['technicians', 'list'] as const,
    detail: (id: string) => ['technicians', 'detail', id] as const,
    performance: (id: string, period: string) => ['technicians', 'performance', id, period] as const,
    availability: (id: string) => ['technicians', 'availability', id] as const,
    incidents: (id: string, type = 'ALL') => ['technicians', 'incidents', id, type] as const,
  },
  complaints: {
    all: ['complaints'] as const,
    list: (filters: Record<string, string | undefined>) =>
      ['complaints', 'list', filters] as const,
    detail: (id: string) => ['complaints', 'detail', id] as const,
    messages: (id: string) => ['complaints', 'messages', id] as const,
  },
  reports: {
    all: ['reports'] as const,
    summary: (period: string) => ['reports', 'summary', period] as const,
    revenue: (period: string, granularity: string) =>
      ['reports', 'revenue', period, granularity] as const,
    technicians: (period: string, page = 1) => ['reports', 'technicians', period, page] as const,
    visits: (period: string, status?: string, page = 1) =>
      ['reports', 'visits', period, status ?? 'ALL', page] as const,
    activity: (type?: string) => ['reports', 'activity', type ?? 'ALL'] as const,
  },
  invites: {
    all: ['invites'] as const,
    preview: (token: string) => ['invites', 'preview', token] as const,
  },
  debt: {
    all: ['debt'] as const,
    kpis: ['debt', 'kpis'] as const,
    board: (
      bucket: string,
      roundId?: string,
      paymentMethod?: string,
      page = 1,
      pageSize = DEBT_BOARD_PAGE_SIZE,
      search = '',
    ) =>
      ['debt', 'board', bucket, roundId ?? 'ALL', paymentMethod ?? 'ALL', page, pageSize, search] as const,
    /** Every tab's total (GET /debt/board/counts). */
    boardCounts: (roundId?: string, paymentMethod?: string, search = '') =>
      ['debt', 'board-counts', roundId ?? 'ALL', paymentMethod ?? 'ALL', search] as const,
    detail: (invoiceId: string) => ['debt', 'detail', invoiceId] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    preview: (visitId: string) => ['invoices', 'preview', visitId] as const,
    detail: (id: string) => ['invoices', 'detail', id] as const,
    byCustomer: (customerId: string) => ['invoices', 'customer', customerId] as const,
    /** GET /invoices (GAP-028). */
    list: (filters: Record<string, string | number | undefined>) => ['invoices', 'list', filters] as const,
    /** POST /invoices/bulk/preview (GAP-014) — keyed by the excluded visits too. */
    bulkPreview: (date: string, excludeVisitIds: readonly string[] = []) =>
      ['invoices', 'bulk-preview', date, [...excludeVisitIds].sort().join(',')] as const,
  },
  payments: {
    all: ['payments'] as const,
    /** GET /payments (GAP-028). */
    list: (filters: Record<string, string | number | undefined>) => ['payments', 'list', filters] as const,
  },
  settings: {
    all: ['settings'] as const,
    businessProfile: ['settings', 'business-profile'] as const,
    roundSettings: ['settings', 'round-settings'] as const,
    payment: ['settings', 'payment'] as const,
    services: ['settings', 'services'] as const,
    serviceAreas: ['settings', 'service-areas'] as const,
    technicians: ['settings', 'technicians'] as const,
    messageTemplates: ['settings', 'message-templates'] as const,
  },
} as const

export function invalidateBusinessSettings(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.businessProfile }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.roundSettings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.payment }),
  ])
}

export function invalidateCustomers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
}

export function invalidateRounds(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all })
}

export function invalidateToday(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.today.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all }),
  ])
}

export function invalidateTechnicians(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.technicians.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.settings.technicians }),
  ])
}

export function invalidateDebt(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.debt.all })
}

export function invalidateInvoices(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
}

export function invalidatePayments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
}

/**
 * A change to a customer's service (hold, pause / resume, frequency move): the customer
 * header, Today's Work and the planner all read it (GAP-018/020/026).
 */
export function invalidateServiceChange(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.properties.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.today.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.debt.all }),
  ])
}

export function invalidateComplaints(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all })
}

export function invalidateDashboard(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
}

export function invalidateEmergencies(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.emergencies.all }),
    // Reassignment moves today's unfinished visits to another technician.
    queryClient.invalidateQueries({ queryKey: queryKeys.today.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.rounds.all }),
  ])
}
