import type { Channels } from '@/api/email-settings.api'
import type { SendChannel } from '@/api/invoices.api'

const ALL: Channels = { email: true, sms: true, whatsapp: true, calls: true }

/** Until the settings load, offer everything and let the server be the judge. */
export function resolveChannels(channels: Channels | undefined): Channels {
  return channels ?? ALL
}

export function isChannelAvailable(channel: SendChannel, channels: Channels): boolean {
  if (channel === 'EMAIL') return channels.email
  if (channel === 'SMS') return channels.sms
  if (channel === 'WHATSAPP') return channels.whatsapp
  return true
}

/** Invoices, reminders and payment links start on Email when it works, else SMS, else the server decides. */
export function defaultSendChannel(channels: Channels): SendChannel {
  if (channels.email) return 'EMAIL'
  return channels.sms ? 'SMS' : 'AUTO'
}

/** Same for round and property messages (the API wants lower case there). */
export function defaultMessageChannel(channels: Channels): 'sms' | 'email' {
  return !channels.email && channels.sms ? 'sms' : 'email'
}

/** Why a channel is missing, in plain words, for the picker. */
export function channelNotes(channels: Channels): string[] {
  const notes: string[] = []
  if (!channels.sms || !channels.whatsapp) notes.push('SMS and WhatsApp need GoHighLevel, which is not connected. Email works without it.')
  if (!channels.email) notes.push('Email is not available right now: it is switched off, paused or not set up. See Settings, Email and branding.')
  return notes
}
