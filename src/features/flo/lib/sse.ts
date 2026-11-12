/** One dispatched server-sent event: its `event:` name (default `message`) and `data:` lines joined by newlines. */
export interface SseEvent {
  event: string
  data: string
}

export interface SseParser {
  /** Feed the next decoded chunk; returns every event that chunk completed. */
  push(chunk: string): SseEvent[]
}

/**
 * Incremental parser for a `text/event-stream` body. A chunk may end mid-line, mid-JSON or between
 * the `\r` and `\n` of a CRLF. Comment lines (`: ping`) are ignored; an event with no `data:` is
 * not dispatched; an event still open when the stream ends is never returned.
 */
export function createSseParser(): SseParser {
  let heldCarriageReturn = false
  let partialLine = ''
  let event = ''
  let data: string[] = []

  function line(text: string, out: SseEvent[]) {
    if (text === '') {
      if (data.length > 0) out.push({ event: event || 'message', data: data.join('\n') })
      event = ''
      data = []
      return
    }
    if (text.startsWith(':')) return
    const colon = text.indexOf(':')
    const field = colon === -1 ? text : text.slice(0, colon)
    const raw = colon === -1 ? '' : text.slice(colon + 1)
    const value = raw.startsWith(' ') ? raw.slice(1) : raw
    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }

  return {
    push(chunk) {
      // A chunk ending in "\r" may be half of "\r\n": hold it until the next chunk shows which.
      let text = (heldCarriageReturn ? '\r' : '') + chunk
      heldCarriageReturn = text.endsWith('\r')
      if (heldCarriageReturn) text = text.slice(0, -1)
      const pieces = (partialLine + text.replace(/\r\n?/g, '\n')).split('\n')
      partialLine = pieces.pop() as string
      const out: SseEvent[] = []
      for (const piece of pieces) line(piece, out)
      return out
    },
  }
}
