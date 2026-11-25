/**
 * Copy for the shared ConfirmDialog and the destructive actions that use it (WEB-02).
 * `{name}` is filled with the thing being removed.
 */
export const confirmDialogContent = {
  cancel: 'Cancel',
  working: 'Working…',
  serviceArea: {
    title: 'Delete this service area?',
    description: '“{name}” will be removed. This can’t be undone.',
    confirm: 'Delete area',
    deleted: 'Service area deleted.',
    gone: 'This service area no longer exists.',
  },
  technicianDeactivate: {
    title: 'Deactivate this technician?',
    description:
      '{name} will be marked inactive and can’t be assigned to rounds. They stay in your history. Visits already scheduled are not changed.',
    confirm: 'Deactivate',
    done: 'Technician deactivated.',
    failed: 'Could not deactivate technician.',
  },
  technicianDelete: {
    title: 'Delete this technician?',
    description: '{name} has not joined yet and will be removed. This can’t be undone.',
    confirm: 'Delete technician',
    done: 'Technician deleted.',
    failed: 'Could not delete technician.',
  },
  /** Round Planner → Delete round. Counts come from GET /rounds/:id/delete-preview. */
  round: {
    title: 'Delete “{name}”?',
    loading: 'Checking what this round affects…',
    description: '{properties} will be unassigned and {visits} removed. Completed visits are kept.',
    propertyOne: '1 property',
    propertyMany: '{count} properties',
    visitOne: '1 upcoming visit',
    visitMany: '{count} upcoming visits',
    detachedOne: '1 earlier unfinished visit stays in history without a round.',
    detachedMany: '{count} earlier unfinished visits stay in history without a round.',
    closuresRemoveOne: '1 upcoming closure that only covered this round will be removed.',
    closuresRemoveMany: '{count} upcoming closures that only covered this round will be removed.',
    closuresUpdateOne: 'This round will be taken out of 1 other closure.',
    closuresUpdateMany: 'This round will be taken out of {count} other closures.',
    blockedLabel: 'Why this round can’t be deleted',
    blockedIntro: 'This round can’t be deleted yet:',
    emergenciesOne: 'This round has 1 emergency report.',
    emergenciesMany: 'This round has {count} emergency reports.',
    attachedOne: '1 upcoming visit already has an invoice, payment, photo or issue.',
    attachedMany: '{count} upcoming visits already have invoices, payments, photos or issues.',
    blockedUnknown: 'This round can’t be deleted right now.',
    previewFailed: 'Could not check what deleting this round would affect.',
    conflictEmergencies: 'This round now has emergency reports, so it wasn’t deleted.',
    conflictAttached:
      'Some upcoming visits on this round now have invoices, payments, photos or issues, so it wasn’t deleted.',
    confirm: 'Delete round',
    deleted: 'Round deleted',
    deletedDetail: '{name}: {properties} unassigned, {visits} removed.',
    gone: 'This round no longer exists.',
  },
  incident: {
    title: 'Delete this incident?',
    description: 'The incident “{name}” will be removed from this technician’s record and their KPIs.',
    confirm: 'Delete incident',
  },
} as const
