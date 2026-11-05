import { on, specJson } from '@/test/msw/typed'
import type { ResponseBody } from '@/test/msw/typed'

type Invite = ResponseBody<'/invites/{id}/resend', 'post', 200>

export function inviteFixture(overrides: Partial<Invite> = {}): Invite {
  return {
    id: 'inv1',
    tenantId: 'tn1',
    email: 'sam@example.com',
    role: 'TECHNICIAN',
    token: 'tok',
    expiresAt: '2026-11-06T00:00:00.000Z',
    acceptedAt: null,
    technicianId: 't1',
    createdAt: '2026-10-30T00:00:00.000Z',
    ...overrides,
  }
}

export const invitesHandlers = [
  on('get', '/invites', () => specJson('/invites', 'get', 200, [])),
  on('post', '/invites/{id}/resend', ({ params }) =>
    specJson('/invites/{id}/resend', 'post', 200, inviteFixture({ id: String(params.id) })),
  ),
  on('post', '/invites', () => specJson('/invites', 'post', 201, inviteFixture({ id: 'inv-new' }))),
]
