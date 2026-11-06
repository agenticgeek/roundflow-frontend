import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

describe('Settings destructive actions ask first (WEB-02)', { timeout: 30_000 }, () => {
  it('delete service area: cancel keeps it, errors stay in the dialog, confirm deletes with a toast', async () => {
    let areas = [
      { id: 'a1', name: 'Alnwick', postcodeSector: 'NE66', linkedRounds: { count: 0, names: [] } },
      { id: 'a2', name: 'Amble', postcodeSector: 'NE65', linkedRounds: { count: 0, names: [] } },
    ]
    let fail = true
    const deleted: string[] = []
    server.use(
      on('get', '/settings/service-areas' as never, () => HttpResponse.json(areas)),
      on('delete', '/settings/service-areas/{id}' as never, ({ params }) => {
        if (params.id === 'a2') return HttpResponse.json({ error: 'Gone' }, { status: 404 })
        if (fail) return HttpResponse.json({ error: 'Cannot delete right now' }, { status: 409 })
        deleted.push(String(params.id))
        areas = areas.filter((area) => area.id !== params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(await screen.findByRole('button', { name: 'Service Areas' }))
    const [deleteAlnwick, deleteAmble] = await screen.findAllByRole('button', { name: 'Delete area' })

    await user.click(deleteAlnwick!)
    let dialog = screen.getByRole('alertdialog', { name: 'Delete this service area?' })
    expect(dialog).toHaveAccessibleDescription('“Alnwick” will be removed. This can’t be undone.')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(deleted).toEqual([])
    expect(deleteAlnwick).toHaveFocus()

    await user.click(deleteAlnwick!)
    dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete area' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Cannot delete right now')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    fail = false
    await user.click(deleteAlnwick!)
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete area' }))
    expect(await screen.findByText('Service area deleted.')).toBeInTheDocument()
    expect(deleted).toEqual(['a1'])

    // The area was already removed elsewhere: say so and close.
    await user.click(deleteAmble!)
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete area' }))
    expect(await screen.findByText('This service area no longer exists.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('technician: deactivate (joined) and delete (not joined) confirm first, and report failures', async () => {
    const calls: string[] = []
    let failDeactivate = true
    server.use(
      on('get', '/settings/technicians' as never, () =>
        HttpResponse.json([
          { id: 't1', name: 'Sam Joined', phone: '07700900001', role: 'TECHNICIAN', profileId: 'p1', active: true, appStatus: 'ACTIVE' },
          { id: 't2', name: 'Pat Pending', phone: '07700900002', role: 'TECHNICIAN', profileId: null, active: true, appStatus: 'PENDING_INVITE' },
        ]),
      ),
      on('patch', '/settings/technicians/{id}' as never, ({ params }) => {
        if (failDeactivate) return HttpResponse.json({ error: 'Technician has live visits' }, { status: 409 })
        calls.push(`patch ${String(params.id)}`)
        return HttpResponse.json({ id: params.id })
      }),
      on('delete', '/settings/technicians/{id}' as never, ({ params }) => {
        calls.push(`delete ${String(params.id)}`)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(await screen.findByRole('button', { name: 'Technician Mgmt' }))
    const menus = await screen.findAllByRole('button', { name: 'More options' })

    await user.click(menus[0]!)
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))
    let dialog = screen.getByRole('alertdialog', { name: 'Deactivate this technician?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(calls).toEqual([])

    await user.click(menus[0]!)
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))
    dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Technician has live visits')

    failDeactivate = false
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Technician deactivated.')).toBeInTheDocument()
    expect(calls).toEqual(['patch t1'])

    await user.click(menus[1]!)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    dialog = screen.getByRole('alertdialog', { name: 'Delete this technician?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete technician' }))
    expect(await screen.findByText('Technician deleted.')).toBeInTheDocument()
    expect(calls).toEqual(['patch t1', 'delete t2'])
  })

  it('technician: a non-API failure falls back to the generic message', async () => {
    server.use(
      on('get', '/settings/technicians' as never, () =>
        HttpResponse.json([{ id: 't2', name: 'Pat Pending', phone: '07700900002', role: 'TECHNICIAN', profileId: null, active: true, appStatus: 'PENDING_INVITE' }]),
      ),
      on('delete', '/settings/technicians/{id}' as never, () => HttpResponse.error()),
    )
    const { user } = renderWithProviders(<SettingsScreen />, { route: '/settings' })
    await user.click(await screen.findByRole('button', { name: 'Technician Mgmt' }))
    await user.click(await screen.findByRole('button', { name: 'More options' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete technician' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete technician.')
  })
})
