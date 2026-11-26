import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { SettingsScreen } from '@/components/settings/SettingsScreen'
import { setBootstrap } from '@/test/bootstrap'
import { server } from '@/test/msw/server'
import { on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

type Area = { id: string; name: string; postcodeSector: string | null; linkedRounds: { count: number; names: string[] } }

function serveAreas(initial: Area[]) {
  let areas = initial
  const patches: { id: string; body: Record<string, unknown> }[] = []
  let gets = 0
  let respond: ((id: string) => Response | undefined | Promise<Response>) | undefined
  server.use(
    on('get', '/settings/service-areas' as never, () => {
      gets += 1
      return HttpResponse.json(areas)
    }),
    on('patch', '/settings/service-areas/{id}' as never, async ({ params, request }) => {
      const id = String(params.id)
      const body = (await request.json()) as Record<string, unknown>
      patches.push({ id, body })
      const override = await respond?.(id)
      if (override) return override
      areas = areas.map((area) => (area.id === id ? { ...area, ...body } as Area : area))
      return HttpResponse.json(areas.find((area) => area.id === id))
    }),
  )
  return {
    patches,
    gets: () => gets,
    setAreas: (next: Area[]) => { areas = next },
    respondWith: (fn: (id: string) => Response | undefined | Promise<Response>) => { respond = fn },
  }
}

const alnwick: Area = { id: 'a1', name: 'Alnwick', postcodeSector: 'NE66,NE67', linkedRounds: { count: 1, names: ['Monday'] } }
const amble: Area = { id: 'a2', name: 'Amble', postcodeSector: 'NE65', linkedRounds: { count: 0, names: [] } }

async function openServiceAreas() {
  const rendered = renderWithProviders(<SettingsScreen />, { route: '/settings' })
  await rendered.user.click(await screen.findByRole('button', { name: 'Service Areas' }))
  await screen.findByRole('heading', { name: 'Alnwick' })
  return rendered
}

describe('Settings > Service Areas: edit an area', { timeout: 30_000 }, () => {
  it('has no edit button when the user cannot change settings', async () => {
    setBootstrap({ canMutate: false })
    serveAreas([alnwick, amble])
    await openServiceAreas()
    expect(screen.queryByRole('button', { name: 'Edit area' })).not.toBeInTheDocument()
  })

  it('prefills the name and sectors, and only one area is edited at a time', async () => {
    serveAreas([alnwick, amble])
    const { user } = await openServiceAreas()
    const [editAlnwick, editAmble] = screen.getAllByRole('button', { name: 'Edit area' })

    await user.click(editAlnwick!)
    expect(screen.getByRole('textbox', { name: 'Area Name' })).toHaveValue('Alnwick')
    expect(screen.getByRole('textbox', { name: 'Postcode Sectors' })).toHaveValue('NE66, NE67')

    await user.click(editAmble!)
    expect(screen.getAllByRole('textbox', { name: 'Area Name' })).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Area Name' })).toHaveValue('Amble')
    expect(screen.getByRole('textbox', { name: 'Postcode Sectors' })).toHaveValue('NE65')
    // The area not being edited is shown as normal.
    expect(screen.getByRole('heading', { name: 'Alnwick' })).toBeInTheDocument()
  })

  it('blocks saving a blank name, no sectors or an invalid sector', async () => {
    const api = serveAreas([alnwick])
    const { user } = await openServiceAreas()
    await user.click(screen.getByRole('button', { name: 'Edit area' }))
    const name = screen.getByRole('textbox', { name: 'Area Name' })
    const sectors = screen.getByRole('textbox', { name: 'Postcode Sectors' })
    const save = screen.getByRole('button', { name: 'Save' })

    await user.clear(name)
    await user.type(name, '   ')
    await user.click(save)
    expect(screen.getByText('Area name is required.')).toBeInTheDocument()

    await user.type(name, 'Alnwick North')
    await user.clear(sectors)
    await user.type(sectors, ' , ;')
    await user.click(save)
    expect(screen.getByText('At least one postcode sector is required.')).toBeInTheDocument()

    await user.clear(sectors)
    await user.type(sectors, 'NE66, not-a-sector')
    await user.click(save)
    expect(screen.getByText('Enter valid UK postcode sectors, comma-separated (e.g. NE66, NE67).')).toBeInTheDocument()

    expect(api.patches).toEqual([])
  })

  it('saves the trimmed name and normalised sectors, then shows a toast', async () => {
    const api = serveAreas([alnwick, amble])
    const { user } = await openServiceAreas()
    await user.click(screen.getAllByRole('button', { name: 'Edit area' })[0]!)
    const name = screen.getByRole('textbox', { name: 'Area Name' })
    const sectors = screen.getByRole('textbox', { name: 'Postcode Sectors' })

    await user.clear(name)
    await user.type(name, '  Alnwick North  ')
    await user.clear(sectors)
    await user.type(sectors, ' ne66 ;ne68, , NE69 ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Service area updated')).toBeInTheDocument()
    expect(api.patches).toEqual([{ id: 'a1', body: { name: 'Alnwick North', postcodeSector: 'NE66,NE68,NE69' } }])
    expect(screen.queryByRole('textbox', { name: 'Area Name' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Alnwick North' })).toBeInTheDocument()
    expect(screen.getByText('NE68')).toBeInTheDocument()
  })

  it('cancel discards the changes and restores the original values', async () => {
    const api = serveAreas([alnwick])
    const { user } = await openServiceAreas()
    await user.click(screen.getByRole('button', { name: 'Edit area' }))
    await user.type(screen.getByRole('textbox', { name: 'Area Name' }), ' changed')
    await user.type(screen.getByRole('textbox', { name: 'Postcode Sectors' }), ', bad')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox', { name: 'Area Name' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Alnwick' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit area' }))
    expect(screen.getByRole('textbox', { name: 'Area Name' })).toHaveValue('Alnwick')
    expect(screen.getByRole('textbox', { name: 'Postcode Sectors' })).toHaveValue('NE66, NE67')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(api.patches).toEqual([])
  })

  it('shows an API error inline and keeps the editor open', async () => {
    const api = serveAreas([alnwick])
    let release!: () => void
    const held = new Promise<void>((resolve) => { release = resolve })
    api.respondWith(async () => {
      await held
      return HttpResponse.json({ error: 'name must be 120 characters or fewer' }, { status: 400 })
    })
    const { user } = await openServiceAreas()
    await user.click(screen.getByRole('button', { name: 'Edit area' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // While saving, the button says so and cannot be pressed again.
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    release()

    expect(await screen.findByRole('alert')).toHaveTextContent('name must be 120 characters or fewer')
    expect(screen.getByRole('textbox', { name: 'Area Name' })).toHaveValue('Alnwick')
    expect(api.patches).toEqual([{ id: 'a1', body: { name: 'Alnwick', postcodeSector: 'NE66,NE67' } }])
  })

  it('the add form shares the same validation and normalisation', async () => {
    serveAreas([alnwick])
    let created: Record<string, unknown> | undefined
    server.use(
      on('post', '/settings/service-areas' as never, async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'a3', ...created }, { status: 201 })
      }),
    )
    const { user } = await openServiceAreas()
    await user.click(screen.getByRole('button', { name: 'Add Area' }))
    const form = screen.getByRole('heading', { name: 'Add New Area' }).parentElement!
    const [name, sectors] = within(form).getAllByRole('textbox')
    await user.click(within(form).getByRole('button', { name: 'Add Area' }))
    expect(screen.getByText('Area name is required.')).toBeInTheDocument()

    await user.type(name!, '  Rothbury ')
    await user.type(sectors!, 'ne65 ; ne61')
    await user.click(within(form).getByRole('button', { name: 'Add Area' }))
    expect(await screen.findByText('Service area added')).toBeInTheDocument()
    expect(created).toEqual({ name: 'Rothbury', postcodeSector: 'NE65,NE61', isDefault: false })
  })

  it('an area removed elsewhere (404) closes the editor, says so and refreshes the list', async () => {
    const api = serveAreas([alnwick, amble])
    api.respondWith((id) => (id === 'a2' ? HttpResponse.json({ error: 'Service area not found' }, { status: 404 }) : undefined))
    const { user } = await openServiceAreas()
    const getsBefore = api.gets()
    api.setAreas([alnwick])

    await user.click(screen.getAllByRole('button', { name: 'Edit area' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('This service area no longer exists.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Area Name' })).not.toBeInTheDocument()
    await waitFor(() => expect(api.gets()).toBeGreaterThan(getsBefore))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Amble' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Alnwick' })).toBeInTheDocument()
  })
})
