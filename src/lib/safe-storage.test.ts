import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStored, writeStored } from '@/lib/safe-storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('safe storage', () => {
  it('reads and writes', () => {
    expect(readStored('k')).toBeNull()
    expect(writeStored('k', 'v')).toBe(true)
    expect(readStored('k')).toBe('v')
  })

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStored('k')).toBeNull()
    expect(writeStored('k', 'v')).toBe(false)
  })
})
