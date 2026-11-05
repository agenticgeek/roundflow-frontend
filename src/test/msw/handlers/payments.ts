import { on, specJson } from '@/test/msw/typed'

export const paymentsHandlers = [
  on('patch', '/payments/{id}/status', async ({ params, request }) => {
    const body = (await request.json()) as { status: 'PAID' | 'FAILED' }
    return specJson('/payments/{id}/status', 'patch', 200, {
      id: String(params.id),
      method: 'BACS',
      status: body.status,
    })
  }),
]
