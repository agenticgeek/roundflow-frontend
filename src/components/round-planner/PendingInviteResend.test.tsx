import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { PendingInviteResend } from '@/components/round-planner/PendingInviteResend'
import { resendTechnicianInvite } from '@/features/invites/hooks/useResendTechnicianInvite'
import { queryKeys } from '@/lib/query-keys'
import { server } from '@/test/msw/server'
import { apiError, on, specJson } from '@/test/msw/typed'
import { inviteFixture } from '@/test/msw/handlers/invites'
import { renderWithProviders } from '@/test/render'

const pendingInvite = {
  id: 'inv1',
  email: 'sam@example.com',
  role: 'TECHNICIAN' as const,
  technicianId: 't1',
  expiresAt: '2026-11-06T00:00:00Z',
  createdAt: '2026-10-30T00:00:00Z',
  expired: false,
}

describe('resendTechnicianInvite (GAP-011)', () => {
  it('resends the technician’s open invite', async () => {
    const resent = vi.fn()
    server.use(
      on('get', '/invites', () => specJson('/invites', 'get', 200, [pendingInvite])),
      on('post', '/invites/{id}/resend', ({ params }) => {
        resent(params.id)
        return specJson('/invites/{id}/resend', 'post', 200, inviteFixture())
      }),
    )
    await resendTechnicianInvite({ technicianId: 't1' })
    expect(resent).toHaveBeenCalledWith('inv1')
  })

  it('creates an invite when none is open', async () => {
    let body: unknown
    server.use(
      on('post', '/invites', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(inviteFixture(), { status: 201 })
      }),
    )
    await resendTechnicianInvite({ technicianId: 't2', email: ' new@example.com ' })
    expect(body).toEqual({ email: 'new@example.com', role: 'TECHNICIAN', technicianId: 't2' })
  })

  it('needs an email to create one', async () => {
    await expect(resendTechnicianInvite({ technicianId: 't2', email: null })).rejects.toThrow(
      'Add an email to this technician before inviting them.',
    )
  })
})

describe('PendingInviteResend', () => {
  it('resends and confirms, refreshing technicians', async () => {
    server.use(on('get', '/invites', () => specJson('/invites', 'get', 200, [pendingInvite])))
    const { user, queryClient } = renderWithProviders(
      <PendingInviteResend technician={{ id: 't1', name: 'Sam' }} />,
    )
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    expect(screen.getByText('Invite pending')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resend invite' }))
    expect(await screen.findByText('Invite resent to Sam')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.technicians.all })
  })

  it('names the technician by email when unnamed, and shows server errors', async () => {
    server.use(
      on('get', '/invites', () => specJson('/invites', 'get', 200, [pendingInvite])),
      on('post', '/invites/{id}/resend', () => apiError(503, 'Invite email failed to send')),
    )
    const { user } = renderWithProviders(
      <PendingInviteResend technician={{ id: 't1', email: 'sam@example.com' }} className="x" />,
    )
    await user.click(screen.getByRole('button', { name: 'Resend invite' }))
    expect(await screen.findByText('Invite email failed to send')).toBeInTheDocument()
  })

  it('falls back to an empty name', async () => {
    server.use(on('get', '/invites', () => specJson('/invites', 'get', 200, [pendingInvite])))
    const { user } = renderWithProviders(<PendingInviteResend technician={{ id: 't1' }} />)
    await user.click(screen.getByRole('button', { name: 'Resend invite' }))
    expect(await screen.findByText('Invite resent to')).toBeInTheDocument()
  })
})
