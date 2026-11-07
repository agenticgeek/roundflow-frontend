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
  incident: {
    title: 'Delete this incident?',
    description: 'The incident “{name}” will be removed from this technician’s record and their KPIs.',
    confirm: 'Delete incident',
  },
} as const
