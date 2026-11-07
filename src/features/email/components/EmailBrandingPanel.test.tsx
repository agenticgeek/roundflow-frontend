import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { EmailSettings } from '@/api/email-settings.api'
import { EmailBrandingPanel } from '@/features/email/components/EmailBrandingPanel'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { on, specJson } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const settings = (over: Partial<EmailSettings> = {}): EmailSettings => ({
  configured: true,
  enabled: true,
  paused: false,
  pausedReason: null,
  senderName: 'Coates Windows',
  replyTo: 'hello@coates.co.uk',
  dailyLimit: 500,
  sentToday: 12,
  brandColour: '#00758C',
  brandColourCheck: { colour: '#00758C', textColour: '#FFFFFF', buttonContrast: 5.9, warning: null },
  logoUrl: null,
  logoAltText: null,
  sender: { from: 'Coates Windows <no-reply@mail.roundflow.example>' },
  health: { sampleSize: 100, delivered: 97, bounced: 2, complaints: 1 },
  domain: { domain: null, localPart: null, status: 'NONE', records: [], verifiedAt: null, tier: 1, sendingAddress: null },
  channels: { email: true, sms: false, whatsapp: false, calls: true },
  ...over,
})

function backend(initial: EmailSettings = settings()) {
  const state = { current: initial, patches: [] as Record<string, unknown>[] }
  server.use(
    on('get', '/settings/email', () => specJson('/settings/email', 'get', 200, state.current)),
    on('patch', '/settings/email', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      state.patches.push(body)
      state.current = {
        ...state.current,
        ...('emailSenderName' in body ? { senderName: body.emailSenderName as string | null } : {}),
        ...('emailReplyTo' in body ? { replyTo: body.emailReplyTo as string | null } : {}),
        ...('emailEnabled' in body ? { enabled: body.emailEnabled as boolean } : {}),
        ...('brandColour' in body ? { brandColour: body.brandColour as string | null } : {}),
      }
      return specJson('/settings/email', 'patch', 200, state.current)
    }),
    on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'Coates Windows' })),
  )
  return state
}

const open = () => renderWithProviders(<EmailBrandingPanel />)

describe('EmailBrandingPanel', { timeout: 30_000 }, () => {
  it('shows the status, sent today and delivery health', async () => {
    backend()
    open()
    expect(await screen.findByRole('heading', { name: 'Email and branding' })).toBeInTheDocument()
    expect(await screen.findByText('Email is on')).toBeInTheDocument()
    expect(screen.getByText('12 sent today of 500')).toBeInTheDocument()
    expect(screen.getByText('Last 100 emails: 97 delivered, 2 bounced, 1 reported as spam')).toBeInTheDocument()
    expect(screen.getByText('Customers see emails from: Coates Windows <no-reply@mail.roundflow.example>')).toBeInTheDocument()
  })

  it.each([
    [{ configured: false }, 'Email is not set up for this account yet'],
    [{ enabled: false }, 'Email is switched off'],
  ])('status wording for %o', async (over, text) => {
    backend(settings(over))
    open()
    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it('has no daily limit line text when uncapped, and no health when there is no sample', async () => {
    backend(settings({ dailyLimit: null, health: {}, sender: null }))
    open()
    expect(await screen.findByText('12 sent today')).toBeInTheDocument()
    expect(screen.queryByText(/Last .* emails/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Customers see emails from/)).not.toBeInTheDocument()
  })

  it('a paused account shows the cause prominently and Resume sends emailPaused:false', async () => {
    const state = backend(settings({ paused: true, pausedReason: 'Complaint rate 0.4% is above 0.3%' }))
    const { user } = open()
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('RoundFlow paused your email sending')
    expect(banner).toHaveTextContent('Cause: Complaint rate 0.4% is above 0.3%')
    expect(screen.getByText('Email sending is paused')).toBeInTheDocument()
    await user.click(within(banner).getByRole('button', { name: 'Resume email' }))
    await waitFor(() => expect(state.patches).toEqual([{ emailPaused: false }]))
    expect(await screen.findByText('Email sending resumed')).toBeInTheDocument()
  })

  it('a paused account without a recorded reason still explains why, and a failed resume shows the error', async () => {
    backend(settings({ paused: true, pausedReason: null }))
    server.use(on('patch', '/settings/email', () => HttpResponse.json({ error: 'nope', code: 'ADMIN_ONLY' }, { status: 403 })))
    const { user } = open()
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Too many emails bounced or were reported as spam.')
    await user.click(within(banner).getByRole('button', { name: 'Resume email' }))
    expect(await screen.findByText('Only an administrator can do this.')).toBeInTheDocument()
  })

  it('saves only what changed, trims the name, and shows the server colour warning', async () => {
    const state = backend()
    const { user } = open()
    const name = await screen.findByLabelText('Sender name')
    await user.clear(name)
    await user.type(name, '  Coates and Sons  ')
    await user.click(screen.getByRole('switch', { name: 'Send emails from RoundFlow' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(state.patches).toEqual([{ emailSenderName: 'Coates and Sons', emailEnabled: false }]))
    expect(await screen.findByText('Email settings saved')).toBeInTheDocument()
  })

  it('sends null for cleared fields and the normalised colour', async () => {
    const state = backend()
    const { user } = open()
    await user.clear(await screen.findByLabelText('Reply-to address'))
    await user.clear(screen.getByLabelText('Brand colour'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(state.patches).toEqual([{ emailReplyTo: null, brandColour: null }]))
    await user.type(screen.getByLabelText('Brand colour'), '#336699')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(state.patches[1]).toEqual({ brandColour: '#336699' }))
  })

  it('does not send an invalid colour, and Save does nothing when nothing changed', async () => {
    const state = backend()
    const { user } = open()
    await screen.findByLabelText('Sender name')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await user.type(screen.getByLabelText('Brand colour'), 'x')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(state.patches).toEqual([])
  })

  it('shows the server validation message next to the form', async () => {
    backend()
    server.use(on('patch', '/settings/email', () => HttpResponse.json({ error: 'bad', code: 'INVALID_EMAIL_SENDER_NAME' }, { status: 400 })))
    const { user } = open()
    await user.type(await screen.findByLabelText('Sender name'), '@')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('70 characters or fewer')
  })

  it('sends a test email to the signed-in admin and reports where it came from, or why not', async () => {
    backend()
    let fail = false
    server.use(
      on('post', '/settings/email/test', () =>
        fail
          ? HttpResponse.json({ error: 'x', code: 'CHANNEL_UNAVAILABLE', reason: 'EMAIL_NOT_CONFIGURED' }, { status: 409 })
          : specJson('/settings/email/test', 'post', 200, { sent: true, from: 'no-reply@mail.roundflow.example', tier: 1 }),
      ),
    )
    const { user } = open()
    await user.click(await screen.findByRole('button', { name: 'Send a test email to me' }))
    expect(await screen.findByText('Test email sent to your address. It came from no-reply@mail.roundflow.example.')).toBeInTheDocument()
    fail = true
    await user.click(screen.getByRole('button', { name: 'Send a test email to me' }))
    expect(await screen.findByText('Email is not set up for this account yet')).toBeInTheDocument()
  })

  it('logo: shows the saved logo with alt text, defaulting to the business name', async () => {
    backend(settings({ logoUrl: 'https://img.example/logo.png', logoAltText: null }))
    open()
    expect(await screen.findByRole('img', { name: 'Coates Windows' })).toHaveAttribute('src', 'https://img.example/logo.png')
  })

  it('logo: validates, uploads, and removes', async () => {
    const state = backend(settings({ logoUrl: 'https://img.example/old.png', logoAltText: 'Old logo' }))
    const calls: unknown[] = []
    server.use(
      on('post', '/settings/email/logo/upload-url', async ({ request }) => {
        calls.push(await request.json())
        return specJson('/settings/email/logo/upload-url', 'post', 200, { signedUrl: 'https://files.example/up', token: 't', path: 'tn/branding/new.png' })
      }),
      http.put('https://files.example/up', () => new HttpResponse(null, { status: 200 })),
      on('put', '/settings/email/logo', async ({ request }) => {
        calls.push(await request.json())
        state.current = { ...state.current, logoUrl: 'https://img.example/new.png', logoAltText: 'Coates logo' }
        return specJson('/settings/email/logo', 'put', 200, state.current)
      }),
      on('delete', '/settings/email/logo', () => {
        state.current = { ...state.current, logoUrl: null }
        return specJson('/settings/email/logo', 'delete', 200, state.current)
      }),
    )
    const { user } = open()
    const input = await screen.findByLabelText('Choose a logo file')
    expect(screen.getByRole('button', { name: 'Upload logo' })).toBeDisabled()

    // user.upload honours `accept` and would drop the SVG, so hand the input a file list directly.
    const svg = new File(['x'], 'logo.svg', { type: 'image/svg+xml' })
    fireEvent.change(input, { target: { files: Object.assign([svg], { item: () => svg }) } })
    expect(await screen.findByText('Use a PNG, JPEG or WebP image.')).toBeInTheDocument()

    await user.upload(input, new File(['x'], 'logo.png', { type: 'image/png' }))
    expect(screen.getByText('Chosen file: logo.png')).toBeInTheDocument()
    const alt = screen.getByLabelText('Logo description (alt text)')
    expect(alt).toHaveValue('Old logo')
    await user.clear(alt)
    await user.click(screen.getByRole('button', { name: 'Upload logo' }))
    expect(await screen.findByText('Describe the logo before uploading it.')).toBeInTheDocument()
    await user.type(alt, 'Coates logo')
    await user.click(screen.getByRole('button', { name: 'Upload logo' }))
    expect(await screen.findByText('Logo saved')).toBeInTheDocument()
    expect(calls).toEqual([{ mimeType: 'image/png' }, { path: 'tn/branding/new.png', altText: 'Coates logo' }])

    await user.click(screen.getByRole('button', { name: 'Remove logo' }))
    expect(await screen.findByText('Logo removed')).toBeInTheDocument()
    expect(await screen.findByText('No logo yet')).toBeInTheDocument()
  })

  it('logo: a failed upload or removal is reported inline', async () => {
    backend(settings({ logoUrl: 'https://img.example/old.png', logoAltText: 'Old' }))
    server.use(
      on('post', '/settings/email/logo/upload-url', () => HttpResponse.json({ error: 'x', code: 'INVALID_LOGO_PATH' }, { status: 400 })),
      on('delete', '/settings/email/logo', () => HttpResponse.json({ error: 'Storage down', requestId: 'req_1' }, { status: 500 })),
    )
    const { user } = open()
    await user.upload(await screen.findByLabelText('Choose a logo file'), new File(['x'], 'logo.webp', { type: 'image/webp' }))
    await user.click(screen.getByRole('button', { name: 'Upload logo' }))
    expect(await screen.findByText('That logo upload did not match your account. Choose the file again.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove logo' }))
    expect(await screen.findByText('Storage down Reference: req_1')).toBeInTheDocument()
  })

  it('a MANAGER sees everything read-only, with the reason, and no edit controls', async () => {
    setBootstrap({ role: 'MANAGER' })
    backend(settings({ logoUrl: 'https://img.example/logo.png', logoAltText: 'Logo' }))
    open()
    const note = await screen.findByText('Only an administrator can change email settings. You can see them here.')
    expect(screen.getByLabelText('Sender name')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Sender name')).toHaveAccessibleDescription(note.textContent!)
    expect(screen.getByRole('switch', { name: 'Send emails from RoundFlow' })).toBeDisabled()
    for (const name of ['Save changes', 'Send a test email to me', 'Upload logo', 'Remove logo', 'Resume email', 'Start verification']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByLabelText('Choose a logo file')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Logo' })).toBeInTheDocument()
  })

  it('a MANAGER does not see the resume button on a paused account', async () => {
    setBootstrap({ role: 'MANAGER' })
    backend(settings({ paused: true, pausedReason: 'High bounces' }))
    open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cause: High bounces')
    expect(screen.queryByRole('button', { name: 'Resume email' })).not.toBeInTheDocument()
  })

  it('load failure: message with the reference and a Retry', async () => {
    let calls = 0
    server.use(
      on('get', '/settings/email', () => {
        calls += 1
        return calls === 1 ? HttpResponse.json({ error: 'Down', requestId: 'req_7' }, { status: 500 }) : specJson('/settings/email', 'get', 200, settings())
      }),
      on('get', '/settings/business-profile', () => HttpResponse.json({ businessName: 'Coates Windows' })),
    )
    const { user } = open()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not load email settings.')
    expect(alert).toHaveTextContent('Down Reference: req_7')
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Email is on')).toBeInTheDocument()
  })

  it('without a business name the alt text starts empty', async () => {
    backend(settings({ logoUrl: 'https://img.example/logo.png', logoAltText: null }))
    server.use(on('get', '/settings/business-profile', () => HttpResponse.json(null)))
    open()
    expect(await screen.findByLabelText('Logo description (alt text)')).toHaveValue('')
    expect(screen.getByRole('img', { name: 'Logo' })).toBeInTheDocument()
  })

  it('falls back to a not-started domain when the view has none', async () => {
    backend(settings({ domain: undefined, channels: undefined }))
    open()
    expect(await screen.findByText('Sending from the shared RoundFlow address (tier 1)')).toBeInTheDocument()
  })

  it('copes with a sparse view: no names, counts or health numbers yet', async () => {
    backend({ configured: true, enabled: true, health: { sampleSize: 10 } } as EmailSettings)
    const { user } = open()
    expect(await screen.findByText('0 sent today')).toBeInTheDocument()
    expect(screen.getByText('Last 10 emails: 0 delivered, 0 bounced, 0 reported as spam')).toBeInTheDocument()
    expect(screen.getByLabelText('Sender name')).toHaveValue('')
    await user.type(screen.getByLabelText('Sender name'), '   ')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('counts zero sent today against a daily limit when the count is missing', async () => {
    backend(settings({ dailyLimit: 50, sentToday: undefined }))
    open()
    expect(await screen.findByText('0 sent today of 50')).toBeInTheDocument()
  })

  it('shows the server colour warning with its safe accent colour for the saved colour', async () => {
    backend(
      settings({
        brandColour: '#FFD700',
        brandColourCheck: null,
        warning: {
          colour: '#FFD700',
          textColour: '#000000',
          buttonContrast: 14.1,
          warning: { code: 'LOW_CONTRAST_ON_WHITE', message: 'Too light', textColour: '#000000', safeAccentColour: '#8A7400' },
        },
      }),
    )
    open()
    expect(await screen.findByText(/will use #8A7400 instead/)).toBeInTheDocument()
  })

  it('choosing nothing in the logo picker clears the chosen file', async () => {
    backend(settings({ logoUrl: null }))
    const { user } = open()
    const input = await screen.findByLabelText('Choose a logo file')
    await user.upload(input, new File(['x'], 'logo.png', { type: 'image/png' }))
    expect(screen.getByText('Chosen file: logo.png')).toBeInTheDocument()
    fireEvent.change(input, { target: { files: Object.assign([], { item: () => null }) } })
    expect(screen.queryByText(/Chosen file/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload logo' })).toBeDisabled()
  })
})
