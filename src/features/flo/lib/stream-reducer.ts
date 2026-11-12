import type {
  FloBlock,
  FloDateRange,
  FloDeclined,
  FloLink,
  FloMessage,
  FloMode,
  FloSource,
} from '@/api/flo.api'
import { describeFloError } from '@/features/flo/lib/errors'
import type { SseEvent } from '@/features/flo/lib/sse'

/** One sentence of prose. `unverified` means the server could not match its figures to your data. */
export interface FloSentence {
  text: string
  unverified: boolean
  link?: FloLink
}

export interface FloStatusLine {
  tool: string
  label: string
  done: boolean
  rows?: number
}

export interface FloStreamError {
  code: string
  message: string
  retryable: boolean
}

/** Everything the answer area draws, for a streamed answer and a persisted one alike. */
export interface AssistantView {
  id?: string
  /** True from the first event until `done`, `declined`, `error` or the stream ending. */
  streaming: boolean
  statuses: FloStatusLine[]
  intro: FloSentence[]
  blocks: FloBlock[]
  insights: FloSentence[]
  followUps: string[]
  sources: FloSource[]
  dateRange?: FloDateRange
  truncated: boolean
  warnings: string[]
  declined: FloDeclined | null
  error: FloStreamError | null
  /** The user pressed Stop: what is shown is incomplete. */
  stopped: boolean
  /** A persisted message that has neither an answer nor a decline. */
  malformed: boolean
}

export interface FloStreamState {
  conversationId: string | null
  messageId: string | null
  mode: FloMode | null
  /** The persisted message from `done`; when present it replaced every streamed field. */
  final: FloMessage | null
  view: AssistantView
}

export type FloEvent =
  | { type: 'start'; conversationId: string; messageId: string; mode: FloMode }
  | { type: 'status'; phase: 'checking' | 'checked'; tool: string; label: string; rows?: number }
  | { type: 'block'; index: number; block: FloBlock }
  | { type: 'text'; target: 'intro' | 'insight'; index: number; text: string; unverified?: boolean }
  | { type: 'follow_ups'; items: string[] }
  | { type: 'declined'; declined: FloDeclined }
  | { type: 'warning'; code: string }
  | { type: 'done'; message: FloMessage }
  | { type: 'error'; error: FloStreamError }

export function emptyView(streaming = true): AssistantView {
  return {
    streaming,
    statuses: [],
    intro: [],
    blocks: [],
    insights: [],
    followUps: [],
    sources: [],
    truncated: false,
    warnings: [],
    declined: null,
    error: null,
    stopped: false,
    malformed: false,
  }
}

export const initialStream: FloStreamState = {
  conversationId: null,
  messageId: null,
  mode: null,
  final: null,
  view: emptyView(),
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** An SSE frame to a typed event; `null` for an unknown event name or a payload that is not usable. */
export function parseFloEvent(frame: SseEvent): FloEvent | null {
  let data: unknown
  try {
    data = JSON.parse(frame.data)
  } catch {
    return null
  }
  if (!isObject(data)) return null

  switch (frame.event) {
    case 'start':
      return isString(data.conversationId) && isString(data.messageId) && isString(data.mode)
        ? { type: 'start', conversationId: data.conversationId, messageId: data.messageId, mode: data.mode as FloMode }
        : null
    case 'status':
      return (data.phase === 'checking' || data.phase === 'checked') && isString(data.tool) && isString(data.label)
        ? { type: 'status', phase: data.phase, tool: data.tool, label: data.label, ...(isCount(data.rows) ? { rows: data.rows } : {}) }
        : null
    case 'block':
      return isCount(data.index) && isObject(data.block) && isString(data.block.type)
        ? { type: 'block', index: data.index, block: data.block as FloBlock }
        : null
    case 'text':
      return (data.target === 'intro' || data.target === 'insight') && isCount(data.index) && isString(data.text)
        ? { type: 'text', target: data.target, index: data.index, text: data.text, unverified: data.unverified === true }
        : null
    case 'follow_ups':
      return Array.isArray(data.items) ? { type: 'follow_ups', items: data.items.filter(isString) } : null
    case 'declined':
      return isString(data.text)
        ? {
            type: 'declined',
            declined: {
              reason: isString(data.reason) ? data.reason : 'OUT_OF_SCOPE',
              text: data.text,
              suggestions: Array.isArray(data.suggestions) ? data.suggestions.filter(isString) : [],
            },
          }
        : null
    case 'warning':
      return isString(data.code) ? { type: 'warning', code: data.code } : null
    case 'done':
      return isObject(data.message) && isString(data.message.id) ? { type: 'done', message: data.message as unknown as FloMessage } : null
    case 'error':
      return isString(data.code)
        ? { type: 'error', error: { code: data.code, message: isString(data.message) ? data.message : '', retryable: data.retryable === true } }
        : null
    default:
      return null
  }
}

/** `list` with `value` placed at `index` (gaps stay out: later events fill them or they are skipped when drawing). */
function placed<T>(list: T[], index: number, value: T): T[] {
  const next = [...list]
  next[index] = value
  return next
}

/** The persisted message as a view, so a reload looks exactly like the streamed answer did. */
export function viewFromMessage(message: FloMessage): AssistantView {
  const base: AssistantView = { ...emptyView(false), id: message.id, warnings: message.warnings ?? [] }
  if (message.declined) return { ...base, declined: message.declined }
  if (message.status === 'ERROR' || message.status === 'ABORTED') {
    return { ...base, error: describeFloError('UNKNOWN') }
  }
  const answer = message.answer
  if (!isObject(answer) || !isString(answer.intro)) return { ...base, malformed: true }
  const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
  return {
    ...base,
    intro: answer.intro ? [{ text: answer.intro, unverified: false }] : [],
    blocks: list<FloBlock>(answer.blocks).filter(isObject),
    insights: list<{ text?: unknown; unverified?: boolean; link?: FloLink }>(answer.insights)
      .filter((insight) => isObject(insight) && isString(insight.text))
      .map((insight) => ({ text: insight.text as string, unverified: insight.unverified === true, link: insight.link })),
    followUps: list<unknown>(answer.followUps).filter(isString),
    sources: list<FloSource>(answer.sources).filter(isObject),
    dateRange: answer.dateRange ?? undefined,
    truncated: answer.truncated === true,
  }
}

/** The next state after one event. Unknown or out-of-order input never throws. */
export function reduceStream(state: FloStreamState, event: FloEvent): FloStreamState {
  const { view } = state
  switch (event.type) {
    case 'start':
      return { ...state, conversationId: event.conversationId, messageId: event.messageId, mode: event.mode }
    case 'status': {
      if (event.phase === 'checking') {
        return { ...state, view: { ...view, statuses: [...view.statuses, { tool: event.tool, label: event.label, done: false }] } }
      }
      const open = view.statuses.findIndex((line) => line.tool === event.tool && !line.done)
      const finished: FloStatusLine = { tool: event.tool, label: event.label, done: true, rows: event.rows }
      const statuses = open === -1 ? [...view.statuses, finished] : placed(view.statuses, open, finished)
      return { ...state, view: { ...view, statuses } }
    }
    case 'block':
      return { ...state, view: { ...view, blocks: placed(view.blocks, event.index, event.block) } }
    case 'text': {
      const sentence: FloSentence = { text: event.text, unverified: event.unverified === true }
      return event.target === 'intro'
        ? { ...state, view: { ...view, intro: placed(view.intro, event.index, sentence) } }
        : { ...state, view: { ...view, insights: placed(view.insights, event.index, sentence) } }
    }
    case 'follow_ups':
      return { ...state, view: { ...view, followUps: event.items } }
    case 'warning':
      return view.warnings.includes(event.code)
        ? state
        : { ...state, view: { ...view, warnings: [...view.warnings, event.code] } }
    case 'declined':
      return { ...state, view: { ...view, streaming: false, declined: event.declined } }
    case 'error':
      return { ...state, view: { ...view, streaming: false, error: event.error } }
    case 'done':
      return { ...state, final: event.message, view: viewFromMessage(event.message) }
  }
}

/** The stream ended without `done`, `declined` or `error` and could not be recovered. */
export function failStream(state: FloStreamState, error: FloStreamError): FloStreamState {
  return { ...state, view: { ...state.view, streaming: false, error } }
}

/** The user pressed Stop. */
export function stopStream(state: FloStreamState): FloStreamState {
  return { ...state, view: { ...state.view, streaming: false, stopped: true } }
}
