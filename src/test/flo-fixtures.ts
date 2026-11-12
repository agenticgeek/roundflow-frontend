import type { FloBlock, FloMessage } from '@/api/flo.api'

/**
 * Recorded example of `POST /flo/chat` (plan section 3.6 / 4). The backend contract doc ships the same
 * stream; if the contract changes, the tests that replay this fail.
 */
export type RecordedEvent = readonly [event: string, data: unknown]

const cards = {
  type: 'cards',
  items: [
    { label: 'Jobs completed', value: 781, format: 'integer', sub: 'of 810 scheduled (96.4%)', tone: 'neutral' },
    { label: 'Revenue', value: 13650, format: 'currency', tone: 'positive' },
    { label: 'Completion rate', value: 96.4, format: 'percent' },
  ],
} as const

const table = {
  type: 'table',
  title: 'Performance by technician',
  sourceId: 'r2',
  columns: [
    { key: 'technician', label: 'Technician', format: 'text', align: 'left' },
    { key: 'revenue', label: 'Revenue', format: 'currency', align: 'right' },
    { key: 'lastVisit', label: 'Last visit', format: 'date', align: 'right' },
  ],
  rows: [
    { technician: 'James Carter', revenue: 5460, lastVisit: '2026-10-29' },
    { technician: 'Liam Walsh', revenue: 8190, lastVisit: '2026-10-30' },
  ],
  totals: { technician: 'Total', revenue: 13650, lastVisit: null },
  link: { screen: 'REPORTS', params: { period: 'thisMonth' } },
} as const

export const exampleFinalMessage: FloMessage = {
  id: 'm1',
  role: 'ASSISTANT',
  mode: 'BALANCED',
  model: 'claude-sonnet-5-5',
  status: 'OK',
  createdAt: '2026-11-10T09:12:44.000Z',
  declined: null,
  answer: {
    intro: 'Here is October so far across your 3 active technicians.',
    dateRange: { from: '2026-10-01', to: '2026-10-30', label: '1 to 30 Oct 2026' },
    blocks: [cards, table] as unknown as FloBlock[],
    insights: [
      { text: 'Liam Walsh had the most skips (14).', unverified: false, link: { screen: 'ROUND', params: { roundId: 'r7' } } },
      { text: 'Revenue is up 12% on September.', unverified: true },
    ],
    followUps: ['Show the Round 7 skipped properties', 'Compare with September'],
    sources: [
      { id: 'r1', tool: 'compare_technicians', label: 'Technicians', rows: 3 },
      { id: 'r2', tool: 'list_debtors', label: 'Debt', rows: 1 },
    ],
    truncated: false,
  },
  warnings: ['UNVERIFIED_FIGURES'],
}

export const exampleStream: RecordedEvent[] = [
  ['start', { conversationId: 'c1', messageId: 'm1', mode: 'BALANCED' }],
  ['status', { phase: 'checking', tool: 'compare_technicians', label: 'Technicians' }],
  ['status', { phase: 'checking', tool: 'list_debtors', label: 'Debt' }],
  ['status', { phase: 'checked', tool: 'compare_technicians', label: 'Technicians', rows: 3 }],
  ['status', { phase: 'checked', tool: 'list_debtors', label: 'Debt', rows: 1 }],
  ['block', { index: 0, block: cards }],
  ['block', { index: 1, block: table }],
  ['text', { target: 'intro', index: 0, text: 'Here is October so far across your 3 active technicians.' }],
  ['text', { target: 'insight', index: 0, text: 'Liam Walsh had the most skips (14).' }],
  ['text', { target: 'insight', index: 1, text: 'Revenue is up 12% on September.', unverified: true }],
  ['follow_ups', { items: ['Show the Round 7 skipped properties', 'Compare with September'] }],
  ['warning', { code: 'UNVERIFIED_FIGURES' }],
  ['done', { message: exampleFinalMessage }],
]

export const declinedMessage: FloMessage = {
  id: 'm2',
  role: 'ASSISTANT',
  status: 'DECLINED',
  answer: null,
  declined: {
    reason: 'OUT_OF_SCOPE',
    text: 'I can only answer questions about your own RoundFlow data: rounds, jobs, payments, complaints and technicians.',
    suggestions: ['Who owes more than £50?', 'Show failed payments this month'],
  },
  warnings: [],
}

export const declinedStream: RecordedEvent[] = [
  ['start', { conversationId: 'c2', messageId: 'm2', mode: 'BALANCED' }],
  ['declined', declinedMessage.declined],
  ['done', { message: declinedMessage }],
]

export const errorStream: RecordedEvent[] = [
  ['start', { conversationId: 'c3', messageId: 'm3', mode: 'BALANCED' }],
  ['text', { target: 'intro', index: 0, text: 'Let me check that for you.' }],
  ['error', { code: 'FLO_PROVIDER_ERROR', message: 'Upstream failed', retryable: true }],
]

/** The wire format: `event:` + one JSON `data:` line, blank line between events, a `: ping` first. */
export function toSse(events: readonly RecordedEvent[], eol = '\n'): string {
  const frames = events.map(([event, data]) => `event: ${event}${eol}data: ${JSON.stringify(data)}${eol}${eol}`)
  return [`: ping${eol}${eol}`, ...frames].join('')
}
