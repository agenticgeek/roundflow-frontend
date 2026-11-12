import { floHandlers } from '@/test/msw/handlers/flo'
import { invitesHandlers } from '@/test/msw/handlers/invites'
import { notificationsHandlers } from '@/test/msw/handlers/notifications'
import { paymentsHandlers } from '@/test/msw/handlers/payments'
import { reportsHandlers } from '@/test/msw/handlers/reports'
import { roundsHandlers } from '@/test/msw/handlers/rounds'
import { settingsHandlers } from '@/test/msw/handlers/settings'
import { techniciansHandlers } from '@/test/msw/handlers/technicians'

/** Default happy-path handlers, one file per `src/api/*.api.ts` module. */
export const handlers = [
  ...floHandlers,
  ...invitesHandlers,
  ...notificationsHandlers,
  ...paymentsHandlers,
  ...reportsHandlers,
  ...roundsHandlers,
  ...settingsHandlers,
  ...techniciansHandlers,
]
