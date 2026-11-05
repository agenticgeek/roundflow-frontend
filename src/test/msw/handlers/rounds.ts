import { on, specJson } from '@/test/msw/typed'

export const roundsHandlers = [
  on('put', '/rounds/{id}/technicians', ({ params }) =>
    specJson('/rounds/{id}/technicians', 'put', 200, {
      roundId: String(params.id),
      allocation: [],
      visitsUpdated: 0,
    }),
  ),
]
