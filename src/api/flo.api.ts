import { api } from '@/api/client'

// TODO(types.gen): replace these hand-typed shapes after the backend OpenAPI regen
// (contract: docs/FLO_AI_PLAN_2026-11-10.md sections 3.6 and 4).

export type FloMode = 'THOROUGH' | 'BALANCED' | 'QUICK'
export type FloFormat = 'text' | 'integer' | 'currency' | 'percent' | 'date'
export type FloLinkScreen =
  | 'TODAYS_WORK'
  | 'ROUND'
  | 'CUSTOMERS'
  | 'DEBT_PAYMENT'
  | 'REPORTS'
  | 'COMPLAINTS'
  | 'TECHNICIANS'
  | 'INVOICES'

/** `screen` is a closed enum; anything else is ignored by the client. */
export interface FloLink {
  screen: string
  params?: Record<string, string>
}

export interface FloColumn {
  key: string
  label: string
  format: FloFormat
  align: 'left' | 'right'
}

export type FloCell = string | number | null

export interface FloCardItem {
  label: string
  value: FloCell
  format?: FloFormat
  sub?: string
  tone?: string
}

export interface FloCardsBlock {
  type: 'cards'
  items: FloCardItem[]
  link?: FloLink
}

export interface FloTableBlock {
  type: 'table'
  title?: string
  sourceId?: string
  columns: FloColumn[]
  rows: Record<string, FloCell>[]
  totals?: Record<string, FloCell>
  link?: FloLink
}

export interface FloChartAxis {
  key: string
  label: string
  format: FloFormat
}

/** Built by the server from a stored result (max 24 rows, 1 to 3 series). */
export interface FloChartBlock {
  type: 'chart'
  kind: 'bar' | 'line'
  title: string
  sourceId?: string
  x: FloChartAxis
  series: FloChartAxis[]
  rows: Record<string, FloCell>[]
  link?: FloLink
}

/** Unknown block types must be ignored, so the union stays open. */
export type FloBlock = FloCardsBlock | FloTableBlock | FloChartBlock | { type: string }

export interface FloInsight {
  text: string
  unverified?: boolean
  link?: FloLink
}

export interface FloSource {
  id: string
  tool: string
  label: string
  rows: number
}

export interface FloDateRange {
  from: string
  to: string
  label: string
}

export interface FloAnswer {
  intro: string
  dateRange?: FloDateRange
  blocks: FloBlock[]
  insights: FloInsight[]
  followUps: string[]
  sources: FloSource[]
  truncated: boolean
}

export interface FloDeclined {
  reason: string
  text: string
  suggestions: string[]
}

export type FloRating = 'UP' | 'DOWN'

export type FloMessageStatus = 'OK' | 'ERROR' | 'DECLINED' | 'ABORTED'

/** `done` event data and each item of GET /flo/conversations/{id}. USER rows carry `text`. */
export interface FloMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  mode?: FloMode
  model?: string
  status?: FloMessageStatus
  createdAt?: string
  text?: string
  declined?: FloDeclined | null
  answer?: FloAnswer | null
  warnings?: string[]
  /** The admin's thumb on this answer. Missing on messages stored before feedback existed. */
  rating?: FloRating | null
}

export interface FloFeedbackBody {
  rating: FloRating
  comment?: string
}

export interface FloModeInfo {
  key: FloMode
  label: string
  description: string
}

export interface FloStatus {
  enabled: boolean
  modes: FloModeInfo[]
  dailyRemaining: number
}

export interface FloSuggestionGroup {
  area: string
  questions: string[]
}

export interface FloSuggestions {
  groups: FloSuggestionGroup[]
}

export interface FloConversationSummary {
  id: string
  title: string
  updatedAt?: string
}

export interface FloConversationList {
  conversations: FloConversationSummary[]
  nextCursor?: string | null
}

export interface FloConversation {
  id: string
  title?: string
  messages: FloMessage[]
}

export interface FloChatRequest {
  conversationId?: string
  message: string
  mode: FloMode
}

export const floApi = {
  status: (signal?: AbortSignal) => api<FloStatus>('/flo/status', { signal }),

  suggestions: (signal?: AbortSignal) => api<FloSuggestions>('/flo/suggestions', { signal }),

  conversations: (signal?: AbortSignal) => api<FloConversationList>('/flo/conversations', { signal }),

  conversation: (id: string, signal?: AbortSignal) =>
    api<FloConversation>(`/flo/conversations/${encodeURIComponent(id)}`, { signal }),

  /** POST /flo/messages/{id}/feedback: 204 on success; re-rating overwrites. */
  feedback: (messageId: string, body: FloFeedbackBody) =>
    api<void>(`/flo/messages/${encodeURIComponent(messageId)}/feedback`, { method: 'POST', body: JSON.stringify(body) }),

  deleteConversation: (id: string) =>
    api<void>(`/flo/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
