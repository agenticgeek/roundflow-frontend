import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '@/lib/errors'
import { STRIPE_STATE_KEY } from '@/lib/stripe-connect'
import StripeCallback from '@/pages/StripeCallback'

const navigate = vi.fn()
const completeStripeConnect = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))
vi.mock('@/api/settings.api', () => ({
  settingsApi: { completeStripeConnect: (...args: unknown[]) => completeStripeConnect(...args) },
}))

function renderAt(search: string) {
  window.history.replaceState({}, '', `/settings/stripe/callback${search}`)
  return render(
    <StrictMode>
      <MemoryRouter>
        <StripeCallback />
      </MemoryRouter>
    </StrictMode>,
  )
}

beforeEach(() => {
  navigate.mockReset()
  completeStripeConnect.mockReset()
})

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('StripeCallback', () => {
  it('exchanges the code once (even under StrictMode) and returns to integrations', async () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'st')
    completeStripeConnect.mockResolvedValue(undefined)

    renderAt('?code=ac_1&state=st')

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/settings/integrations?stripe=connected', { replace: true }),
    )
    expect(completeStripeConnect).toHaveBeenCalledTimes(1)
    expect(completeStripeConnect).toHaveBeenCalledWith('ac_1', 'st')
  })

  it('shows the server error when the exchange fails, with a way back', async () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'st')
    completeStripeConnect.mockRejectedValue(new ApiError(400, 'Stripe authorisation denied: expired'))

    renderAt('?code=ac_1&state=st')

    expect(await screen.findByText('Stripe authorisation denied: expired')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: "Couldn't connect Stripe" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }))
    expect(navigate).toHaveBeenCalledWith('/settings/integrations', { replace: true })
  })

  it('shows Stripe’s own error without calling the API', async () => {
    renderAt('?error=access_denied&error_description=The%20user%20denied%20your%20request')

    expect(await screen.findByText('The user denied your request')).toBeInTheDocument()
    expect(completeStripeConnect).not.toHaveBeenCalled()
  })

  it('refuses a forged state without calling the API', async () => {
    sessionStorage.setItem(STRIPE_STATE_KEY, 'mine')

    renderAt('?code=ac_1&state=forged')

    expect(await screen.findByText(/expired/)).toBeInTheDocument()
    expect(completeStripeConnect).not.toHaveBeenCalled()
  })
})
