import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup, configure } from '@testing-library/react'
import { server } from '@/test/msw/server'
import { useUiStore } from '@/stores/ui.store'
import { resetBootstrap } from '@/test/bootstrap'

// Async queries (findBy, waitFor) wait up to 5 s: coverage runs make the whole suite slow enough that the
// 1 s default produced one-off failures in unrelated, correct tests.
configure({ asyncUtilTimeout: 5000 })

// No real Supabase in tests: a fixed bearer token, and an inert auth client.
vi.mock('@/lib/supabase', () => ({
  getCachedAccessToken: () => 'test-token',
  refreshAccessToken: async () => 'test-token',
  setRememberSession: vi.fn(),
  supabase: {
    auth: {
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

// Screens read role/setup from the bootstrap context; tests drive it with setBootstrap().
vi.mock('@/providers/AppBootstrapProvider', async () => (await import('@/test/bootstrap')).appBootstrapModule)

// jsdom has no ResizeObserver (dropdown menus measure themselves).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
// …nor layout: scrolling is a no-op.
Element.prototype.scrollIntoView ??= () => {}
window.scrollTo = () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  sessionStorage.clear()
  useUiStore.setState({ modal: null, toasts: [] })
  resetBootstrap()
})

afterAll(() => server.close())
