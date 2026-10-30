/**
 * Copy for the shared billing / messaging / photo building blocks used across screens
 * (channel picker, messaging-error CTAs, "Mark as paid", photo gallery).
 */
export const sharedActionsContent = {
  channel: {
    label: 'Send via',
    options: [
      { value: 'AUTO', label: 'Auto' },
      { value: 'SMS', label: 'SMS' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
    ],
    autoHint: 'Auto sends an SMS when the customer has a mobile, otherwise an email.',
  },
  messagingErrors: {
    STRIPE_NOT_CONNECTED: { cta: 'Connect Stripe', hint: 'Payment links need Stripe connected.' },
    GHL_NOT_CONNECTED: { cta: 'Connect messaging', hint: 'Messages are sent through GoHighLevel.' },
    NO_CONTACT_FOR_CHANNEL: { cta: null, hint: 'Pick another channel, or add the contact detail to the customer.' },
    GHL_SEND_FAILED: { cta: 'Check messaging', hint: 'GoHighLevel rejected the message. Try again or check the connection.' },
  },
  markPaid: {
    action: 'Mark as paid',
    title: 'Mark invoice as paid',
    subtitle: 'Record a payment received outside RoundFlow.',
    methodLabel: 'Payment method',
    methods: [
      { value: 'BACS', label: 'Bank transfer (BACS)' },
      { value: 'CHEQUE', label: 'Cheque' },
      { value: 'CASH', label: 'Cash' },
    ],
    referenceLabel: 'Reference',
    referencePlaceholder: 'e.g. CHQ 000123',
    referenceTooLong: 'Keep the reference under 100 characters.',
    dateLabel: 'Date received',
    dateRequired: 'Enter the date the payment was received.',
    cancel: 'Cancel',
    save: 'Mark as paid',
    saving: 'Saving…',
    done: 'Invoice {invoice} marked as paid',
  },
  photos: {
    empty: 'No photos yet. Photos taken in the technician app appear here.',
    loadError: 'Photos could not be loaded.',
    retry: 'Retry',
    before: 'Before',
    after: 'After',
    property: 'Property',
    accessIssue: 'Access issue',
    unavailable: 'Photo unavailable',
    visit: 'Visit {date}',
    noVisit: 'Property photos',
    takenBy: 'by {name}',
    open: 'Open photo: {label}',
    lightboxTitle: 'Photo',
    close: 'Close',
    previous: 'Previous photo',
    next: 'Next photo',
    counter: '{index} of {total}',
  },
} as const
