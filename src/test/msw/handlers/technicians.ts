import { on, specJson } from '@/test/msw/typed'
import type { ResponseBody } from '@/test/msw/typed'

type TechnicianRow = ResponseBody<'/technicians', 'get', 200>[number]

export function technicianFixture(overrides: Partial<TechnicianRow> = {}): TechnicianRow {
  return {
    id: 't1',
    name: 'Sam',
    phone: '07700900201',
    role: 'STANDARD',
    email: 'sam@example.com',
    notes: null,
    active: true,
    appStatus: 'ACTIVE',
    serviceAreas: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    roundNames: [],
    todayStats: { total: 0, completed: 0, skipped: 0, remaining: 0 },
    ...overrides,
  }
}

export const techniciansHandlers = [
  on('get', '/technicians', () => specJson('/technicians', 'get', 200, [])),
  on('post', '/technicians', () => specJson('/technicians', 'post', 201, technicianFixture())),
  on('patch', '/technicians/{id}', ({ params }) =>
    specJson('/technicians/{id}', 'patch', 200, technicianFixture({ id: String(params.id) })),
  ),
]
