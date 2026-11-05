import type { ReactNode } from 'react'

/** What `useAppBootstrap()` returns in tests — an admin on a finished setup by default. */
export type TestBootstrap = {
  setupStatus: undefined
  me: undefined
  role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | undefined
  isTechnician: boolean
  canMutate: boolean
  setupCompleted: boolean
  ready: boolean
  gateBypassed: boolean
}

const defaults: TestBootstrap = {
  setupStatus: undefined,
  me: undefined,
  role: 'ADMIN',
  isTechnician: false,
  canMutate: true,
  setupCompleted: true,
  ready: true,
  gateBypassed: false,
}

let current: TestBootstrap = { ...defaults }

/** Override the bootstrap for the current test (reset after each test in setup.ts). */
export function setBootstrap(overrides: Partial<TestBootstrap>) {
  current = { ...current, ...overrides }
}

export function resetBootstrap() {
  current = { ...defaults }
}

/** Replacement module for `@/providers/AppBootstrapProvider`, installed in setup.ts. */
export const appBootstrapModule = {
  AppBootstrapProvider: ({ children }: { children: ReactNode }) => children,
  useAppBootstrap: () => current,
}
