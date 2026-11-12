import { describe, expect, it } from 'vitest'
import type { FloMessage } from '@/api/flo.api'
import {
  emptyView,
  failStream,
  initialStream,
  parseFloEvent,
  reduceStream,
  stopStream,
  viewFromMessage,
  type FloEvent,
} from '@/features/flo/lib/stream-reducer'
import { declinedMessage, errorStream, exampleFinalMessage, exampleStream } from '@/test/flo-fixtures'

const frame = (event: string, data: unknown) => ({ event, data: typeof data === 'string' ? data : JSON.stringify(data) })

function replay(events: readonly (readonly [string, unknown])[]) {
  return events.reduce((state, [event, data]) => {
    const parsed = parseFloEvent(frame(event, data))
    return parsed ? reduceStream(state, parsed) : state
  }, initialStream)
}

describe('parseFloEvent', () => {
  it('reads every event of the recorded stream', () => {
    const types = exampleStream.map(([event, data]) => parseFloEvent(frame(event, data))?.type)
    expect(types).toEqual(['start', 'status', 'status', 'status', 'status', 'block', 'block', 'text', 'text', 'text', 'follow_ups', 'warning', 'done'])
  })

  it('fills defaults: rows only when numeric, unverified false, decline reason and suggestions, error message', () => {
    expect(parseFloEvent(frame('status', { phase: 'checked', tool: 't', label: 'L', rows: 'x' }))).toEqual({ type: 'status', phase: 'checked', tool: 't', label: 'L' })
    expect(parseFloEvent(frame('text', { target: 'intro', index: 0, text: 'hi' }))).toMatchObject({ unverified: false })
    expect(parseFloEvent(frame('declined', { text: 'No' }))).toEqual({ type: 'declined', declined: { reason: 'OUT_OF_SCOPE', text: 'No', suggestions: [] } })
    expect(parseFloEvent(frame('declined', { reason: 'WRITE_REQUEST', text: 'No', suggestions: ['a', 1] }))).toMatchObject({ declined: { reason: 'WRITE_REQUEST', suggestions: ['a'] } })
    expect(parseFloEvent(frame('error', { code: 'X' }))).toEqual({ type: 'error', error: { code: 'X', message: '', retryable: false } })
    expect(parseFloEvent(frame('follow_ups', { items: ['a', 2] }))).toEqual({ type: 'follow_ups', items: ['a'] })
  })

  it('ignores unknown events, bad JSON, non-objects and unusable payloads', () => {
    expect(parseFloEvent(frame('mystery', {}))).toBeNull()
    expect(parseFloEvent(frame('start', 'not json'))).toBeNull()
    expect(parseFloEvent(frame('start', '[1]'))).toBeNull()
    expect(parseFloEvent(frame('start', '7'))).toBeNull()
    const unusable: [string, unknown][] = [
      ['start', {}],
      ['status', { phase: 'later', tool: 't', label: 'l' }],
      ['block', { index: 0, block: {} }],
      ['block', { index: 'x', block: { type: 'cards' } }],
      ['text', { target: 'other', index: 0, text: 'a' }],
      ['follow_ups', { items: 'x' }],
      ['declined', {}],
      ['warning', {}],
      ['done', { message: {} }],
      ['error', {}],
    ]
    for (const [event, data] of unusable) expect(parseFloEvent(frame(event, data))).toBeNull()
  })
})

describe('reduceStream', () => {
  it('builds the answer from the recorded stream, then `done` replaces it with the persisted message', () => {
    const before = replay(exampleStream.slice(0, -1))
    expect(before.conversationId).toBe('c1')
    expect(before.messageId).toBe('m1')
    expect(before.mode).toBe('BALANCED')
    expect(before.view.streaming).toBe(true)
    expect(before.view.statuses).toEqual([
      { tool: 'compare_technicians', label: 'Technicians', done: true, rows: 3 },
      { tool: 'list_debtors', label: 'Debt', done: true, rows: 1 },
    ])
    expect(before.view.blocks).toHaveLength(2)
    expect(before.view.intro).toEqual([{ text: 'Here is October so far across your 3 active technicians.', unverified: false }])
    expect(before.view.insights.map((sentence) => sentence.unverified)).toEqual([false, true])
    expect(before.view.followUps).toHaveLength(2)
    expect(before.view.warnings).toEqual(['UNVERIFIED_FIGURES'])

    const after = replay(exampleStream)
    expect(after.final).toEqual(exampleFinalMessage)
    expect(after.view.streaming).toBe(false)
    expect(after.view.id).toBe('m1')
    expect(after.view.sources).toHaveLength(2)
  })

  it('tolerates out-of-order and repeated events', () => {
    const events: FloEvent[] = [
      { type: 'status', phase: 'checked', tool: 'late', label: 'Late', rows: 2 },
      { type: 'text', target: 'intro', index: 1, text: 'second' },
      { type: 'text', target: 'intro', index: 0, text: 'first' },
      { type: 'block', index: 1, block: { type: 'unknown' } },
      { type: 'warning', code: 'UNVERIFIED_FIGURES' },
      { type: 'warning', code: 'UNVERIFIED_FIGURES' },
    ]
    const state = events.reduce(reduceStream, initialStream)
    expect(state.view.statuses).toEqual([{ tool: 'late', label: 'Late', done: true, rows: 2 }])
    expect(state.view.intro.map((sentence) => sentence.text)).toEqual(['first', 'second'])
    expect(state.view.blocks[0]).toBeUndefined()
    expect(state.view.warnings).toEqual(['UNVERIFIED_FIGURES'])
  })

  it('keeps partial content when an error arrives, and shows a decline', () => {
    const state = replay(errorStream)
    expect(state.view.intro).toHaveLength(1)
    expect(state.view.error).toEqual({ code: 'FLO_PROVIDER_ERROR', message: 'Upstream failed', retryable: true })
    expect(state.view.streaming).toBe(false)

    const declined = reduceStream(initialStream, { type: 'declined', declined: { reason: 'OUT_OF_SCOPE', text: 'No', suggestions: [] } })
    expect(declined.view.declined?.text).toBe('No')
    expect(declined.view.streaming).toBe(false)
  })

  it('marks a dropped stream and a stopped one as finished', () => {
    const error = { code: 'STREAM_DROPPED', message: 'x', retryable: true }
    expect(failStream(initialStream, error).view).toMatchObject({ streaming: false, error })
    expect(stopStream(initialStream).view).toMatchObject({ streaming: false, stopped: true })
  })
})

describe('viewFromMessage', () => {
  it('shows a decline', () => {
    expect(viewFromMessage(declinedMessage).declined?.reason).toBe('OUT_OF_SCOPE')
  })

  it('turns ERROR and ABORTED messages into a retryable error', () => {
    for (const status of ['ERROR', 'ABORTED'] as const) {
      const view = viewFromMessage({ id: 'x', role: 'ASSISTANT', status })
      expect(view.error?.retryable).toBe(true)
      expect(view.error?.message).not.toBe('')
    }
  })

  it('flags a message with no usable answer as malformed', () => {
    expect(viewFromMessage({ id: 'x', role: 'ASSISTANT', status: 'OK', answer: null }).malformed).toBe(true)
    expect(viewFromMessage({ id: 'x', role: 'ASSISTANT', status: 'OK', answer: { intro: 5 } as never }).malformed).toBe(true)
  })

  it('drops malformed parts of an answer instead of crashing, with an empty intro and no warnings', () => {
    const message = {
      id: 'x',
      role: 'ASSISTANT',
      answer: {
        intro: '',
        blocks: ['x', { type: 'cards', items: [] }],
        insights: [{ text: 5 }, { text: 'ok' }, 'x'],
        followUps: 'nope',
        sources: [null, { id: 's', tool: 't', label: 'l', rows: 1 }],
        dateRange: null,
        truncated: true,
      },
    } as unknown as FloMessage
    const view = viewFromMessage(message)
    expect(view.intro).toEqual([])
    expect(view.blocks).toEqual([{ type: 'cards', items: [] }])
    expect(view.insights).toEqual([{ text: 'ok', unverified: false, link: undefined }])
    expect(view.followUps).toEqual([])
    expect(view.sources).toHaveLength(1)
    expect(view.dateRange).toBeUndefined()
    expect(view.truncated).toBe(true)
    expect(view.warnings).toEqual([])
    expect(emptyView(false).streaming).toBe(false)
  })

  it('treats a missing blocks / insights / sources list as empty', () => {
    const view = viewFromMessage({ id: 'x', role: 'ASSISTANT', answer: { intro: 'Hi' } as never })
    expect(view).toMatchObject({ blocks: [], insights: [], followUps: [], sources: [], truncated: false })
  })
})
