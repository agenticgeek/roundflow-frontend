import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { FailedMessagesPanel } from '@/features/integrations/components/FailedMessagesPanel'
import { server } from '@/test/msw/server'
import { on, specJson, type ResponseBody } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

type Page = ResponseBody<'/integrations/outbox', 'get', 200>
type Row = Page['rows'][number]

const row = (overrides: Partial<Row> = {}): Row => ({
  id: 'ob1',
  eventType: 'message.send',
  status: 'dead',
  attempts: 6,
  lastError: 'GHL rejected the token',
  customerId: 'c1',
  batchId: null,
  createdAt: '2026-11-05T10:30:00.000Z',
  processedAt: null,
  ...overrides,
})

const page = (rows: Row[], overrides: Partial<Page['pagination']> = {}): Page => ({
  rows,
  pagination: { page: 1, pageSize: 50, total: rows.length, totalPages: 1, ...overrides },
})

function list(handler: (search: URLSearchParams) => Page) {
  server.use(on('get', '/integrations/outbox', ({ request }) => specJson('/integrations/outbox', 'get', 200, handler(new URL(request.url).searchParams))))
}

describe('FailedMessagesPanel', { timeout: 30_000 }, () => {
  it('lists dead messages in a labelled table with text status, and shows what went wrong', async () => {
    list((search) => {
      expect(search.get('status')).toBe('dead')
      expect(search.get('page')).toBe('1')
      return page([row(), row({ id: 'ob2', eventType: 'invoice_bulk.send', lastError: null, status: 'dead', attempts: 1 })])
    })
    renderWithProviders(<FailedMessagesPanel />)

    expect(await screen.findByRole('heading', { name: 'Failed integration messages' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Failed integration messages' })
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Event',
      'Status',
      'Attempts',
      'Last error',
      'Failed at',
      'Action',
    ])
    const [first, second] = within(table).getAllByRole('row').slice(1)
    expect(within(first!).getByText('Message send')).toBeInTheDocument()
    expect(within(first!).getByText('Gave up')).toBeInTheDocument()
    expect(within(first!).getByText('GHL rejected the token')).toBeInTheDocument()
    expect(within(first!).getByText('5 Nov, 10:30')).toBeInTheDocument()
    expect(within(second!).getByText('Invoice bulk send')).toBeInTheDocument()
    expect(within(second!).getByText('No error recorded')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Failed messages, scrollable' })).toHaveAttribute('tabindex', '0')
  })

  it('switches to messages that failed but will be tried again', async () => {
    const seen: (string | null)[] = []
    list((search) => {
      seen.push(search.get('status'))
      return search.get('status') === 'failed' ? page([row({ id: 'ob3', status: 'failed', attempts: 2 })]) : page([row()])
    })
    const { user } = renderWithProviders(<FailedMessagesPanel />)
    await screen.findByRole('cell', { name: 'Gave up' })
    await user.selectOptions(screen.getByLabelText('Show'), 'failed')
    expect(await screen.findByRole('cell', { name: 'Failed, will retry' })).toBeInTheDocument()
    expect(seen).toEqual(['dead', 'failed'])
  })

  it('says so when nothing has failed', async () => {
    list(() => page([]))
    renderWithProviders(<FailedMessagesPanel />)
    expect(await screen.findByText('No failed messages. Everything RoundFlow tried to send went through.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('pages through long lists and goes back to page 1 when the filter changes', async () => {
    const pages: (string | null)[] = []
    list((search) => {
      pages.push(`${search.get('status')}:${search.get('page')}`)
      const current = Number(search.get('page'))
      return page([row({ id: `ob${current}` })], { page: current, total: 120, totalPages: 3 })
    })
    const { user } = renderWithProviders(<FailedMessagesPanel />)
    await screen.findByText('Showing 1–50 of 120')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(pages).toContain('dead:2'))
    await user.selectOptions(screen.getByLabelText('Show'), 'failed')
    await waitFor(() => expect(pages).toContain('failed:1'))
  })

  it('a failed load shows the error with its reference and a Retry that reloads', async () => {
    let calls = 0
    server.use(
      on('get', '/integrations/outbox', () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ error: 'Database down', requestId: 'req_55' }, { status: 500 })
          : specJson('/integrations/outbox', 'get', 200, page([row()]))
      }),
    )
    const { user } = renderWithProviders(<FailedMessagesPanel />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not load failed messages.')
    expect(alert).toHaveTextContent('Database down')
    await user.click(within(alert).getByRole('button', { name: 'Retry loading' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  describe('replay', () => {
    it('asks first; Cancel changes nothing, Retry sends it and refreshes the list', async () => {
      let replayed: string | undefined
      let rows = [row()]
      list(() => page(rows))
      server.use(
        on('post', '/integrations/outbox/{id}/replay', ({ params }) => {
          replayed = String(params.id)
          rows = []
          return specJson('/integrations/outbox/{id}/replay', 'post', 200, { id: 'ob1', status: 'pending' })
        }),
      )
      const { user } = renderWithProviders(<FailedMessagesPanel />)
      await user.click(await screen.findByRole('button', { name: 'Retry message send from 5 Nov, 10:30' }))
      const dialog = await screen.findByRole('alertdialog', { name: 'Retry this message?' })
      expect(dialog).toHaveAccessibleDescription(/try to send it again within about a minute/i)
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      expect(replayed).toBeUndefined()

      await user.click(screen.getByRole('button', { name: 'Retry message send from 5 Nov, 10:30' }))
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Retry message' }))
      await waitFor(() => expect(replayed).toBe('ob1'))
      expect(await screen.findByText('Queued to try again')).toBeInTheDocument()
      expect(await screen.findByText('No failed messages. Everything RoundFlow tried to send went through.')).toBeInTheDocument()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    async function failReplay(status: number, body: Record<string, unknown>) {
      list(() => page([row()]))
      server.use(on('post', '/integrations/outbox/{id}/replay', () => HttpResponse.json(body, { status })))
      const view = renderWithProviders(<FailedMessagesPanel />)
      await view.user.click(await screen.findByRole('button', { name: /Retry message send/ }))
      await view.user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Retry message' }))
      return { alert: await screen.findByRole('alert'), user: view.user }
    }

    it('explains a message that was not found', async () => {
      expect((await failReplay(404, { error: 'nope', code: 'OUTBOX_NOT_FOUND' })).alert).toHaveTextContent('That message was not found.')
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('explains a message that can no longer be retried', async () => {
      expect((await failReplay(409, { error: 'nope', code: 'OUTBOX_NOT_REPLAYABLE' })).alert).toHaveTextContent('Only failed messages can be retried.')
    })

    it('explains ADMIN_ONLY and passes any other error through', async () => {
      expect((await failReplay(403, { error: 'Forbidden', code: 'ADMIN_ONLY' })).alert).toHaveTextContent('Only an administrator can do this.')
    })

    it('shows the server message for anything else', async () => {
      expect((await failReplay(500, { error: 'Worker offline', requestId: 'req_9' })).alert).toHaveTextContent('Worker offline Reference: req_9')
    })

    it('closes the dialog after an error with Cancel and clears the error', async () => {
      const { user } = await failReplay(409, { error: 'x', code: 'OUTBOX_NOT_REPLAYABLE' })
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    })
  })
})
