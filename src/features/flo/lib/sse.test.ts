import { describe, expect, it } from 'vitest'
import { createSseParser, type SseEvent } from '@/features/flo/lib/sse'

describe('createSseParser', () => {
  it('parses events, ignores comments and unknown fields, defaults the name to message', () => {
    const parser = createSseParser()
    const events = parser.push(': ping\n\nevent: status\ndata: {"a":1}\nid: 7\n\ndata: plain\n\n')
    expect(events).toEqual([
      { event: 'status', data: '{"a":1}' },
      { event: 'message', data: 'plain' },
    ])
  })

  it('joins several data lines, strips one leading space and handles fields without a colon', () => {
    const events = createSseParser().push('event\ndata:  two\ndata\ndata: x\n\n')
    expect(events).toEqual([{ event: 'message', data: ' two\n\nx' }])
  })

  it('does not dispatch an event with no data, and resets the name afterwards', () => {
    const parser = createSseParser()
    expect(parser.push('event: lonely\n\n')).toEqual([])
    expect(parser.push('data: x\n\n')).toEqual([{ event: 'message', data: 'x' }])
  })

  it('gives the same events whatever the chunk boundaries, with LF, CRLF or CR line ends (a lone final CR waits for the next byte)', () => {
    for (const eol of ['\n', '\r\n', '\r']) {
      const text = `: ping${eol}${eol}event: text${eol}data: {"text":"héllo"}${eol}${eol}event: done${eol}data: {}${eol}${eol}: end
`
      for (let size = 1; size <= text.length; size += 1) {
        const parser = createSseParser()
        const events: SseEvent[] = []
        for (let at = 0; at < text.length; at += size) events.push(...parser.push(text.slice(at, at + size)))
        expect(events).toEqual([
          { event: 'text', data: '{"text":"héllo"}' },
          { event: 'done', data: '{}' },
        ])
      }
    }
  })

  it('holds an unfinished event back (an abrupt close never yields half an event) and copes with an empty stream', () => {
    const parser = createSseParser()
    expect(parser.push('')).toEqual([])
    expect(parser.push('event: text\ndata: {"te')).toEqual([])
  })
})
