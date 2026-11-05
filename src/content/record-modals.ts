/** Copy for Add Customer, Add property to an existing customer, and Cancel property / customer. */
export const recordModalsContent = {
  addCustomer: {
    button: 'Add customer',
    title: 'Add customer',
    subtitle: 'Create the customer together with their first property.',
    propertyHeading: 'First property',
    fields: { name: 'Full name', phone: 'Phone', email: 'Email', paymentMethod: 'Payment method' },
    paymentPlaceholder: 'Not set',
    validation: {
      nameRequired: 'Enter the customer’s name.',
      phoneInvalid: 'Enter a valid phone number.',
      emailInvalid: 'Enter a valid email address.',
    },
    actions: { cancel: 'Cancel', save: 'Add customer', saving: 'Saving…' },
    successToast: 'Customer added',
  },
  addProperty: {
    button: 'Add property',
    title: 'Add property',
    subtitle: 'Add another property for {customer}.',
    fields: {
      address: 'Street address',
      postcode: 'Postcode',
      serviceArea: 'Service area',
      price: 'Price per visit (£)',
      round: 'Round',
    },
    areaPlaceholder: 'Select a service area',
    roundPlaceholder: 'Leave unassigned for now',
    noServiceAreas: 'Create a service area first (Settings → Service Areas) before adding a property.',
    validation: {
      addressRequired: 'Enter the property address.',
      postcodeRequired: 'Enter a postcode.',
      postcodeInvalid: 'Enter a valid UK postcode (e.g. NE66 1AA).',
      areaRequired: 'Please select a service area.',
      priceInvalid: 'Enter a price above £0.',
    },
    actions: { cancel: 'Cancel', save: 'Add property', saving: 'Saving…' },
    successToast: 'Property added',
  },
  remove: {
    cancelProperty: 'Cancel property',
    cancelCustomer: 'Cancel customer',
    propertyTitle: 'Cancel this property?',
    customerTitle: 'Cancel this customer?',
    propertyBody:
      '{address} will be cancelled and its service plan stopped. Upcoming visits are removed from rounds.',
    customerBody:
      '{customer} will be cancelled along with their properties and service plans. Upcoming visits are removed from rounds.',
    unpaidWarning:
      'This customer has an unpaid balance of {amount}. Cancelling does not clear the debt — collect or write it off first if you need to.',
    keep: 'Keep',
    confirm: 'Yes, cancel',
    confirming: 'Cancelling…',
    propertyToast: 'Property cancelled',
    customerToast: 'Customer cancelled',
  },
} as const
