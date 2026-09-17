/**
 * Client-side geocode cache — the same properties recur on every occurrence
 * (Round Planner handoff §8: "geocode client-side and cache aggressively").
 * Persisted to localStorage so a reload doesn't re-spend Geocoding API quota.
 */

export interface GeocodedPoint {
  lat: number
  lng: number
}

const STORAGE_KEY = 'rf-geocode-cache-v1'
/** Failed lookups are cached too, but expire sooner — the address may get fixed. */
const FAILURE_TTL_MS = 24 * 60 * 60 * 1000
const SUCCESS_TTL_MS = 30 * 24 * 60 * 60 * 1000

type CacheEntry = { point: GeocodedPoint | null; cachedAt: number }
type CacheShape = Record<string, CacheEntry>

let memoryCache: CacheShape | null = null

function readStore(): CacheShape {
  if (memoryCache) return memoryCache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    memoryCache = raw ? (JSON.parse(raw) as CacheShape) : {}
  } catch {
    memoryCache = {}
  }
  return memoryCache
}

function writeStore(store: CacheShape) {
  memoryCache = store
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage full or unavailable (private browsing) — cache stays memory-only for this tab.
  }
}

/** Normalize so "12 Market Street" / "NE66 1SS" always hits the same cache entry. */
export function geocodeCacheKey(addressLine: string, postcode: string): string {
  return `${addressLine.trim()}, ${postcode.trim()}, UK`.toLowerCase().replace(/\s+/g, ' ')
}

export function getCachedGeocode(key: string): GeocodedPoint | null | undefined {
  const entry = readStore()[key]
  if (!entry) return undefined
  const ttl = entry.point ? SUCCESS_TTL_MS : FAILURE_TTL_MS
  if (Date.now() - entry.cachedAt > ttl) return undefined
  return entry.point
}

export function setCachedGeocode(key: string, point: GeocodedPoint | null) {
  const store = readStore()
  writeStore({ ...store, [key]: { point, cachedAt: Date.now() } })
}
