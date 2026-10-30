import { describe, expect, it, vi } from 'vitest'
import { createRoundThenAssign } from '@/features/rounds/lib/create-round'

describe('createRoundThenAssign', () => {
  it('creates and assigns', async () => {
    const assign = vi.fn().mockResolvedValue(undefined)
    const rollback = vi.fn()
    await expect(
      createRoundThenAssign({ create: async () => ({ id: 'r1' }), assign, rollback }),
    ).resolves.toEqual({ id: 'r1' })
    expect(assign).toHaveBeenCalledWith('r1')
    expect(rollback).not.toHaveBeenCalled()
  })

  it('skips assignment without a technician or a round id', async () => {
    const rollback = vi.fn()
    await expect(createRoundThenAssign({ create: async () => ({ id: 'r1' }), rollback })).resolves.toEqual({ id: 'r1' })
    const assign = vi.fn()
    await expect(createRoundThenAssign({ create: async () => ({}), assign, rollback })).resolves.toEqual({})
    expect(assign).not.toHaveBeenCalled()
  })

  it('rolls the round back and rethrows when assignment fails', async () => {
    const failure = new Error('Cannot assign technician(s) with a pending invite: Sam')
    const rollback = vi.fn().mockResolvedValue(undefined)
    await expect(
      createRoundThenAssign({
        create: async () => ({ id: 'r1' }),
        assign: () => Promise.reject(failure),
        rollback,
      }),
    ).rejects.toBe(failure)
    expect(rollback).toHaveBeenCalledWith('r1')
  })

  it('still surfaces the assignment error when the rollback fails too', async () => {
    const failure = new Error('pending invite')
    await expect(
      createRoundThenAssign({
        create: async () => ({ id: 'r1' }),
        assign: () => Promise.reject(failure),
        rollback: () => Promise.reject(new Error('archive failed')),
      }),
    ).rejects.toBe(failure)
  })
})
