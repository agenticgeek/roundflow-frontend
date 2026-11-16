import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import type { FloChartBlock } from '@/api/flo.api'
import { AssistantMessage } from '@/components/flo/AssistantMessage'
import { CardsBlock } from '@/components/flo/CardsBlock'
import { ChartBlock } from '@/components/flo/ChartBlock'
import { FloScreen } from '@/components/flo/FloScreen'
import { MessageFeedback } from '@/components/flo/MessageFeedback'
import { SuggestionGrid } from '@/components/flo/SuggestionGrid'
import { TableBlock } from '@/components/flo/TableBlock'
import { emptyView, initialStream, parseFloEvent, reduceStream, viewFromMessage } from '@/features/flo/lib/stream-reducer'
import { chartBlock, chartFinalMessage, chartStream, exampleFinalMessage, toSse } from '@/test/flo-fixtures'
import { floSuggestions, sseResponse } from '@/test/msw/handlers/flo'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

beforeEach(() => {
  localStorage.clear()
  window.matchMedia = ((query: string) => ({ matches: true, media: query })) as unknown as typeof window.matchMedia
})

const bar = chartBlock as unknown as FloChartBlock
const line: FloChartBlock = {
  ...bar,
  kind: 'line',
  title: 'Daily revenue',
  x: { key: 'day', label: 'Day', format: 'date' },
  series: [
    { key: 'a', label: 'Revenue', format: 'currency' },
    { key: 'b', label: 'Refunds', format: 'currency' },
  ],
  rows: [
    { day: '2026-10-01', a: 100, b: -20 },
    { day: '2026-10-02', a: 250, b: null },
    { day: '2026-10-03', a: '', b: 5 },
    { day: 'not-a-date', a: 'x', b: 5 },
    ...Array.from({ length: 9 }, (_, i) => ({ day: `2026-10-${10 + i}`, a: 10 * i, b: 1 })),
  ],
}

const noop = { onAsk: vi.fn(), onRetry: vi.fn() }

describe('ChartBlock', () => {
  it('draws a bar chart with an img summary, a data table fallback and a deep link', () => {
    renderWithProviders(<ChartBlock block={bar} />)
    expect(
      screen.getByRole('img', {
        name: 'Bar chart: Revenue by technician. 2 points. Revenue: highest Liam Walsh (£8,190.00), lowest James Carter (£5,460.00).',
      }),
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'Data for Revenue by technician' })
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Technician', 'Revenue'])
    expect(within(table).getByText('£5,460.00')).toBeInTheDocument()
    expect(table).toHaveClass('sr-only')
    expect(screen.getByRole('link', { name: 'Open Technicians' })).toHaveAttribute('href', '/technicians')
    expect(screen.queryByRole('list', { name: 'Chart series' })).not.toBeInTheDocument()
  })

  it('draws a multi-series line chart with dates, gaps, a legend and thinned ticks', () => {
    const { container } = renderWithProviders(<ChartBlock block={line} />)
    expect(screen.getByRole('img', { name: /^Line chart: Daily revenue\. 11 points\./ })).toBeInTheDocument()
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(container.querySelectorAll('circle').length).toBeGreaterThan(5)
    expect(screen.getByRole('list', { name: 'Chart series' })).toHaveTextContent('RevenueRefunds')
    expect(container).toHaveTextContent('1 Oct')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('handles one row, negatives, long labels and all-zero data', () => {
    const long = 'A'.repeat(80)
    const one = { ...bar, rows: [{ technician: long, revenue: -50 }] }
    const { container, rerender } = renderWithProviders(<ChartBlock block={one} />)
    expect(screen.getByRole('img', { name: `Bar chart: Revenue by technician. Revenue: ${long} (-£50.00).` })).toBeInTheDocument()
    expect(container.querySelector('svg line')).not.toBeNull() // zero baseline
    expect(container.querySelector('svg')).toHaveTextContent('A'.repeat(43) + '…')
    rerender(<ChartBlock block={{ ...bar, rows: [{ technician: 'A', revenue: 0 }] }} />)
    expect(container.querySelector('rect')).toHaveAttribute('width', '0')
    rerender(<ChartBlock block={{ ...line, rows: [{ day: '2026-10-01', a: 5, b: 6 }] }} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(0)
    expect(container.querySelectorAll('circle')).toHaveLength(2)
    rerender(<ChartBlock block={{ ...line, x: { key: 'day', label: 'Week', format: 'text' }, rows: [{ day: 'Week one of the year', a: 1, b: 2 }] }} />)
    expect(container.querySelector('svg')).toHaveTextContent('Week one…')
    rerender(<ChartBlock block={{ ...line, rows: [{ day: '2026-10-01', a: 0, b: 0 }], title: '' }} />)
    expect(screen.getByRole('img', { name: /^Line chart: Chart\./ })).toBeInTheDocument()
  })

  it('shows an empty note when there is nothing to plot and says so when every value is missing', () => {
    const { rerender } = renderWithProviders(<ChartBlock block={{ ...bar, rows: [] }} />)
    expect(screen.getByText('No data to chart.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    rerender(<ChartBlock block={{ ...bar, series: [] }} />)
    expect(screen.getByText('No data to chart.')).toBeInTheDocument()
    rerender(<ChartBlock block={{ ...bar, rows: [{ technician: 'A', revenue: null }] }} />)
    expect(screen.getByRole('img', { name: 'Bar chart: Revenue by technician. No data.' })).toBeInTheDocument()
  })
})

describe('AssistantMessage with a chart and feedback', () => {
  it('renders the chart block, ignores unknown blocks, and shows the persisted rating', () => {
    const answer = chartFinalMessage.answer!
    const message = { ...chartFinalMessage, answer: { ...answer, blocks: [...answer.blocks, { type: 'pie' }, { type: 'chart', kind: 'radar' }] } }
    renderWithProviders(<AssistantMessage view={viewFromMessage(message)} elapsed={0} busy={false} {...noop} />)
    expect(screen.getAllByRole('img')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Good answer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('treats a missing rating as unrated and offers no feedback while streaming, when declined or failed', () => {
    const view = viewFromMessage(exampleFinalMessage)
    expect(view.rating).toBeNull()
    const { rerender } = renderWithProviders(<AssistantMessage view={view} elapsed={0} busy={false} {...noop} />)
    expect(screen.getByRole('button', { name: 'Good answer' })).toHaveAttribute('aria-pressed', 'false')
    const declined = { ...view, declined: { reason: 'X', text: 'No', suggestions: [] } }
    for (const hidden of [{ ...view, streaming: true }, { ...view, malformed: true }, declined, emptyView(false)]) {
      rerender(<AssistantMessage view={hidden} elapsed={0} busy={false} {...noop} />)
      expect(screen.queryByRole('group', { name: 'Rate this answer' })).not.toBeInTheDocument()
    }
    expect(viewFromMessage({ ...exampleFinalMessage, rating: 'DOWN' }).rating).toBe('DOWN')
    expect(viewFromMessage({ ...exampleFinalMessage, rating: 'bogus' as never }).rating).toBeNull()
  })

  it('keeps the rating from the done event', () => {
    const done = parseFloEvent({ event: 'done', data: JSON.stringify({ message: chartFinalMessage }) })!
    expect(reduceStream(initialStream, done).view.rating).toBe('UP')
  })

  it('shows follow-ups from the answer itself', async () => {
    const onAsk = vi.fn()
    const { user } = renderWithProviders(
      <AssistantMessage view={viewFromMessage(chartFinalMessage)} elapsed={0} busy={false} onAsk={onAsk} onRetry={vi.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Show it as a table' }))
    expect(onAsk).toHaveBeenCalledWith('Show it as a table')
  })
})

describe('MessageFeedback', () => {
  function capture(status = 204) {
    const bodies: unknown[] = []
    server.use(
      http.post(`${API}/flo/messages/:id/feedback`, async ({ request, params }) => {
        bodies.push({ id: params.id, ...((await request.json()) as object) })
        return new HttpResponse(null, { status })
      }),
    )
    return bodies
  }

  it('sends a thumbs-up at once, is keyboard operable, and ignores a repeat tap', async () => {
    const bodies = capture()
    const { user } = renderWithProviders(<MessageFeedback messageId="m1" rating={null} />)
    const up = screen.getByRole('button', { name: 'Good answer' })
    up.focus()
    await user.keyboard('{Enter}')
    expect(up).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(bodies).toEqual([{ id: 'm1', rating: 'UP' }]))
    await user.click(up)
    expect(bodies).toHaveLength(1)
  })

  it('asks for an optional comment after a thumbs-down, limited to 500 characters, and sends it', async () => {
    const bodies = capture()
    const { user } = renderWithProviders(<MessageFeedback messageId="m1" rating="UP" />)
    await user.click(screen.getByRole('button', { name: 'Not helpful' }))
    const box = await screen.findByRole('textbox', { name: 'What went wrong?' })
    expect(box).toHaveAttribute('maxlength', '500')
    await user.type(box, 'Wrong month')
    expect(screen.getByText('11 / 500')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(bodies).toEqual([{ id: 'm1', rating: 'DOWN' }, { id: 'm1', rating: 'DOWN', comment: 'Wrong month' }]))
    expect(await screen.findByText('Thanks, noted.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('skips or sends nothing for an empty comment', async () => {
    const bodies = capture()
    const { user } = renderWithProviders(<MessageFeedback messageId="m1" rating={null} />)
    await user.click(screen.getByRole('button', { name: 'Not helpful' }))
    await user.click(await screen.findByRole('button', { name: 'Send' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Good answer' }))
    await user.click(screen.getByRole('button', { name: 'Not helpful' }))
    await user.click(await screen.findByRole('button', { name: 'Skip' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await waitFor(() => expect(bodies).toHaveLength(3))
  })

  it('rolls the thumb back and shows an error toast when saving fails', async () => {
    capture(404)
    const { user } = renderWithProviders(<MessageFeedback messageId="gone" rating="UP" />)
    await user.click(screen.getByRole('button', { name: 'Not helpful' }))
    expect(await screen.findByText('Could not save your feedback. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Good answer' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('keeps the comment box open and toasts when sending the comment fails', async () => {
    const { user } = renderWithProviders(<MessageFeedback messageId="m1" rating={null} />)
    await user.click(screen.getByRole('button', { name: 'Not helpful' }))
    server.use(http.post(`${API}/flo/messages/:id/feedback`, () => new HttpResponse(null, { status: 500 })))
    await user.type(await screen.findByRole('textbox'), 'x')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Could not save your feedback. Try again.')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

describe('TableBlock CSV export', () => {
  it('downloads the table as CSV from its button', async () => {
    const create = vi.fn(() => 'blob:t')
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const table = exampleFinalMessage.answer!.blocks[1] as never
    const { user } = renderWithProviders(<TableBlock block={table} />)
    await user.click(screen.getByRole('button', { name: 'Export Performance by technician as CSV' }))
    expect(click).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledOnce()
    click.mockRestore()
  })
})

describe('CardsBlock link', () => {
  it('shows a view link when the block has one', () => {
    renderWithProviders(<CardsBlock block={{ type: 'cards', items: [{ label: 'Owed', value: 5, format: 'currency' }], link: { screen: 'DEBT_PAYMENT' } }} />)
    expect(screen.getByRole('link', { name: 'Open Debt/Payment' })).toHaveAttribute('href', '/debt-payment')
  })
})

describe('SuggestionGrid without server suggestions', () => {
  it('still offers the briefing and shows no groups', async () => {
    const onAsk = vi.fn()
    const { user } = renderWithProviders(<SuggestionGrid groups={[]} loading={false} disabled={false} onAsk={onAsk} />)
    await user.click(screen.getByRole('button', { name: /Morning briefing/ }))
    expect(onAsk).toHaveBeenCalledWith('Give me my morning briefing')
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })
})

describe('FloScreen morning briefing', () => {
  it('has a prominent briefing button that sends the fixed prompt, and a briefing chip first in the suggestions', async () => {
    expect(floSuggestions.groups[0]!.questions[0]).toBe('Give me my morning briefing')
    let asked = ''
    server.use(
      http.post(`${API}/flo/chat`, async ({ request }) => {
        asked = ((await request.json()) as { message: string }).message
        return sseResponse(toSse(chartStream))
      }),
    )
    const { user } = renderWithProviders(<FloScreen />)
    await user.click(await screen.findByRole('button', { name: /Morning briefing/ }))
    expect(await screen.findByRole('img', { name: /Bar chart: Revenue by technician/ })).toBeInTheDocument()
    expect(asked).toBe('Give me my morning briefing')
    expect(screen.getByRole('button', { name: 'Good answer' })).toHaveAttribute('aria-pressed', 'true')
  })
})
