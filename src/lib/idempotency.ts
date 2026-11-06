/**
 * `Idempotency-Key` for admin writes (Wave 2B-1): one key per user action, reused for any retry of that
 * same action, so the server runs it once and replays the stored result.
 */

const keysByAction = new WeakMap<object, string>()

/** A random v4 UUID; works in insecure (plain http) contexts where `crypto.randomUUID` is missing. */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * The key for one user action, identified by its input object: calling again with the same object (a
 * mutation retried after a network failure re-runs with the same variables) returns the same key; a new
 * object, even with equal content, is a new action and gets a new key. Non-objects are never remembered.
 */
export function idempotencyKeyFor(action: unknown): string {
  if (typeof action !== 'object' || action === null) return newIdempotencyKey()
  let key = keysByAction.get(action)
  if (!key) {
    key = newIdempotencyKey()
    keysByAction.set(action, key)
  }
  return key
}
