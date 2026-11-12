import { vi } from 'vitest'

type Listener = () => void

/** What the fake records, so tests can assert on the pins, the info window and the zoom. */
export interface FakeGoogle {
  maps: FakeMap[]
  pins: FakePin[]
  infoWindows: FakeInfoWindow[]
  idleListeners: Listener[]
  restore: () => void
}

export interface FakeMap {
  options: Record<string, unknown>
  center?: unknown
  zoom?: number
  fitBounds: ReturnType<typeof vi.fn>
  setCenter: (center: unknown) => void
  setZoom: (zoom: number) => void
  getZoom: () => number | undefined
  panTo: ReturnType<typeof vi.fn>
}

export interface FakePin {
  kind: 'advanced' | 'legacy'
  options: Record<string, any>
  listeners: Record<string, Listener>
  removed: boolean
  [key: string]: any
}

export interface FakeInfoWindow {
  content?: string
  opened?: { map: unknown; anchor: unknown }
  closed: number
  setContent: (content: string) => void
  open: (options: { map: unknown; anchor: unknown }) => void
  close: () => void
}

/**
 * Installs a minimal `google.maps` on `globalThis` (jsdom has none). `advanced: false` leaves out the
 * marker library so the legacy `Marker` path runs; `mapThrows` makes the Map constructor throw like
 * a broken Google script does.
 */
export function installFakeGoogle({
  advanced = true,
  mapThrows = false,
  zoomAfterFit,
}: { advanced?: boolean; mapThrows?: boolean; zoomAfterFit?: number } = {}): FakeGoogle {
  const fake: FakeGoogle = { maps: [], pins: [], infoWindows: [], idleListeners: [], restore: () => undefined }
  const previous = (globalThis as { google?: unknown }).google

  class FakeMapImpl implements FakeMap {
    center?: unknown
    zoom?: number = zoomAfterFit
    fitBounds = vi.fn()
    panTo = vi.fn()
    constructor(
      _container: unknown,
      public options: Record<string, unknown>,
    ) {
      if (mapThrows) throw new Error('Google Maps is broken')
      fake.maps.push(this)
    }
    setCenter(center: unknown) {
      this.center = center
    }
    setZoom(zoom: number) {
      this.zoom = zoom
    }
    getZoom() {
      return this.zoom
    }
  }

  class FakeInfoWindowImpl implements FakeInfoWindow {
    content?: string
    opened?: { map: unknown; anchor: unknown }
    closed = 0
    constructor() {
      fake.infoWindows.push(this)
    }
    setContent(content: string) {
      this.content = content
    }
    open(options: { map: unknown; anchor: unknown }) {
      this.opened = options
    }
    close() {
      this.closed += 1
    }
  }

  class FakeMarker {
    kind = 'legacy' as const
    listeners: Record<string, Listener> = {}
    removed = false
    position: unknown
    icon: unknown
    label: unknown
    title: unknown
    constructor(public options: Record<string, any>) {
      this.position = options.position
      this.icon = options.icon
      this.label = options.label
      this.title = options.title
      fake.pins.push(this as unknown as FakePin)
    }
    addListener(name: string, listener: Listener) {
      this.listeners[name] = listener
    }
    setPosition(position: unknown) {
      this.position = position
    }
    setIcon(icon: unknown) {
      this.icon = icon
    }
    setLabel(label: unknown) {
      this.label = label
    }
    setTitle(title: unknown) {
      this.title = title
    }
    setMap(map: unknown) {
      this.removed = map === null
    }
  }

  class FakeAdvancedMarker {
    kind = 'advanced' as const
    listeners: Record<string, Listener> = {}
    position: unknown
    content: unknown
    title: unknown
    map: unknown
    get removed() {
      return this.map === null
    }
    constructor(public options: Record<string, any>) {
      this.position = options.position
      this.content = options.content
      this.title = options.title
      this.map = options.map
      fake.pins.push(this as unknown as FakePin)
    }
    addListener(name: string, listener: Listener) {
      this.listeners[name] = listener
    }
  }

  class FakeBounds {
    points: unknown[] = []
    extend(point: unknown) {
      this.points.push(point)
    }
  }

  ;(globalThis as { google?: unknown }).google = {
    maps: {
      Map: FakeMapImpl,
      InfoWindow: FakeInfoWindowImpl,
      Marker: FakeMarker,
      LatLngBounds: FakeBounds,
      Point: class {
        constructor(
          public x: number,
          public y: number,
        ) {}
      },
      event: {
        addListenerOnce: (_target: unknown, _name: string, listener: Listener) => fake.idleListeners.push(listener),
      },
      ...(advanced ? { marker: { AdvancedMarkerElement: FakeAdvancedMarker } } : {}),
    },
  }
  fake.restore = () => {
    ;(globalThis as { google?: unknown }).google = previous
  }
  return fake
}
