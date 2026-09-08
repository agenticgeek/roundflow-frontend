export type DebtStatusTab =
  | 'invoice-sent'
  | 'due-before'
  | 'failed-gc'
  | '7-days-over'
  | '14-days-over'
  | 'on-hold'
  | 'bad-debt'

export type DebtContactStatus = 'not-contacted' | 'contacted'

export type DebtPaymentMethod =
  | 'GoCardless'
  | 'BACS'
  | 'Cash'
  | 'Standing Order'
  | 'Cheque'
  | 'Stripe'

export type DebtVisitPaymentStatus = 'paid' | 'unpaid'

export interface DebtRecentVisit {
  date: string
  amount: string
  paymentStatus: DebtVisitPaymentStatus
}

export interface DebtCustomerRecord {
  id: string
  invoiceId?: string
  invoiceNumber?: string
  customerId?: string
  customer: string
  address: string
  amountOwed: string
  amountValue: number
  paymentMethod: DebtPaymentMethod
  round: string
  status: DebtStatusTab
  contactStatus: DebtContactStatus
  lastContact?: string
  hasAlert?: boolean
  badDebt?: boolean
  holdNextClean?: boolean
  phone: string
  email: string
  invoiceDate: string
  daysOverdue: number
  gocardlessId?: string
  nextVisit: string
  nextCleanBlocked: boolean
  recentVisits: DebtRecentVisit[]
}

export const debtPaymentContent = {
  title: 'Debt / Payment Risk Board',
  subtitle: 'Track overdue payments, failed collections, and customers at risk before the next clean',
  searchPlaceholder: 'Search customers by name, address, or postcode...',
  filters: {
    methods: {
      label: 'Methods',
      options: [
        { value: 'all', label: 'All Methods' },
        { value: 'gocardless', label: 'GoCardless' },
        { value: 'bacs', label: 'BACS' },
        { value: 'cash', label: 'Cash' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'stripe', label: 'Stripe' },
      ],
    },
  },
  menu: {
    flagBadDebt: 'Flag Bad Debt',
    clearBadDebt: 'Clear Bad Debt',
    holdNextClean: 'Hold Next Clean',
    clearHold: 'Clear Hold',
  },
  metrics: [
    {
      id: 'total-outstandings',
      label: 'Total Outstandings',
      value: '£2,264',
      helper: 'Across 27 customers',
      tone: 'accent',
    },
    {
      id: 'failed-gocardless',
      label: 'Failed GoCardless',
      value: '5',
      helper: 'Requires immediate follow-up',
      tone: 'danger',
    },
    {
      id: 'due-before-clean',
      label: 'Due Before Clean',
      value: '2',
      helper: 'Next clean within 7 days',
      tone: 'warning',
    },
    {
      id: 'hold-next-clean',
      label: 'Hold Next Clean',
      value: '5',
      helper: 'Blocked from next visit',
      tone: 'accent',
    },
    {
      id: 'bad-debt',
      label: 'Bad Debt',
      value: '£460',
      helper: 'Manually flagged',
      tone: 'danger',
    },
  ],
  statusTabs: [
    { id: 'invoice-sent', label: 'Invoice Sent', count: 6, hasAlert: false },
    { id: 'due-before', label: 'Due Before', count: 2, hasAlert: false },
    { id: 'failed-gc', label: 'Failed GC', count: 5, hasAlert: true },
    { id: '7-days-over', label: '7 Days Over', count: 4, hasAlert: true },
    { id: '14-days-over', label: '14 Days Over', count: 2, hasAlert: true },
    { id: 'on-hold', label: 'On Hold', count: 6, hasAlert: true },
    { id: 'bad-debt', label: 'Bad Debt', count: 2, hasAlert: true },
  ] satisfies { id: DebtStatusTab; label: string; count: number; hasAlert: boolean }[],
  resultsLabel: '{label} — {count} results',
  selectAll: 'Select all',
  actions: {
    sendReminder: 'Send Reminder',
    viewInvoice: 'View Invoice',
    moreOptions: 'More options',
  },
  contactLabels: {
    'not-contacted': 'Not yet contacted',
    contacted: 'Contacted',
  },
  lastContactLabel: 'Last contact: {when}',
  owedSuffix: 'owed',
  reminderToast: 'Reminder sent to {customer}',
  detailPanel: {
    sections: {
      paymentSummary: 'Payment Summary',
      nextCleanRisk: 'Next Clean Risk',
      contact: 'Contact',
      recentVisits: 'Recent Visits',
    },
    stats: {
      outstanding: 'Outstanding',
      overdue: 'Overdue',
      method: 'Method',
    },
    fields: {
      invoiceDate: 'Invoice Date',
      amountOwed: 'Amount Owed',
      daysOverdue: 'Days Overdue',
      paymentMethod: 'Payment Method',
      gocardlessId: 'GoCardless ID',
      round: 'Round',
      nextVisit: 'Next Visit',
      nextCleanBlocked: 'Next clean blocked?',
      lastContact: 'Last contact',
    },
    overdueEmpty: '—',
    notYetOverdue: 'Not yet overdue',
    blockedYes: 'Yes',
    blockedNo: 'No',
    completedVisit: 'Completed',
    visitPayment: {
      paid: 'Paid',
      unpaid: 'Unpaid',
    },
    actions: {
      sendReminder: 'Send Reminder',
      paymentLink: 'Payment Link',
      pauseService: 'Pause Service',
      resumeService: 'Resume Service',
      exportInvoice: 'Export Invoice or Download PDF',
    },
    toasts: {
      paymentLink: 'Payment link sent to {customer}',
      pauseService: 'Service paused for {customer}',
      resumeService: 'Service resumed for {customer}',
      exportInvoice: 'Invoice export started for {customer}',
    },
  },
  reminderModal: {
    title: 'Send Payment Reminder',
    toLabel: 'To',
    sendVia: 'Send via',
    channels: [
      { id: 'sms', label: 'SMS' },
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'email', label: 'EMAIL' },
    ] as const,
    templateLabel: 'Template',
    messageLabel: 'Message',
    characterCount: '{count} characters',
    templates: [
      {
        value: 'gentle',
        label: 'Gentle Reminder',
        body: 'Hi {firstName}, just a friendly reminder that you have an outstanding balance of {amount} on your account. Please arrange payment at your earliest convenience. Thanks!',
      },
      {
        value: 'firm',
        label: 'Firm Reminder',
        body: 'Hi {firstName}, your account still has an outstanding balance of {amount}. Please settle payment soon to avoid interruption to your next clean. Thanks!',
      },
      {
        value: 'final',
        label: 'Final Notice',
        body: 'Hi {firstName}, this is a final reminder regarding your outstanding balance of {amount}. Please arrange payment immediately to keep your service active.',
      },
    ],
    actions: {
      cancel: 'Cancel',
      send: 'Send Reminder',
    },
    successToast: 'Reminder sent to {customer}',
  },
  paymentLinkModal: {
    title: 'Send Payment Link',
    fields: {
      customer: 'Customer',
      amount: 'Amount to collect',
      method: 'Payment Method',
      expiry: 'Link Expiry',
      message: 'Message to customer',
    },
    helper: 'A unique payment link will be generated and appended to the message automatically.',
    methods: [
      { value: 'stripe-link', label: 'Stripe Link' },
      { value: 'gocardless', label: 'GoCardless' },
      { value: 'bank-transfer', label: 'Bank Transfer' },
    ],
    expiryOptions: [
      { value: '3', label: '3 days' },
      { value: '7', label: '7 days' },
      { value: '14', label: '14 days' },
      { value: '30', label: '30 days' },
    ],
    defaultMessage:
      'Hi {firstName}, here is your secure payment link for {amount}. Please pay at your earliest convenience. Thank you.',
    actions: {
      cancel: 'Cancel',
      send: 'Generate & Send Link',
    },
    successToast: 'Payment link sent to {customer}',
  },
  pauseModal: {
    title: 'Pause Service',
    fields: {
      customer: 'Customer',
      reason: 'Reason',
      pauseFrom: 'Pause From',
    },
    reasons: [
      { value: 'outstanding', label: 'Outstanding Balance Unpaid' },
      { value: 'customer-request', label: 'Customer Request' },
      { value: 'failed-payment', label: 'Failed Payment' },
      { value: 'other', label: 'Other' },
    ],
    defaultPauseFrom: '2025-05-22',
    notifyLabel: 'Notify customer by SMS',
    notifyHelper: 'Send a message explaining the pause',
    defaultMessage:
      'Hi {firstName}, your window cleaning service has been temporarily paused due to an outstanding balance. Please contact us to arrange payment.',
    warning: 'Future visits will not be generated while this service is paused.',
    actions: {
      cancel: 'Cancel',
      pause: 'Pause Service',
    },
    successToast: 'Service paused for {customer}',
  },
  resumeModal: {
    title: 'Resume Service',
    fields: {
      customer: 'Customer',
      resumeFrom: 'Resume From',
      nextDue: 'Confirmed next due date',
    },
    defaultResumeFrom: '2025-06-01',
    notifyLabel: 'Notify customer of resumption',
    notifyHelper: 'Let them know service is back on',
    info: 'Visits will be regenerated from the resume date onwards.',
    actions: {
      cancel: 'Cancel',
      resume: 'Resume Service',
    },
    successToast: 'Service resumed for {customer}',
  },
  invoiceModal: {
    title: 'Invoice Preview',
    subtitle: '{customer} • {invoiceDate}',
    invoiceHeading: 'INVOICE',
    invoiceNumberPrefix: '#INV-2026-',
    billTo: 'BILL TO',
    invoiceDetails: 'INVOICE DETAILS',
    fields: {
      invoiceDate: 'Invoice Date',
      visitDate: 'Visit Date',
      dueDate: 'Due Date',
      payment: 'Payment',
    },
    table: {
      description: 'DESCRIPTION',
      technician: 'TECHNICIAN',
      amount: 'AMOUNT',
    },
    serviceTitle: 'Window Cleaning Service',
    serviceSubtitle: '{round} · {visitDate}',
    defaultTechnician: 'James Smith',
    totals: {
      subtotal: 'Subtotal',
      vat: 'VAT (0%)',
      totalDue: 'Total Due',
    },
    footer: 'Thank you for your business · RoundFlow · support@roundflow.co.uk',
    actions: {
      cancel: 'Cancel',
      print: 'Print',
      downloadPdf: 'Download PDF',
    },
    printToast: 'Print dialog opened',
    downloadToast: 'Invoice PDF download started',
  },
} as const
