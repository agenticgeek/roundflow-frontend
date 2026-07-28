/** Content for the standalone "Add Property" quick-action modal's Assign Round step. */
export const addPropertyModalContent = {
  title: 'Add Property',
  closeLabel: 'Close add property',
  subSteps: [
    { label: '01', title: 'Property Details', subtitle: 'Add properties to link with the rounds' },
    { label: '02', title: 'Service Plan', subtitle: 'Customer/Property chosen plan for service' },
    { label: '03', title: 'Scheduling Settings', subtitle: 'Allot the timing for the customer/property' },
    { label: '04', title: 'Risk & Notes', subtitle: 'All safety/risks/technician notes' },
    { label: '05', title: 'Assign Property to Round', subtitle: 'Assign the property in whichever round you want' },
  ],
  assignRound: {
    now: {
      title: 'Assign to a Round Now',
      description: 'Select a round and technician immediately so this property is ready for scheduling.',
    },
    later: {
      title: 'Save & Assign Later',
      description: 'Property will be saved as unassigned. You can assign it to a round from the customer record at any time.',
    },
    fields: {
      round: { label: 'Round', placeholder: 'Select round' },
      roundDay: { label: 'Round Day', placeholder: 'Select day' },
      technician: {
        label: 'Technician',
        placeholder: 'Select technician — pre-filled from round',
        hint: 'The technician assigned to the selected round will be pre-filled',
      },
    },
    actions: {
      assignAndSave: 'Assign & Save',
      saveProperty: 'Save Property',
    },
  },
  emptyState: 'No properties added yet.',
  validation: {
    serviceAreaRequired: 'Please select a service area.',
  },
  sampleDataNotice:
    'Saved using sample options — connect a real service area in Settings to sync this property with the backend.',
} as const
