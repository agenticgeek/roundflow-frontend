import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { TechniciansStep } from '@/components/setup-wizard/steps/TechniciansStep'
import { TechnicianForm, toCreateInput, toUpdateInput } from '@/components/technicians/TechnicianForm'
import { technicianListToUi } from '@/features/technicians/lib/mappers'
import { technicianListItem } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

const areas = [
  { id: 'a1', name: 'Alnwick' },
  { id: 'a2', name: 'Amble' },
]
const twoAreaTechnician = technicianListItem({
  serviceAreas: [
    { serviceAreaId: 'a1', serviceAreaName: 'Alnwick', assignedAt: '2026-10-01' },
    { serviceAreaId: 'a2', serviceAreaName: 'Amble', assignedAt: '2026-10-01' },
  ],
})

describe('GAP-004: technicians keep every service area', () => {
  it('maps all areas from the list response', () => {
    expect(technicianListToUi([twoAreaTechnician])[0]?.serviceAreaIds).toEqual(['a1', 'a2'])
  })

  it('setup wizard: saves every picked area and lists them from the API', async () => {
    const onCreateTechnician = vi.fn().mockResolvedValue('t9')
    const onUpdateTechnician = vi.fn().mockResolvedValue(undefined)
    const { user } = renderWithProviders(
      <TechniciansStep
        technicians={[twoAreaTechnician]}
        areas={areas}
        saving={false}
        onCreateTechnician={onCreateTechnician}
        onUpdateTechnician={onUpdateTechnician}
        onSendInvite={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const row = screen.getByRole('row', { name: /Sam/ })
    expect(within(row).getByText('Alnwick')).toBeInTheDocument()
    expect(within(row).getByText('Amble')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('e.g. Sarah Johnson'), 'Alex Hill')
    await user.type(screen.getByPlaceholderText('07700 900123'), '07700900123')
    await user.type(screen.getByPlaceholderText('e.g. sarah@example.co.uk'), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: 'Alnwick' }))
    await user.click(screen.getByRole('button', { name: 'Amble' }))
    await user.click(screen.getByRole('button', { name: 'Add technician' }))
    expect(onCreateTechnician).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alex Hill', serviceAreaIds: ['a1', 'a2'] }),
    )

    await user.click(within(row).getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save technician' }))
    expect(onUpdateTechnician).toHaveBeenCalledWith('t1', expect.objectContaining({ serviceAreaIds: ['a1', 'a2'] }))
  })

  it('technician form: picks several areas and sends serviceAreaIds', async () => {
    server.use(on('get', '/settings/service-areas', () => HttpResponse.json(areas)))
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <TechnicianForm mode="add" onCancel={vi.fn()} onSave={onSave} onRemove={vi.fn()} />,
    )
    await user.type(screen.getByPlaceholderText('e.g. James Smith'), 'Alex')
    await user.type(screen.getByPlaceholderText('e.g. 07700 900000'), '07700900123')
    await user.type(screen.getByPlaceholderText('e.g. james@example.com'), 'alex@example.com')
    const trigger = await screen.findByRole('button', { name: 'Service areas' })
    await vi.waitFor(() => expect(trigger).toBeEnabled())
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /Alnwick/ }))
    await user.click(screen.getByRole('option', { name: /Amble/ }))
    await user.click(screen.getByRole('button', { name: 'Add Technician' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ serviceAreaIds: ['a1', 'a2'] }))
    const values = onSave.mock.calls[0]![0]
    expect(toCreateInput(values).serviceAreaIds).toEqual(['a1', 'a2'])
    expect(toUpdateInput(values).serviceAreaIds).toEqual(['a1', 'a2'])
  })

  it('technician form: edit starts from the technician’s areas', async () => {
    server.use(on('get', '/settings/service-areas', () => HttpResponse.json(areas)))
    const [record] = technicianListToUi([twoAreaTechnician])
    renderWithProviders(
      <TechnicianForm mode="edit" technician={record} onCancel={vi.fn()} onSave={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(await screen.findByText('Alnwick, Amble')).toBeInTheDocument()
  })
})
