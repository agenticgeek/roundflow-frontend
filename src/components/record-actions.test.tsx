import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { AddCustomerModal } from '@/components/customers/AddCustomerModal'
import { AddPropertyToCustomerModal } from '@/components/property-detail/AddPropertyToCustomerModal'
import { RemoveRecordModal } from '@/components/property-detail/RemoveRecordModal'
import { server } from '@/test/msw/server'
import { apiError, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'

function mockLookups(areas: unknown[] = [{ id: 'a1', name: 'Alnwick' }]) {
  server.use(
    on('get', '/settings/service-areas', () => HttpResponse.json(areas as never)),
    on('get', '/rounds', () => HttpResponse.json([{ id: 'r1', name: 'Alnwick Fri' }] as never)),
  )
}

describe('RemoveRecordModal', () => {
  const base = {
    propertyId: 'p1',
    customerId: 'c1',
    customerName: 'Jo Coates',
    address: '4 Hotspur St',
    outstandingBalance: '—',
    onClose: vi.fn(),
  }

  it('cancels a property after confirmation', async () => {
    let deleted = ''
    server.use(
      on('delete', '/properties/{id}', ({ params }) => {
        deleted = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const onRemoved = vi.fn()
    const { user } = renderWithProviders(<RemoveRecordModal {...base} kind="property" onRemoved={onRemoved} />)
    expect(screen.getByText(/4 Hotspur St will be cancelled/)).toBeInTheDocument()
    expect(screen.queryByText(/unpaid balance/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalled())
    expect(deleted).toBe('p1')
  })

  it('warns about an unpaid balance and cancels the customer', async () => {
    let deleted = ''
    server.use(
      on('delete', '/customers/{id}', ({ params }) => {
        deleted = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const onRemoved = vi.fn()
    const { user } = renderWithProviders(
      <RemoveRecordModal {...base} kind="customer" outstandingBalance="£120" onRemoved={onRemoved} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('unpaid balance of £120')
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }))
    await waitFor(() => expect(onRemoved).toHaveBeenCalled())
    expect(deleted).toBe('c1')
  })

  it('shows a failure toast and stays on the page', async () => {
    server.use(on('delete', '/properties/{id}', () => apiError(409, 'Cannot cancel')))
    const onRemoved = vi.fn()
    const { user } = renderWithProviders(<RemoveRecordModal {...base} kind="property" onRemoved={onRemoved} />)
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }))
    expect(await screen.findByText('Cannot cancel')).toBeInTheDocument()
    expect(onRemoved).not.toHaveBeenCalled()
  })

  it('renders nothing when no kind is chosen', () => {
    renderWithProviders(<RemoveRecordModal {...base} kind={null} onRemoved={vi.fn()} />)
    expect(screen.queryByText('Cancel this property?')).not.toBeInTheDocument()
  })
})

describe('AddCustomerModal', () => {
  async function fillProperty(user: ReturnType<typeof renderWithProviders>['user']) {
    await user.type(screen.getByLabelText(/Street address/), '4 Hotspur St')
    await user.type(screen.getByLabelText(/Postcode/), 'NE66 1AA')
    await user.click(await screen.findByRole('button', { name: 'Select a service area' }))
    await user.click(await screen.findByRole('option', { name: 'Alnwick' }))
    await user.type(screen.getByLabelText(/Price per visit/), '20')
  }

  it('validates, then creates the customer together with the first property', async () => {
    mockLookups()
    let body: unknown
    server.use(
      on('post', '/customers' as never, async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({ id: 'c9', propertyId: 'p9' })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(<AddCustomerModal open onClose={onClose} />)
    const save = () => user.click(screen.getByRole('button', { name: 'Add customer' }))
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the customer’s name.')

    await user.type(screen.getByLabelText(/Full name/), 'Jo Coates')
    await user.type(screen.getByLabelText('Phone'), '12ab')
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('valid phone')

    await user.clear(screen.getByLabelText('Phone'))
    await user.type(screen.getByLabelText('Email'), 'nope')
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('valid email')

    await user.clear(screen.getByLabelText('Email'))
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('property address')

    await fillProperty(user)
    await save()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(body).toMatchObject({
      name: 'Jo Coates',
      phone: null,
      email: null,
      paymentMethod: null,
      property: { addressLine: '4 Hotspur St', postcode: 'NE66 1AA', serviceAreaId: 'a1', price: 20, roundId: null },
    })
  })

  it('shows a server error inline', async () => {
    mockLookups()
    server.use(on('post', '/customers' as never, () => apiError(400, 'Name already used') as never))
    const { user } = renderWithProviders(<AddCustomerModal open onClose={vi.fn()} />)
    await user.type(screen.getByLabelText(/Full name/), 'Jo')
    await fillProperty(user)
    await user.click(screen.getByRole('button', { name: 'Add customer' }))
    expect(await screen.findByText('Name already used')).toBeInTheDocument()
  })

  it('blocks saving when there is no service area', async () => {
    mockLookups([])
    renderWithProviders(<AddCustomerModal open onClose={vi.fn()} />)
    expect(await screen.findByText(/Create a service area first/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add customer' })).toBeDisabled()
  })
})

describe('AddPropertyToCustomerModal', () => {
  it('validates each field then adds the property', async () => {
    mockLookups()
    let body: unknown
    server.use(
      on('post', '/customers/{id}/properties' as never, async ({ request }: { request: Request }) => {
        body = await request.json()
        return HttpResponse.json({ propertyId: 'p2' })
      }),
    )
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <AddPropertyToCustomerModal open customerId="c1" customerName="Jo" onClose={onClose} />,
    )
    const save = () => user.click(screen.getByRole('button', { name: 'Add property' }))
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('property address')
    await user.type(screen.getByLabelText(/Street address/), '4 Hotspur St')
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a postcode')
    await user.type(screen.getByLabelText(/Postcode/), 'xx')
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('valid UK postcode')
    await user.clear(screen.getByLabelText(/Postcode/))
    await user.type(screen.getByLabelText(/Postcode/), 'NE66 1AA')
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('select a service area')

    await user.click(await screen.findByRole('button', { name: 'Select a service area' }))
    await user.click(await screen.findByRole('option', { name: 'Alnwick' }))
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('price above')

    await user.type(screen.getByLabelText(/Price per visit/), '20')
    await save()
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(body).toMatchObject({ addressLine: '4 Hotspur St', postcode: 'NE66 1AA', serviceAreaId: 'a1', price: 20, roundId: null })
  })

  it('blocks saving and says to create a service area first', async () => {
    mockLookups([])
    renderWithProviders(<AddPropertyToCustomerModal open customerId="c1" customerName="Jo" onClose={vi.fn()} />)
    expect(await screen.findByText(/Create a service area first/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add property' })).toBeDisabled()
  })
})
