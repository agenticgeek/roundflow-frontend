import { MAX_FIT_ZOOM, STATUS_COLOR, pinLabel, pinTitle, type MapGroup } from '@/features/maps/lib/markers'

/** A map pin, hiding whether it is an AdvancedMarkerElement or the legacy Marker. */
export interface PinHandle {
  update: (group: MapGroup) => void
  remove: () => void
  /** What an InfoWindow anchors to. */
  anchor: google.maps.marker.AdvancedMarkerElement | google.maps.Marker
}

/** Round pin for one stop, rounded square for a group; the status is also a letter or count. */
export function buildPinElement(group: MapGroup): HTMLElement {
  const element = document.createElement('div')
  const grouped = group.stops.length > 1
  element.textContent = pinLabel(group)
  Object.assign(element.style, {
    width: '28px',
    height: '28px',
    borderRadius: grouped ? '6px' : '50%',
    background: STATUS_COLOR[group.status],
    border: '2px solid #ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
    color: '#ffffff',
    font: 'bold 13px system-ui',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  })
  return element
}

function legacyIcon(group: MapGroup): google.maps.Symbol {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z',
    fillColor: STATUS_COLOR[group.status],
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    scale: 1.4,
    anchor: new google.maps.Point(12, 22),
  }
}

function legacyLabel(group: MapGroup): google.maps.MarkerLabel | null {
  const text = pinLabel(group)
  return text ? { text, color: '#ffffff', fontWeight: 'bold', fontSize: '11px' } : null
}

/**
 * Creates a pin with `AdvancedMarkerElement` when the marker library loaded, otherwise the legacy
 * `google.maps.Marker`. Both are given an accessible title.
 */
export function createPin(map: google.maps.Map, group: MapGroup, onClick: () => void): PinHandle {
  const Advanced = google.maps.marker?.AdvancedMarkerElement
  if (Advanced) {
    const marker = new Advanced({
      map,
      position: group.point,
      content: buildPinElement(group),
      title: pinTitle(group),
      gmpClickable: true,
    })
    marker.addListener('click', onClick)
    return {
      anchor: marker,
      update: (next) => {
        marker.position = next.point
        marker.content = buildPinElement(next)
        marker.title = pinTitle(next)
      },
      remove: () => {
        marker.map = null
      },
    }
  }
  const marker = new google.maps.Marker({
    map,
    position: group.point,
    icon: legacyIcon(group),
    label: legacyLabel(group),
    title: pinTitle(group),
  })
  marker.addListener('click', onClick)
  return {
    anchor: marker,
    update: (next) => {
      marker.setPosition(next.point)
      marker.setIcon(legacyIcon(next))
      marker.setLabel(legacyLabel(next))
      marker.setTitle(pinTitle(next))
    },
    remove: () => marker.setMap(null),
  }
}

/** `fitBounds`, then pull the zoom back to `maxZoom` once the map settles (one address must not zoom to rooftops). */
export function fitBoundsCapped(map: google.maps.Map, bounds: google.maps.LatLngBounds, padding = 48, maxZoom = MAX_FIT_ZOOM) {
  map.fitBounds(bounds, padding)
  google.maps.event.addListenerOnce(map, 'idle', () => {
    const zoom = map.getZoom()
    if (zoom !== undefined && zoom > maxZoom) map.setZoom(maxZoom)
  })
}
