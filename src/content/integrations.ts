/** Settings > Failed integration messages (Wave 2B-1). */
export const failedMessagesContent = {
  heading: 'Failed integration messages',
  subheading: 'Messages RoundFlow could not hand to your messaging provider. Retry them once the problem is fixed.',
  filterLabel: 'Show',
  statusOptions: [
    { value: 'dead', label: 'Gave up' },
    { value: 'failed', label: 'Failed, will retry' },
  ],
  statuses: { dead: 'Gave up', failed: 'Failed, will retry' },
  table: {
    caption: 'Failed integration messages',
    scrollRegion: 'Failed messages, scrollable',
    event: 'Event',
    status: 'Status',
    attempts: 'Attempts',
    lastError: 'Last error',
    failedAt: 'Failed at',
    action: 'Action',
    noError: 'No error recorded',
  },
  loading: 'Loading failed messages…',
  loadFailed: 'Could not load failed messages.',
  retryLoading: 'Retry loading',
  empty: 'No failed messages. Everything RoundFlow tried to send went through.',
  retry: 'Retry',
  /** Spoken name of a row's button: "Retry message send from 5 Nov, 10:30". */
  retryRowLabel: 'Retry {event} from {time}',
  confirm: {
    title: 'Retry this message?',
    description: 'RoundFlow will try to send it again within about a minute. It is sent once it succeeds.',
    confirm: 'Retry message',
  },
  queued: 'Queued to try again',
  errors: {
    OUTBOX_NOT_FOUND: 'That message was not found.',
    OUTBOX_NOT_REPLAYABLE: 'Only failed messages can be retried.',
  } as Record<string, string>,
} as const
