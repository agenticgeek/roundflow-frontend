import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { HttpResponse } from 'msw'
import { PropertyDetailScreen } from '@/components/property-detail/PropertyDetailScreen'
import { customerDetailToPropertyRecord } from '@/features/customers/lib/mappers'
import { useCreateProperty, useUpdateProperty } from '@/features/properties/hooks/useProperties'
import { customerDetailFixture } from '@/test/fixtures'
import { server } from '@/test/msw/server'
import { API, on } from '@/test/msw/typed'
import { renderWithProviders } from '@/test/render'
import { http } from 'msw'
import { renderHook } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/toast'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/render'
import { useUiStore } from '@/stores/ui.store'

function recordWith(property: Record<string, unknown>) {
  const base = customerDetailFixture()
  return customerDetailToPropertyRecord(customerDetailFixture({ property: { ...base.property, ...property } as never }))!
}

describe('property location (ACT-10)', () => {
  it('maps the location fields and shows the approximate note on the property page', () => {
    const record = recordWith({ latitude: 55, locationApproximate: true })
    expect(record).toMatchObject({ latitude: 55, locationApproximate: true })
    expect(recordWith({ latitude: 55 }).locationApproximate).toBeUndefined()
    server.use(on('get', '/settings/payment', () => HttpResponse.json({ stripeConnected: false, gocardlessConnected: false })))
    renderWithProviders(<PropertyDetailScreen property={record} customerId="c1" onBack={vi.fn()} />)
    expect(screen.getByText('Approximate location')).toBeInTheDocument()
  })

  it('shows "Location not found" when the address could not be placed', () => {
    server.use(on('get', '/settings/payment', () => HttpResponse.json({ stripeConnected: false, gocardlessConnected: false })))
    renderWithProviders(<PropertyDetailScreen property={recordWith({ latitude: null })} customerId="c1" onBack={vi.fn()} />)
    expect(screen.getByText('Location not found')).toBeInTheDocument()
  })

  it('toasts when a created or updated property has no coordinates', async () => {
    useUiStore.setState({ toasts: [] })
    server.use(
      http.post(`${API}/properties`, () => HttpResponse.json({ propertyId: 'p1', latitude: null })),
      http.patch(`${API}/properties/p1`, () => HttpResponse.json({ id: 'p1', latitude: null })),
    )
    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={createTestQueryClient()}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      )
    }
    const create = renderHook(() => useCreateProperty(), { wrapper })
    await create.result.current.mutateAsync({} as never)
    await waitFor(() => expect(useUiStore.getState().toasts).toHaveLength(1))
    const update = renderHook(() => useUpdateProperty(), { wrapper })
    await update.result.current.mutateAsync({ id: 'p1', input: {} as never })
    await waitFor(() => expect(useUiStore.getState().toasts).toHaveLength(2))
    expect(useUiStore.getState().toasts[0].message).toBe('Saved, but there is no map location yet')
  })
})
