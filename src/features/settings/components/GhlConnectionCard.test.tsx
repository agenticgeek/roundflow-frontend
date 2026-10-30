import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import type { GhlStatus } from '@/api/settings.api'
import { GhlConnectionCard } from '@/features/settings/components/GhlConnectionCard'
import { GHL_STATUS_KEY } from '@/features/settings/hooks/useGhl'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { apiError, gate, on, specJson } from '@/test/msw/typed'
import { GHL_WEBHOOK_URL } from '@/test/msw/handlers/settings'
import { renderWithProviders } from '@/test/render'

const disconnected: GhlStatus = {
  connected: false,
  method: null,
  locationId: null,
  locationName: null,
  webhookUrl: null,
  connectedAt: null,
}
const connectedPrivate: GhlStatus = {
  connected: true,
  method: 'private',
  locationId: 'loc-1',
  locationName: 'Coates Windows',
  webhookUrl: GHL_WEBHOOK_URL,
  connectedAt: null,
}

/** GET /settings/ghl/status answering with whatever `state.status` is at request time. */
function statusHandler(initial: GhlStatus) {
  const state = { status: initial }
  server.use(on('get', '/settings/ghl/status', () => specJson('/settings/ghl/status', 'get', 200, state.status)))
  return state
}

const originalLocation = window.location
afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
})

describe('GhlConnectionCard (GAP-017)', () => {
  it('validates, connects with a private token, then shows the details and the webhook URL to copy', async () => {
    const state = statusHandler(disconnected)
    server.use(
      on('post', '/settings/ghl/connect-private', () => {
        state.status = connectedPrivate
        return specJson('/settings/ghl/connect-private', 'post', 200, {
          status: 'connected',
          method: 'private',
          webhookUrl: GHL_WEBHOOK_URL,
        })
      }),
    )
    const { user, queryClient } = renderWithProviders(<GhlConnectionCard canMutate />)
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    expect(screen.getByText('Checking connection…')).toBeInTheDocument()
    expect(await screen.findByText('Not connected')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Connect GoHighLevel' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Paste the Private Integration token.')
    await user.type(screen.getByLabelText('Private Integration token'), ' pit-123 ')
    await user.click(screen.getByRole('button', { name: 'Connect GoHighLevel' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the Location ID.')
    await user.type(screen.getByLabelText('Location ID'), 'loc-1')
    await user.click(screen.getByRole('button', { name: 'Connect GoHighLevel' }))

    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('GoHighLevel connected')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Coates Windows')).toBeInTheDocument()
    expect(screen.getByText('Private Integration token')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.settings.payment })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: GHL_STATUS_KEY })
    expect(screen.queryByLabelText('Location ID')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Webhook URL'))
    expect(screen.getByLabelText('Webhook URL')).toHaveValue(GHL_WEBHOOK_URL)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(GHL_WEBHOOK_URL)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows GHL’s reason when the token is rejected', async () => {
    statusHandler(disconnected)
    server.use(on('post', '/settings/ghl/connect-private', () => apiError(400, 'GHL API key or location ID is invalid')))
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    await user.type(await screen.findByLabelText('Private Integration token'), 'bad')
    await user.type(screen.getByLabelText('Location ID'), 'loc')
    await user.click(screen.getByRole('button', { name: 'Connect GoHighLevel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('GHL API key or location ID is invalid')
    expect(screen.getByLabelText('Private Integration token')).toHaveValue('bad')
  })

  it('signs in with GoHighLevel: fetches the consent URL and leaves for it', async () => {
    statusHandler(disconnected)
    const assign = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...originalLocation, assign }, configurable: true })
    const hold = gate()
    server.use(
      on('get', '/settings/ghl/authorize', async () => {
        await hold.wait()
        return HttpResponse.json({ url: 'https://marketplace.gohighlevel.com/oauth/chooselocation?x=1' })
      }),
    )
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    await user.click(await screen.findByRole('button', { name: 'Sign in with GoHighLevel' }))
    expect(await screen.findByRole('button', { name: 'Opening GoHighLevel…' })).toBeDisabled()
    hold.release()
    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://marketplace.gohighlevel.com/oauth/chooselocation?x=1'),
    )
  })

  it('shows why the GoHighLevel sign-in couldn’t start', async () => {
    statusHandler(disconnected)
    server.use(on('get', '/settings/ghl/authorize', () => apiError(503, 'GHL OAuth is not configured')))
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    await user.click(await screen.findByRole('button', { name: 'Sign in with GoHighLevel' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('GHL OAuth is not configured')
  })

  it('tests the connection, naming the location when GHL returns it', async () => {
    statusHandler(connectedPrivate)
    const results = [
      () => specJson('/settings/ghl/test', 'post', 200, { ok: true, locationName: 'Coates Windows' }),
      () => specJson('/settings/ghl/test', 'post', 200, { ok: true, locationName: null }),
      () => apiError(502, 'GHL rejected the stored token', 'GHL_SEND_FAILED'),
    ]
    const hold = gate()
    server.use(
      on('post', '/settings/ghl/test', async () => {
        await hold.wait()
        return results.shift()!()
      }),
    )
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    await user.click(await screen.findByRole('button', { name: 'Test connection' }))
    expect(await screen.findByRole('button', { name: 'Testing…' })).toBeDisabled()
    hold.release()
    expect(await screen.findByText('GoHighLevel connection works — Coates Windows')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(await screen.findByText('GoHighLevel connection works')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('GHL rejected the stored token')
  })

  it('falls back to the location id and a dash when GHL can’t name them, and copes with a blocked clipboard', async () => {
    statusHandler({ ...connectedPrivate, method: null, locationName: null })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('blocked'))
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    expect(await screen.findByText('loc-1')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('hides the webhook box when there is no webhook URL, and shows a dash with no location at all', async () => {
    statusHandler({ ...connectedPrivate, method: 'oauth', locationId: null, locationName: null, webhookUrl: null })
    renderWithProviders(<GhlConnectionCard canMutate />)
    expect(await screen.findByText('GoHighLevel sign-in')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByLabelText('Webhook URL')).not.toBeInTheDocument()
  })

  it('confirms before disconnecting, and reports a failure', async () => {
    const state = statusHandler(connectedPrivate)
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    await user.click(await screen.findByRole('button', { name: 'Disconnect' }))
    expect(screen.getByText(/Disconnect GoHighLevel\?/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Disconnect' }))

    server.use(on('post', '/settings/ghl/disconnect', () => apiError(403, 'Finish setup first')))
    await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Finish setup first')

    const disconnectHold = gate()
    server.use(
      on('post', '/settings/ghl/disconnect', async () => {
        await disconnectHold.wait()
        state.status = disconnected
        return specJson('/settings/ghl/disconnect', 'post', 200, { status: 'disconnected' })
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Yes, disconnect' }))
    expect(await screen.findByRole('button', { name: 'Disconnecting…' })).toBeDisabled()
    disconnectHold.release()
    expect(await screen.findByText('GoHighLevel disconnected')).toBeInTheDocument()
    expect(await screen.findByText('Not connected')).toBeInTheDocument()
  })

  it('explains a status failure and retries', async () => {
    let fail = true
    server.use(
      on('get', '/settings/ghl/status', () =>
        fail ? apiError(500, 'boom') : specJson('/settings/ghl/status', 'get', 200, disconnected),
      ),
    )
    const { user } = renderWithProviders(<GhlConnectionCard canMutate />)
    expect(await screen.findByText('Couldn’t check the GoHighLevel connection.', {}, { timeout: 5000 })).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Not connected')).toBeInTheDocument()
    expect(screen.queryByText('Couldn’t check the GoHighLevel connection.')).not.toBeInTheDocument()
  })

  it('is read-only for staff who can’t change integrations', async () => {
    statusHandler(connectedPrivate)
    renderWithProviders(<GhlConnectionCard canMutate={false} />)
    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('Only admins and managers can change integrations.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Test connection' })).not.toBeInTheDocument()
  })
})
