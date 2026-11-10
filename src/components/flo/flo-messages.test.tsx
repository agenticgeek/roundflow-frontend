import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { AssistantMessage } from '@/components/flo/AssistantMessage'
import { MessageList } from '@/components/flo/MessageList'
import type { ChatItem } from '@/features/flo/hooks/useFloChat'
import { emptyView, initialStream, viewFromMessage, type AssistantView } from '@/features/flo/lib/stream-reducer'
import { declinedMessage, exampleFinalMessage } from '@/test/flo-fixtures'
import { renderWithProviders } from '@/test/render'

beforeEach(() => {
  // jsdom has no matchMedia; the typewriter asks for prefers-reduced-motion.
  window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia
})

function show(view: AssistantView, props: Partial<Parameters<typeof AssistantMessage>[0]> = {}) {
  const handlers = { onAsk: vi.fn(), onRetry: vi.fn() }
  const result = renderWithProviders(<AssistantMessage view={view} elapsed={2} busy={false} {...handlers} {...props} />)
  return { ...result, ...handlers }
}

describe('AssistantMessage', () => {
  it('renders a finished answer: intro, cards, table, insights, notice, sources, follow-ups', async () => {
    const { user, onAsk } = show(viewFromMessage(exampleFinalMessage))
    expect(screen.getByRole('article', { name: 'Flo answered' })).toBeInTheDocument()
    expect(screen.getByText('Here is October so far across your 3 active technicians.')).toBeInTheDocument()
    expect(screen.getAllByText('£13,650.00').length).toBeGreaterThan(0) // cards and totals
    expect(screen.getByRole('table', { name: 'Performance by technician' })).toBeInTheDocument()
    expect(screen.getByText('Liam Walsh had the most skips (14).')).toBeInTheDocument()
    expect(screen.getByText('Not checked')).toBeInTheDocument()
    expect(screen.getByText('Some figures could not be checked against your data. Check the tables.')).toBeInTheDocument()
    expect(screen.getByText('Checked 2 data sources')).toBeInTheDocument()
    expect(screen.queryByText('Flo is working on it')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Compare with September' }))
    expect(onAsk).toHaveBeenCalledWith('Compare with September')
  })

  it('shows the working line and hides sources and follow-ups while streaming', () => {
    const view = { ...viewFromMessage(exampleFinalMessage), streaming: true, statuses: [{ tool: 'a', label: 'Debt', done: false }] }
    show(view)
    expect(screen.getByText('Checking: Debt')).toBeInTheDocument()
    expect(screen.queryByText('Checked 2 data sources')).not.toBeInTheDocument()
    expect(screen.queryByText('Ask next')).not.toBeInTheDocument()
  })

  it('ignores block types it does not know and blocks that are malformed', () => {
    show({ ...emptyView(false), blocks: [{ type: 'chart' }, { type: 'table' }, { type: 'cards', items: [{ label: 'Only', value: 1, format: 'integer' }] }] })
    expect(screen.getByText('Only')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('joins several intro sentences', () => {
    show({
      ...emptyView(false),
      intro: [
        { text: 'First.', unverified: false },
        { text: 'Second.', unverified: false },
      ],
    })
    expect(screen.getByText(/First\./).parentElement).toHaveTextContent('First. Second.')
  })

  it('shows a decline calmly, with no alert', () => {
    show(viewFromMessage(declinedMessage), { busy: true })
    expect(screen.getByText(/I can only answer questions/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show failed payments this month' })).toBeDisabled()
  })

  it('shows a retryable error with Retry, and a non-retryable one without', async () => {
    const retryable = { ...emptyView(false), intro: [{ text: 'Partial', unverified: false }], error: { code: 'X', message: 'Try again soon', retryable: true } }
    const { user, onRetry, unmount } = show(retryable)
    expect(screen.getByText('Partial')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Try again soon')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalled()
    unmount()

    show({ ...emptyView(false), error: { code: 'FLO_DAILY_LIMIT', message: 'Limit reached', retryable: false } })
    expect(screen.getByRole('alert')).toHaveTextContent('Limit reached')
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('disables Retry while busy, and offers it for a malformed message', () => {
    show({ ...emptyView(false), malformed: true }, { busy: true })
    expect(screen.getByRole('alert')).toHaveTextContent('Flo’s answer could not be displayed.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled()
  })

  it('says a stopped answer is incomplete, and notes truncated results', () => {
    show({ ...emptyView(false), stopped: true, truncated: true })
    expect(screen.getByText('Stopped. This answer is incomplete.')).toBeInTheDocument()
    expect(screen.getByText('Only the first results are shown.')).toBeInTheDocument()
  })
})

const items: ChatItem[] = [
  { kind: 'user', id: 'u1', text: 'How is October going?' },
  { kind: 'assistant', id: 'a1', stream: { ...initialStream, view: viewFromMessage(exampleFinalMessage) } },
]

function scrollState(region: HTMLElement, state: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  for (const [key, value] of Object.entries(state)) Object.defineProperty(region, key, { value, configurable: true, writable: true })
}

describe('MessageList', () => {
  it('lists questions and answers in a labelled scroll region and retries by item id', async () => {
    const onRetry = vi.fn()
    const failed: ChatItem[] = [
      ...items,
      { kind: 'user', id: 'u2', text: 'Again' },
      { kind: 'assistant', id: 'a2', stream: { ...initialStream, view: { ...emptyView(false), error: { code: 'X', message: 'Failed', retryable: true } } } },
    ]
    const { user } = renderWithProviders(<MessageList items={failed} elapsed={0} busy={false} onAsk={vi.fn()} onRetry={onRetry} />)
    const region = screen.getByRole('region', { name: 'Conversation' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('How is October going?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledWith('a2')
  })

  it('follows new content while at the bottom, pauses when scrolled up, and jumps to the latest', () => {
    const { rerender } = renderWithProviders(<MessageList items={items} elapsed={0} busy={false} onAsk={vi.fn()} onRetry={vi.fn()} />)
    const region = screen.getByRole('region', { name: 'Conversation' })
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument()

    // At the bottom: new content scrolls into view.
    scrollState(region, { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 })
    fireEvent.scroll(region)
    scrollState(region, { scrollHeight: 1200, clientHeight: 400, scrollTop: 600 })
    rerender(<MessageList items={[...items]} elapsed={1} busy onAsk={vi.fn()} onRetry={vi.fn()} />)
    expect(region.scrollTop).toBe(1200)

    // Scrolled up: the view stays put and the button appears.
    scrollState(region, { scrollHeight: 1200, clientHeight: 400, scrollTop: 100 })
    fireEvent.scroll(region)
    scrollState(region, { scrollHeight: 1500, clientHeight: 400, scrollTop: 100 })
    rerender(<MessageList items={[...items]} elapsed={2} busy onAsk={vi.fn()} onRetry={vi.fn()} />)
    expect(region.scrollTop).toBe(100)
    const jump = screen.getByRole('button', { name: 'Jump to latest' })

    fireEvent.click(jump)
    expect(region.scrollTop).toBe(1500)
    expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument()
  })

  it('brings the reader back to the bottom when they send a new question', () => {
    const { rerender } = renderWithProviders(<MessageList items={items} elapsed={0} busy={false} onAsk={vi.fn()} onRetry={vi.fn()} />)
    const region = screen.getByRole('region', { name: 'Conversation' })
    scrollState(region, { scrollHeight: 1200, clientHeight: 400, scrollTop: 100 })
    fireEvent.scroll(region)
    scrollState(region, { scrollHeight: 1300, clientHeight: 400, scrollTop: 100 })
    rerender(<MessageList items={[...items, { kind: 'user', id: 'u2', text: 'Next' }]} elapsed={0} busy onAsk={vi.fn()} onRetry={vi.fn()} />)
    expect(region.scrollTop).toBe(1300)
  })
})
