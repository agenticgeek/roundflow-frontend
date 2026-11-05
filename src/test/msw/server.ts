import { setupServer } from 'msw/node'
import { handlers } from '@/test/msw/handlers'

/** One MSW server for the whole suite; tests add per-case handlers with `server.use()`. */
export const server = setupServer(...handlers)
