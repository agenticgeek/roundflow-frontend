/** `localStorage` read that never throws (blocked storage, private windows); `null` when unavailable. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** `localStorage` write that never throws; returns whether it was stored. */
export function writeStored(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
