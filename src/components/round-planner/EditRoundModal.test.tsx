import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { server } from '@/test/msw/server'
import { API, apiError } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'
import { setBootstrap } from '@/test/bootstrap'
import { EditRoundModal } from '@/components/round-planner/EditRoundModal'

const round = {
  id: 'r1',
  name: 'Alnwick Fri',
  frequency: 'SIX_WEEKLY',
  defaultDay: 'FRI',
  description: 'Back lanes first',
  status: 'ACTIVE',
  serviceAreaId: 'a1',
  serviceAreaName: 'Alnwick',
  technicians: [],
  propertyCount: 4,
  postcodeSectors: ['NE66 1'],
}

const areas = [
  { id: 'a1', name: 'Alnwick', postcodeSector: 'NE66 1,NE66 2' },
  { id: 'a2', name: 'Amble', postcodeSector: 'NE65 0' },
]

let patches: { id: string; body: unknown }[] = []

beforeEach(() => {
  patches = []
  server.use(
    http.get(`${API}/rounds/r1`, () => HttpResponse.json(round)),
    http.get(`${API}/rounds`, () =>
      HttpResponse.json([
        { id: 'r1', name: 'Alnwick Fri', status: 'ACTIVE' },
        { id: 'r2', name: 'Amble Mon', status: 'ACTIVE' },
      ]),
    ),
    http.get(`${API}/settings/service-areas`, () => HttpResponse.json(areas)),
    http.patch(`${API}/rounds/:id`, async ({ params, request }) => {
      const body = await request.json()
      patches.push({ id: String(params.id), body })
      return HttpResponse.json({ ...round, ...(body as object) })
    }),
  )
})

function renderModal(onClose = vi.fn()) {
  return { onClose, ...renderWithProviders(<EditRoundModal roundId="r1" onClose={onClose} />) }
}

describe('Edit round', () => {
  it('prefills every field from the round', async () => {
    renderModal()
    expect(await screen.findByDisplayValue('Alnwick Fri')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fri' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Every 6 weeks' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByDisplayValue('Back lanes first')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Alnwick' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'NE66 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'NE66 2' })).toHaveAttribute('aria-pressed', 'false')
    // Nothing changed yet.
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('saves only the changed fields with PATCH and closes', async () => {
    const { user, onClose } = renderModal()
    const name = await screen.findByDisplayValue('Alnwick Fri')
    await user.clear(name)
    await user.type(name, '  Alnwick Thu ')
    await user.click(screen.getByRole('button', { name: 'Thu' }))
    await user.click(screen.getByRole('button', { name: 'Every 8 weeks' }))
    await user.clear(screen.getByDisplayValue('Back lanes first'))
    await user.click(await screen.findByRole('button', { name: 'NE66 2' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(patches).toEqual([
      {
        id: 'r1',
        body: {
          name: 'Alnwick Thu',
          defaultDay: 'THU',
          frequency: 'EIGHT_WEEKLY',
          description: null,
          postcodeSectors: ['NE66 1', 'NE66 2'],
        },
      },
    ])
    expect(await screen.findByText('Round updated')).toBeInTheDocument()
  })

  it('moving to another area clears the old area’s sectors', async () => {
    const { user, onClose } = renderModal()
    await user.click(await screen.findByRole('button', { name: 'Amble' }))
    expect(screen.queryByRole('button', { name: 'NE66 1' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'NE65 0' }))
    await user.click(screen.getByRole('button', { name: 'NE65 0' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(patches[0]?.body).toEqual({ serviceAreaId: 'a2', postcodeSectors: [] })
  })

  it('says when an area has no sectors', async () => {
    server.use(
      http.get(`${API}/settings/service-areas`, () =>
        HttpResponse.json([...areas, { id: 'a3', name: 'Rothbury', postcodeSector: null }]),
      ),
    )
    const { user } = renderModal()
    await user.click(await screen.findByRole('button', { name: 'Rothbury' }))
    expect(screen.getByText('This area has no postcode sectors.')).toBeInTheDocument()
  })

  it('keeps a saved sector the area no longer lists, so it can be removed', async () => {
    server.use(http.get(`${API}/rounds/r1`, () => HttpResponse.json({ ...round, postcodeSectors: ['NE66 9'] })))
    const { user, onClose } = renderModal()
    await user.click(await screen.findByRole('button', { name: 'NE66 9' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(patches[0]?.body).toEqual({ postcodeSectors: [] })
  })

  it('validates the name, day and frequency before saving', async () => {
    server.use(
      http.get(`${API}/rounds/r1`, () =>
        HttpResponse.json({ ...round, defaultDay: null, frequency: null, serviceAreaId: null, postcodeSectors: undefined }),
      ),
    )
    const { user, onClose } = renderModal()
    const name = await screen.findByDisplayValue('Alnwick Fri')
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a round name.')

    await user.type(name, 'amble mon')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Another round is already called “amble mon”.')

    await user.clear(name)
    await user.type(name, 'Alnwick North')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a day.')

    await user.click(screen.getByRole('button', { name: 'Mon' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a frequency.')

    await user.click(screen.getByRole('button', { name: /Every 4 weeks/ }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a service area.')
    expect(patches).toEqual([])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('asks for a day when the round has none', async () => {
    server.use(http.get(`${API}/rounds/r1`, () => HttpResponse.json({ ...round, defaultDay: null })))
    const { user } = renderModal()
    await user.type(await screen.findByDisplayValue('Alnwick Fri'), 'x')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a day.')
  })

  it('cancel closes without saving', async () => {
    const { user, onClose } = renderModal()
    await user.type(await screen.findByDisplayValue('Alnwick Fri'), ' x')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
    expect(patches).toEqual([])
  })

  it('shows a server error and stays open', async () => {
    server.use(http.patch(`${API}/rounds/:id`, () => apiError(400, 'Sector NE66 2 is not in this service area')))
    const { user, onClose } = renderModal()
    await user.click(await screen.findByRole('button', { name: 'NE66 2' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sector NE66 2 is not in this service area')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes with a notice when the round was deleted meanwhile', async () => {
    server.use(http.patch(`${API}/rounds/:id`, () => apiError(404, 'Round not found')))
    const { user, onClose } = renderModal()
    await user.type(await screen.findByDisplayValue('Alnwick Fri'), ' x')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(await screen.findByText('This round no longer exists.')).toBeInTheDocument()
  })

  it('shows a load error', async () => {
    server.use(http.get(`${API}/rounds/r1`, () => apiError(500, 'Boom')))
    renderModal()
    expect(await screen.findByText(/Could not load this round/)).toBeInTheDocument()
  })

  it('can’t save without permission', async () => {
    setBootstrap({ canMutate: false })
    const { user } = renderModal()
    await user.type(await screen.findByDisplayValue('Alnwick Fri'), ' x')
    expect(screen.getByText('You don’t have permission to edit rounds.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('renders nothing when no round is picked', () => {
    renderWithProviders(<EditRoundModal roundId={null} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
