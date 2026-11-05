import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, data, RouterProvider } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { routeErrorDetail } from '@/lib/route-error'

function Boom(): never {
  throw new Error('rows.map is not a function')
}

describe('routeErrorDetail', () => {
  it('describes responses and errors', () => {
    expect(routeErrorDetail(new Error('bad'))).toBe('bad')
    expect(routeErrorDetail(new Error(''))).toBeNull()
    expect(routeErrorDetail('nope')).toBeNull()
  })
})

describe('RouteError (GAP-024)', () => {
  it('shows the crash instead of a blank app, with a way out', async () => {
    const router = createMemoryRouter(
      [
        { path: '/reports', element: <Boom />, errorElement: <RouteError /> },
        { path: '/dashboard', element: <p>Dashboard home</p> },
      ],
      { initialEntries: ['/reports'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('alert')).toHaveTextContent('rows.map is not a function')
    await userEvent.click(screen.getByRole('button', { name: 'Go to dashboard' }))
    expect(await screen.findByText('Dashboard home')).toBeInTheDocument()
  })

  it('still renders for something that isn’t an Error', () => {
    function Throws(): never {
      throw 'just a string'
    }
    const router = createMemoryRouter([{ path: '/', element: <Throws />, errorElement: <RouteError /> }])
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('heading', { name: 'This page hit a problem' })).toBeInTheDocument()
    expect(screen.queryByText('just a string')).not.toBeInTheDocument()
  })

  it('describes a thrown 404 / 500 response and retries in place', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/missing',
          loader: () => {
            throw data(null, { status: 404 })
          },
          element: <p>never</p>,
          errorElement: <RouteError />,
        },
        {
          path: '/broken',
          loader: () => {
            throw data(null, { status: 500, statusText: 'Server Error' })
          },
          element: <p>never</p>,
          errorElement: <RouteError />,
        },
      ],
      { initialEntries: ['/missing'] },
    )
    render(<RouterProvider router={router} />)
    expect(await screen.findByText('This page doesn’t exist.')).toBeInTheDocument()
    await router.navigate('/broken')
    expect(await screen.findByText('500 Server Error')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('500 Server Error')).toBeInTheDocument()
  })
})
