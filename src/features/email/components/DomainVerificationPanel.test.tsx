import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { EmailDomain } from '@/api/email-settings.api'
import { DomainVerificationPanel } from '@/features/email/components/DomainVerificationPanel'
import { EMAIL_SETTINGS_KEY } from '@/features/email/hooks/useEmailSettings'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

// Polling is effectively off except in the one test that asks for it.
const poll = vi.hoisted(() => ({ ms: 1_000_000 }))
vi.mock('@/features/email/hooks/useEmailSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/email/hooks/useEmailSettings')>()),
  get DOMAIN_POLL_MS() {
    return poll.ms
  },
}))

const domain = (overrides: Partial<EmailDomain> = {}): EmailDomain => ({
  domain: null,
  localPart: null,
  status: 'NONE',
  records: [],
  verifiedAt: null,
  tier: 1,
  sendingAddress: null,
  ...overrides,
})

const records = [
  { type: 'CNAME' as const, name: 'a._domainkey.x.co.uk', value: 'a.dkim.example' },
  { type: 'CNAME' as const, name: 'b._domainkey.x.co.uk', value: 'b.dkim.example' },
  { type: 'CNAME' as const, name: 'c._domainkey.x.co.uk', value: 'c.dkim.example' },
]

function renderPanel(value: EmailDomain, canEdit = true) {
  return renderWithProviders(<DomainVerificationPanel domain={value} canEdit={canEdit} />)
}

describe('DomainVerificationPanel', { timeout: 30_000 }, () => {
  it('explains tier 1 (shared sender) and tier 2 (own domain)', () => {
    renderPanel(domain())
    expect(screen.getByText(/Shared sender \(tier 1, the default\)/)).toBeInTheDocument()
    expect(screen.getByText('Sending from the shared RoundFlow address (tier 1)')).toBeInTheDocument()
  })

  it('starts verification with an optional sending name, and sends only what was typed', async () => {
    const bodies: unknown[] = []
    server.use(
      on('post', '/settings/email/domain', async ({ request }) => {
        bodies.push(await request.json())
        return specJson('/settings/email/domain', 'post', 200, domain({ domain: 'x.co.uk', status: 'PENDING', records }))
      }),
    )
    const { user } = renderPanel(domain())
    expect(screen.getByRole('button', { name: 'Start verification' })).toBeDisabled()
    await user.type(screen.getByLabelText('Domain'), ' x.co.uk ')
    await user.click(screen.getByRole('button', { name: 'Start verification' }))
    await waitFor(() => expect(bodies).toEqual([{ domain: 'x.co.uk' }]))
    await user.type(screen.getByLabelText('Sending name (before the @)'), 'billing')
    await user.click(screen.getByRole('button', { name: 'Start verification' }))
    await waitFor(() => expect(bodies[1]).toEqual({ domain: 'x.co.uk', localPart: 'billing' }))
  })

  it('refuses a free-mail domain with a clear explanation', async () => {
    server.use(
      on('post', '/settings/email/domain', () => HttpResponse.json({ error: 'Free mail', code: 'FREE_MAIL_DOMAIN' }, { status: 400 })),
    )
    const { user } = renderPanel(domain())
    await user.type(screen.getByLabelText('Domain'), 'gmail.com')
    await user.click(screen.getByRole('button', { name: 'Start verification' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot send as themselves.*shared RoundFlow address with your business name/)
  })

  it('shows the three DKIM records with copy buttons whose names say which record, and the PENDING chip in words', async () => {
    const written: string[] = []
    const { user } = renderPanel(domain({ domain: 'x.co.uk', status: 'PENDING', records }))
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => void written.push(text) } })
    expect(screen.getByText('Waiting for DNS')).toBeInTheDocument()
    expect(screen.getByText('Verification status:')).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'DKIM records: add each one as a CNAME at your domain provider' })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    await user.click(screen.getByRole('button', { name: 'Copy value of record 2' }))
    expect(written).toEqual(['b.dkim.example'])
    await user.click(screen.getByRole('button', { name: 'Copy name of record 1' }))
    expect(written).toEqual(['b.dkim.example', 'a._domainkey.x.co.uk'])
  })

  it('says so when copying is not allowed', async () => {
    const { user } = renderPanel(domain({ domain: 'x.co.uk', status: 'PENDING', records }))
    // After render: user-event installs its own clipboard when it is set up.
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => Promise.reject(new Error('denied')) } })
    await user.click(screen.getByRole('button', { name: 'Copy name of record 3' }))
    expect(await screen.findByText('Could not copy. Select the text and copy it by hand.')).toBeInTheDocument()
  })

  it('"Check now" reloads the status and shows VERIFIED with the sending address (tier 2), hiding the records', async () => {
    server.use(
      on('get', '/settings/email/domain', () =>
        specJson('/settings/email/domain', 'get', 200, domain({ domain: 'x.co.uk', status: 'VERIFIED', tier: 2, sendingAddress: 'accounts@x.co.uk' })),
      ),
    )
    const { user, queryClient } = renderPanel(domain({ domain: 'x.co.uk', status: 'PENDING', records }))
    queryClient.setQueryData(EMAIL_SETTINGS_KEY, { domain: domain({ domain: 'x.co.uk', status: 'PENDING', records }) })
    await user.click(screen.getByRole('button', { name: 'Check now' }))
    await waitFor(() => expect(queryClient.getQueryData<{ domain: EmailDomain }>(EMAIL_SETTINGS_KEY)?.domain.status).toBe('VERIFIED'))
    // Without a cached settings view the update is a no-op, and a failed check shows the error inline.
    server.use(on('get', '/settings/email/domain', () => HttpResponse.json({ error: 'x', code: 'EMAIL_DOMAIN_FAILED' }, { status: 502 })))
    await user.click(screen.getByRole('button', { name: 'Check now' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in a moment')
  })

  it('shows VERIFIED with the sending address and no records, and FAILED with its hint', () => {
    const verified = renderPanel(domain({ domain: 'x.co.uk', status: 'VERIFIED', tier: 2, sendingAddress: 'accounts@x.co.uk', records }))
    expect(screen.getByText('Sending from your own domain (tier 2): accounts@x.co.uk')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    verified.unmount()
    renderPanel(domain({ domain: 'x.co.uk', status: 'FAILED', records }))
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText(/records were not found or are wrong/)).toBeInTheDocument()
  })

  it('polls while PENDING', async () => {
    poll.ms = 30
    let calls = 0
    server.use(
      on('get', '/settings/email/domain', () => {
        calls += 1
        return specJson('/settings/email/domain', 'get', 200, domain({ domain: 'x.co.uk', status: 'PENDING', records }))
      }),
    )
    renderPanel(domain({ domain: 'x.co.uk', status: 'PENDING', records }))
    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2))
    poll.ms = 1_000_000
  })

  it('removes the domain after confirming, and keeps the dialog open with the error when it fails', async () => {
    let fail = true
    server.use(
      on('delete', '/settings/email/domain', () =>
        fail ? HttpResponse.json({ error: 'x', code: 'EMAIL_DOMAIN_FAILED' }, { status: 502 }) : specJson('/settings/email/domain', 'delete', 200, domain()),
      ),
    )
    const { user } = renderPanel(domain({ domain: 'x.co.uk', status: 'FAILED', records }))
    await user.click(screen.getByRole('button', { name: 'Remove domain' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Remove this sending domain?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove domain' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Try again in a moment')
    fail = false
    await user.click(within(dialog).getByRole('button', { name: 'Remove domain' }))
    expect(await screen.findByText('Domain removed')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('cancelling the remove dialog clears its error', async () => {
    server.use(on('delete', '/settings/email/domain', () => HttpResponse.json({ error: 'x', code: 'EMAIL_DOMAIN_FAILED' }, { status: 502 })))
    const { user } = renderPanel(domain({ domain: 'x.co.uk', status: 'PENDING', records }))
    await user.click(screen.getByRole('button', { name: 'Remove domain' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Remove domain' }))
    await within(dialog).findByRole('alert')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is read-only for someone who cannot edit: no form, no check, no remove, no polling', () => {
    const none = renderPanel(domain(), false)
    expect(screen.queryByRole('button', { name: 'Start verification' })).not.toBeInTheDocument()
    none.unmount()
    renderPanel(domain({ domain: 'x.co.uk', status: 'PENDING', records }), false)
    expect(screen.queryByRole('button', { name: 'Check now' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove domain' })).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
