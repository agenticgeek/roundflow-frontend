import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  key: undefined as string | undefined,
  importLibrary: vi.fn(async (_name: string) => ({})),
  setOptions: vi.fn(),
}))

vi.mock('@googlemaps/js-api-loader', () => ({ importLibrary: mocks.importLibrary, setOptions: mocks.setOptions }))
vi.mock('@/lib/env', () => ({ googleMapsApiKey: () => mocks.key }))

beforeEach(() => {
  vi.resetModules()
  mocks.importLibrary.mockClear()
  mocks.setOptions.mockClear()
  ;(window as unknown as { google: unknown }).google = { maps: { Map: class {} } }
})

describe('loadGoogleMaps (WEB-10)', () => {
  it('rejects when no key is configured', async () => {
    mocks.key = undefined
    const { loadGoogleMaps } = await import('@/lib/google-maps')
    await expect(loadGoogleMaps()).rejects.toThrow('VITE_GOOGLE_MAPS_API_KEY is not configured.')
  })

  it('loads the maps and marker libraries once, and never the unused geocoding library', async () => {
    mocks.key = 'key-123'
    const { loadGoogleMaps } = await import('@/lib/google-maps')
    const first = loadGoogleMaps()
    const second = loadGoogleMaps()
    expect(second).toBe(first)
    await expect(first).resolves.toHaveProperty('maps')
    expect(mocks.setOptions).toHaveBeenCalledTimes(1)
    expect((mocks.importLibrary.mock.calls as unknown as string[][]).map((call) => call[0])).toEqual(['maps', 'marker'])
  })
})
