import { readStored, writeStored } from '@/lib/safe-storage'

/** Badges dismissed this session: keeps working when storage is blocked and shares state between sidebars. */
const dismissedInMemory = new Set<string>()

const keyFor = (itemId: string, userId?: string) => `roundflow.nav-badge.${userId ?? 'anon'}.${itemId}`

/** Has this user dismissed the NEW badge on that nav item? */
export function isNavBadgeDismissed(itemId: string, userId?: string): boolean {
  const key = keyFor(itemId, userId)
  return dismissedInMemory.has(key) || readStored(key) === '1'
}

/** Dismiss it for this user, in this browser. */
export function dismissNavBadge(itemId: string, userId?: string): void {
  const key = keyFor(itemId, userId)
  dismissedInMemory.add(key)
  writeStored(key, '1')
}

/** Test seam: forget what was dismissed this session. */
export function resetNavBadgeSession(): void {
  dismissedInMemory.clear()
}
