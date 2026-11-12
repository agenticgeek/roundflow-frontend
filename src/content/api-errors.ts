/** Copy for the cross-cutting API errors (Wave 2B-1 contract). */
export const apiErrorsContent = {
  adminOnly: 'Only an administrator can do this.',
  rateLimitedWait: 'Too many attempts. Try again in {seconds} {unit}.',
  rateLimited: 'Too many attempts. Wait a moment, then try again.',
  secondOne: 'second',
  secondMany: 'seconds',
  tooLarge: 'That request is too large. Try sending less at once.',
  reference: 'Reference: {id}',
  /** Notes beside settings a MANAGER cannot change (the API answers 403 ADMIN_ONLY). */
  adminOnlyNotes: {
    businessProfile: 'VAT and bank details can only be changed by an administrator. You can still edit the other fields.',
    paymentSetup: 'Only an administrator can change payment settings or connect and disconnect Stripe and GoCardless.',
    integrations: 'Only an administrator can connect or disconnect messaging.',
    technicians: 'Only an administrator can delete a technician. You can deactivate one instead.',
  },
} as const
