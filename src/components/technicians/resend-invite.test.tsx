import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { TechniciansScreen } from '@/components/technicians/TechniciansScreen'
import { technicianFixture } from '@/test/msw/handlers/technicians'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { setBootstrap } from '@/test/bootstrap'
import { renderWithProviders } from '@/test/render'

const pendingTechnician = technicianFixture({ id: 't1', name: 'Sam', email: 'sam@example.com', appStatus: 'PENDING_INVITE' })

function serveScreen(openInvites: Array<Record<string, unknown>>) {
  const created = vi.fn()
  const resent = vi.fn()
  server.use(
    http.get(`${API}/technicians`, () => HttpResponse.json([pendingTechnician])),
    http.get(`${API}/technicians/:id`, () => HttpResponse.json(pendingTechnician)),
    http.get(`${API}/settings/service-areas`, () => HttpResponse.json([])),
    http.get(`${API}/invites`, () => HttpResponse.json(openInvites)),
    http.post(`${API}/invites`, () => {
      created()
      return HttpResponse.json({ error: 'A pending invite for this email already exists' }, { status: 409 })
    }),
    http.post(`${API}/invites/:id/resend`, ({ params }) => {
      resent(params.id)
      return HttpResponse.json({ id: params.id })
    }),
  )
  return { created, resent }
}

async function openEditAndClickResend(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Resend invite?' }))
}

describe('Technicians › Resend invite', () => {
  it('resends the OPEN invite (POST /invites/:id/resend), never creates a new one', async () => {
    setBootstrap({ role: 'ADMIN' })
    const { created, resent } = serveScreen([
      { id: 'inv1', email: 'sam@example.com', role: 'TECHNICIAN', technicianId: 't1', expiresAt: '2026-11-06T00:00:00.000Z', createdAt: '2026-10-30T00:00:00.000Z' },
    ])
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/edit' })

    await openEditAndClickResend(user)

    await waitFor(() => expect(resent).toHaveBeenCalledWith('inv1'))
    expect(created).not.toHaveBeenCalled()
    expect(await screen.findByText('Invite resent.')).toBeInTheDocument()
  })

  it('with no open invite on file, creates one from the technician’s email', async () => {
    setBootstrap({ role: 'ADMIN' })
    const { created, resent } = serveScreen([])
    server.use(
      http.post(`${API}/invites`, () => {
        created()
        return HttpResponse.json({ id: 'inv-new' }, { status: 201 })
      }),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/edit' })

    await openEditAndClickResend(user)

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1))
    expect(resent).not.toHaveBeenCalled()
    expect(await screen.findByText('Invite resent.')).toBeInTheDocument()
  })

  it('shows the server’s message when the invite email cannot be sent', async () => {
    setBootstrap({ role: 'ADMIN' })
    serveScreen([
      { id: 'inv1', email: 'sam@example.com', role: 'TECHNICIAN', technicianId: 't1', expiresAt: '2026-11-06T00:00:00.000Z', createdAt: '2026-10-30T00:00:00.000Z' },
    ])
    server.use(
      http.post(`${API}/invites/:id/resend`, () =>
        HttpResponse.json({ error: 'Invite email failed to send. Please try again.' }, { status: 503 }),
      ),
    )
    const { user } = renderWithProviders(<TechniciansScreen />, { route: '/technicians/t1/edit' })

    await openEditAndClickResend(user)

    expect(await screen.findByText('Invite email failed to send. Please try again.')).toBeInTheDocument()
  })
})
