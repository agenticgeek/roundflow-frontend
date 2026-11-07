import { HttpResponse } from 'msw'
import { on, specJson } from '@/test/msw/typed'

export const GHL_WEBHOOK_URL = 'https://api-dev.roundflow.ai/webhooks/ghl?tenantId=tn1&secret=s3'

export const settingsHandlers = [
  // Everything sendable by default; tests that care about channels override this.
  on('get', '/settings/business-profile', () =>
    HttpResponse.json({ businessName: 'Test Cleaning', channels: { email: true, sms: true, whatsapp: true, calls: true } }),
  ),
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
