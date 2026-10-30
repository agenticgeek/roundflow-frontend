import { on, specJson } from '@/test/msw/typed'

export const reportsHandlers = [
  on('get', '/reports/activity', () =>
    specJson('/reports/activity', 'get', 200, {
      rows: [],
      pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    }),
  ),
]
