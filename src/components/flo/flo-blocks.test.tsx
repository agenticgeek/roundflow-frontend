import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import type { FloCardsBlock, FloTableBlock } from '@/api/flo.api'
import { CardsBlock } from '@/components/flo/CardsBlock'
import { Composer } from '@/components/flo/Composer'
import { DeclinedNotice } from '@/components/flo/DeclinedNotice'
import { FollowUps } from '@/components/flo/FollowUps'
import { InsightsBlock } from '@/components/flo/InsightsBlock'
import { ModeSwitch } from '@/components/flo/ModeSwitch'
import { Sentence } from '@/components/flo/Sentence'
import { SourcesPill } from '@/components/flo/SourcesPill'
import { SuggestionGrid } from '@/components/flo/SuggestionGrid'
import { TableBlock } from '@/components/flo/TableBlock'
import { UnverifiedNotice } from '@/components/flo/UnverifiedNotice'
import { UserBubble } from '@/components/flo/UserBubble'
import { WorkingIndicator } from '@/components/flo/WorkingIndicator'
import { floContent } from '@/content/flo'
import { declinedMessage, exampleFinalMessage } from '@/test/flo-fixtures'
import { floStatus } from '@/test/msw/handlers/flo'
import { renderWithProviders } from '@/test/render'

const answer = exampleFinalMessage.answer!
const cards = answer.blocks[0] as FloCardsBlock
const table = answer.blocks[1] as FloTableBlock

function stubMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

afterEach(() => vi.useRealTimers())

describe('CardsBlock', () => {
  it('formats each value from its declared format and shows the sub line and tone', () => {
    renderWithProviders(
      <CardsBlock
        block={{
          type: 'cards',
          items: [...cards.items, { label: 'Debt', value: -50, format: 'currency', tone: 'bad' }, { label: 'Skips', value: 'n/a', tone: 'warning' }],
        }}
      />,
    )
    expect(screen.getByText('Jobs completed').nextSibling).toHaveTextContent('781')
    expect(screen.getByText('of 810 scheduled (96.4%)')).toBeInTheDocument()
    expect(screen.getByText('£13,650.00')).toHaveClass('text-success')
    expect(screen.getByText('96.4%')).toHaveClass('text-foreground')
    expect(screen.getByText('-£50.00')).toHaveClass('text-danger')
    expect(screen.getByText('n/a')).toHaveClass('text-warning-foreground')
  })
})

describe('TableBlock', () => {
  it('is a real table with caption, column headers, aligned figures, totals row and a link', () => {
    renderWithProviders(<TableBlock block={table} />)
    const grid = screen.getByRole('table', { name: 'Performance by technician' })
    expect(within(grid).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Technician', 'Revenue', 'Last visit'])
    expect(within(grid).getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col')
    const rows = within(grid).getAllByRole('row')
    expect(rows).toHaveLength(4) // header, 2 rows, totals
    expect(within(rows[1]!).getByText('£5,460.00')).toHaveClass('text-right')
    expect(within(rows[1]!).getByText('29 Oct 2026')).toBeInTheDocument()
    expect(within(rows[3]!).getByText('Total')).toBeInTheDocument()
    expect(within(rows[3]!).getByText('–')).toBeInTheDocument()
    expect(grid.querySelector('tfoot')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Performance by technician table' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('link', { name: 'Open Reports' })).toHaveAttribute('href', '/reports-history')
  })

  it('works without a title, totals or link, and ignores an unknown link screen', () => {
    renderWithProviders(
      <TableBlock block={{ type: 'table', columns: table.columns, rows: [{ technician: 'A', revenue: 1, lastVisit: null }], link: { screen: 'NOWHERE' } }} />,
    )
    expect(screen.getByRole('table', { name: 'Results' })).toBeInTheDocument()
    expect(document.querySelector('tfoot')).toBeNull()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('InsightsBlock', () => {
  it('lists insights as plain text with an unverified marker and a link', () => {
    renderWithProviders(
      <InsightsBlock
        animate={false}
        insights={[
          { text: 'Liam <b>Walsh</b> had the most skips (14).', unverified: false, link: { screen: 'ROUND', params: { roundId: 'r7' } } },
          { text: 'Revenue is up 12%.', unverified: true },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'What stands out' })).toBeInTheDocument()
    expect(screen.getByText(/Liam <b>Walsh<\/b> had/)).toBeInTheDocument() // plain text, never HTML
    expect(screen.getByRole('link', { name: 'Open this round' })).toHaveAttribute('href', '/round-planner?round=r7')
    expect(screen.getByText('Not checked')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})

describe('Sentence', () => {
  it('shows a finished sentence whole', () => {
    renderWithProviders(<Sentence sentence={{ text: 'All done.', unverified: false }} animate={false} />)
    expect(screen.getByText('All done.')).toBeInTheDocument()
  })

  it('types a streamed sentence in, one character at a time', () => {
    stubMotion(false)
    vi.useFakeTimers()
    renderWithProviders(<Sentence sentence={{ text: 'Typing', unverified: false }} animate />)
    expect(screen.queryByText('Typing')).not.toBeInTheDocument()
    act(() => void vi.advanceTimersByTime(12 * 3))
    expect(document.body).toHaveTextContent(/^Ty/)
    expect(document.body).not.toHaveTextContent('Typing')
    act(() => void vi.advanceTimersByTime(500))
    expect(document.body).toHaveTextContent('Typing')
  })

  it('shows it at once under prefers-reduced-motion', () => {
    stubMotion(true)
    renderWithProviders(<Sentence sentence={{ text: 'Instant.', unverified: false }} animate />)
    expect(screen.getByText('Instant.')).toBeInTheDocument()
  })
})

describe('SourcesPill', () => {
  it('discloses each source, its row count and the dates', async () => {
    const { user } = renderWithProviders(
      <SourcesPill
        sources={[...answer.sources, { id: 'r3', tool: 'list_payments', label: 'Payments', rows: 12 }]}
        dateRange={answer.dateRange}
      />,
    )
    expect(screen.getByText('Checked 3 data sources')).toBeInTheDocument()
    await user.click(screen.getByText('Checked 3 data sources'))
    expect(screen.getByText('Technicians: 3 rows')).toBeInTheDocument()
    expect(screen.getByText('Debt: 1 row')).toBeInTheDocument()
    expect(screen.getByText('Payments: 12 rows')).toBeInTheDocument()
    expect(screen.getByText('Dates: 1 to 30 Oct 2026')).toBeInTheDocument()
  })

  it('says "1 data source" and omits the dates when there are none', () => {
    renderWithProviders(<SourcesPill sources={[answer.sources[0]!]} />)
    expect(screen.getByText('Checked 1 data source')).toBeInTheDocument()
    expect(screen.queryByText(/Dates:/)).not.toBeInTheDocument()
  })
})

describe('FollowUps, DeclinedNotice, SuggestionGrid, notices', () => {
  it('ask the question they show, and disable while busy', async () => {
    const onAsk = vi.fn()
    const { user, rerender } = renderWithProviders(<FollowUps items={['Compare with September']} onAsk={onAsk} />)
    await user.click(screen.getByRole('button', { name: 'Compare with September' }))
    expect(onAsk).toHaveBeenCalledWith('Compare with September')
    rerender(<FollowUps items={['Compare with September']} onAsk={onAsk} disabled />)
    expect(screen.getByRole('button', { name: 'Compare with September' })).toBeDisabled()
  })

  it('shows the fixed decline copy with chips, or none', async () => {
    const onAsk = vi.fn()
    const { user, rerender } = renderWithProviders(<DeclinedNotice declined={declinedMessage.declined!} onAsk={onAsk} disabled={false} />)
    expect(screen.getByText(/I can only answer questions about your own RoundFlow data/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show failed payments this month' }))
    expect(onAsk).toHaveBeenCalledWith('Show failed payments this month')
    rerender(<DeclinedNotice declined={{ reason: 'WRITE_REQUEST', text: 'Flo can only look things up.', suggestions: [] }} onAsk={onAsk} disabled />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows suggestions by area, a loading hint, and the unverified notice', async () => {
    const onAsk = vi.fn()
    const groups = [{ area: 'Payments', questions: ['Who owes more than £50?'] }]
    const { user, rerender } = renderWithProviders(<SuggestionGrid groups={groups} loading={false} disabled={false} onAsk={onAsk} />)
    expect(screen.getByText('Try asking about a job, payment, technician or complaint.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Who owes more than £50?' }))
    expect(onAsk).toHaveBeenCalled()
    rerender(<SuggestionGrid groups={[]} loading disabled onAsk={onAsk} />)
    expect(screen.getByText('Loading suggestions')).toBeInTheDocument()

    rerender(<UnverifiedNotice />)
    expect(screen.getByText(floContent.unverified.notice)).toBeInTheDocument()
  })
})

describe('UserBubble and WorkingIndicator', () => {
  it('render plain text', () => {
    renderWithProviders(<UserBubble text="<script>x</script>" />)
    expect(screen.getByText('<script>x</script>')).toBeInTheDocument()
  })

  it('shows progress, then the elapsed time, with a fallback before any status', () => {
    const { rerender } = renderWithProviders(<WorkingIndicator statuses={[]} elapsed={4} />)
    expect(screen.getByText('Flo is working on it')).toBeInTheDocument()
    expect(screen.getByText('4s')).toBeInTheDocument()
    rerender(<WorkingIndicator statuses={[{ tool: 'a', label: 'Debt', done: false }]} elapsed={5} />)
    expect(screen.getByText('Checking: Debt')).toBeInTheDocument()
  })
})

describe('ModeSwitch', () => {
  it('is a radio group of the three styles', async () => {
    const onChange = vi.fn()
    const { user, rerender } = renderWithProviders(<ModeSwitch modes={floStatus.modes} value="BALANCED" disabled={false} onChange={onChange} />)
    expect(screen.getByRole('radio', { name: /Balanced/ })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Quick/ }))
    expect(onChange).toHaveBeenCalledWith('QUICK')
    rerender(<ModeSwitch modes={floStatus.modes} value="BALANCED" disabled onChange={onChange} />)
    expect(screen.getByRole('radio', { name: /Thorough/ })).toBeDisabled()
  })
})

describe('Composer', () => {
  it('sends on Enter and on the button, not on Shift+Enter or an empty box', async () => {
    const onSend = vi.fn()
    const { user } = renderWithProviders(<Composer streaming={false} disabled={false} onSend={onSend} onStop={vi.fn()} />)
    const box = screen.getByRole('textbox', { name: 'Ask Flo' })
    expect(box).toHaveAttribute('maxlength', '2000')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    await user.type(box, '{Enter}')
    expect(onSend).not.toHaveBeenCalled()
    await user.type(box, 'first{Shift>}{Enter}{/Shift}second')
    expect(onSend).not.toHaveBeenCalled()
    expect(box).toHaveValue('first\nsecond')
    await user.type(box, '{Enter}')
    expect(onSend).toHaveBeenCalledWith('first\nsecond')
    expect(box).toHaveValue('')
    await user.type(box, 'again')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenLastCalledWith('again')
  })

  it('is locked while streaming, with Stop instead of Send, and when Flo is off', async () => {
    const onStop = vi.fn()
    const { user, rerender } = renderWithProviders(<Composer streaming disabled={false} onSend={vi.fn()} onStop={onStop} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(onStop).toHaveBeenCalled()
    rerender(<Composer streaming={false} disabled onSend={vi.fn()} onStop={onStop} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })
})
