import { on, specJson } from '@/test/msw/typed'

export const GHL_WEBHOOK_URL = 'https://api-dev.roundflow.ai/webhooks/ghl?tenantId=tn1&secret=s3'

export const settingsHandlers = [
  on('post', '/settings/ghl/connect-private', () =>
    specJson('/settings/ghl/connect-private', 'post', 200, {
      status: 'connected',
      method: 'private',
      webhookUrl: GHL_WEBHOOK_URL,
    }),
  ),
  on('post', '/settings/ghl/disconnect', () =>
    specJson('/settings/ghl/disconnect', 'post', 200, { status: 'disconnected' }),
  ),
]
