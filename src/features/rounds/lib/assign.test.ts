import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/errors'
import { assignFailureMessage, isPendingInvite } from '@/features/rounds/lib/assign'

describe('assignFailureMessage', () => {
  it('is null when every round saved', () => {
    expect(assignFailureMessage([{ status: 'fulfilled', value: 1 }], ['Round A'])).toBeNull()
  })

  it('names the failed rounds and shows the server error once', () => {
    const error = new ApiError(400, 'Cannot assign technician(s) with a pending invite: Sam')
    expect(
      assignFailureMessage(
        [
          { status: 'rejected', reason: error },
          { status: 'fulfilled', value: 1 },
          { status: 'rejected', reason: error },
        ],
        ['Round A', 'Round B', 'Round C'],
      ),
    ).toBe('Round A, Round C: Cannot assign technician(s) with a pending invite: Sam')
  })

  it('joins distinct errors and tolerates a missing round name', () => {
    expect(
      assignFailureMessage(
        [
          { status: 'rejected', reason: new Error('One') },
          { status: 'rejected', reason: new Error('Two') },
        ],
        ['Round A'],
      ),
    ).toBe('Round A, : One · Two')
  })
})

describe('isPendingInvite', () => {
  it('matches API and settings-row spellings', () => {
    expect(isPendingInvite({ appStatus: 'PENDING_INVITE' })).toBe(true)
    expect(isPendingInvite({ appStatus: 'pending' })).toBe(true)
    expect(isPendingInvite({ appStatus: 'ACTIVE' })).toBe(false)
    expect(isPendingInvite({})).toBe(false)
  })
})
