/** Copy shared by every map and by the approximate-location notices (ACT-10, WEB-10, WEB-19). */
export const mapsContent = {
  approximateBadge: 'Approximate location',
  approximateHint: 'The pin is a best guess, for example the middle of the postcode. Check the address before relying on it.',
  notFoundBadge: 'Location not found',
  notFoundHint: 'There is no map pin for this address yet. A new or changed address can take a moment to be located.',
  region: 'Map of stops. The list of stops next to the map has the same information.',
  listNote: 'Every stop is also in the list next to the map, including stops without a pin.',
  noStopsMatch: 'No stops match these filters',
  savedWithoutLocation: {
    title: 'Saved, but there is no map location yet',
    description: 'The address has not been located yet. Check the street and postcode; the pin appears once it is found.',
  },
  statusLabels: {
    scheduled: 'Scheduled',
    completed: 'Completed',
    'payment-hold': 'Payment hold',
    issue: 'Issue',
  } as Record<string, string>,
  info: {
    round: 'Round',
    technician: 'Technician',
    unassigned: 'Unassigned',
    visit: 'Visit',
    status: 'Status',
    stopsHere: '{count} stops at this pin',
    navigate: 'Navigate',
  },
  pinTitleSingle: '{address}, {status}',
  pinTitleGroup: '{count} stops at {address}',
} as const
