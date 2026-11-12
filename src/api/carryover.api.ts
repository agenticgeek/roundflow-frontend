import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

type Schemas = components['schemas']

export type CarryoverOption = Schemas['CarryoverOption']
export type CarryoverTargetKey = CarryoverOption['key']
export type CarryoverOptions = Schemas['CarryoverOptions']
export type CarryoverInput = Omit<Schemas['CarryoverInput'], 'notifyCustomers' | 'dryRun'> & {
  notifyCustomers?: boolean
  dryRun?: boolean
}
export type CarryoverConflict = Schemas['CarryoverResult']['conflicts'][number]
export type CarryoverResult = Schemas['CarryoverResult']

export const carryoverApi = {
  options: (date: string, signal?: AbortSignal) =>
    api<CarryoverOptions>(`/visits/carryover/options?date=${encodeURIComponent(date)}`, { signal }),

  carryover: (input: CarryoverInput, signal?: AbortSignal) =>
    api<CarryoverResult>('/visits/carryover', { method: 'POST', body: JSON.stringify(input), signal }),
}
