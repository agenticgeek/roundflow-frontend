import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { API } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

// Business closures: the Settings "Closures" section is mounted for ADMIN and MANAGER only.

const closure = {
  id: 'c1', label: 'Christmas', startDate: '2026-12-24', endDate: '2026-12-28', mode: 'MOVE', notifyCustomers: false,
  roundIds: [], appliedAt: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z',
}

function closuresReturn() {
  server.use(http.get(`${API}/closures`, () => HttpResponse.json({ closures: [closure] })))
}

describe('SettingsScreen closures section', () => {
  it.each(['ADMIN', 'MANAGER'] as const)('a %s opens Closures from the sidebar and sees the list', async (role) => {
    setBootstrap({ role })
    closuresReturn()
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Closures' }))
    expect(await screen.findByRole('heading', { name: 'Closures' })).toBeInTheDocument()
    expect(await screen.findByText('Christmas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a closure' })).toBeInTheDocument()
  })

  it('a technician gets no closures panel', async () => {
    setBootstrap({ role: 'TECHNICIAN' })
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(screen.getByRole('button', { name: 'Closures' }))
    expect(screen.queryByRole('heading', { name: 'Closures' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add a closure' })).not.toBeInTheDocument()
  })
})
