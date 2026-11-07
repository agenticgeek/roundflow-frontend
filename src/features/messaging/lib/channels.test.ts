import { describe, expect, it } from 'vitest'
import { channelNotes, defaultMessageChannel, defaultSendChannel, isChannelAvailable, resolveChannels } from '@/features/messaging/lib/channels'

const all = { email: true, sms: true, whatsapp: true, calls: true }
const emailOnly = { email: true, sms: false, whatsapp: false, calls: true }
const smsOnly = { email: false, sms: true, whatsapp: true, calls: true }
const none = { email: false, sms: false, whatsapp: false, calls: true }

describe('resolveChannels', () => {
  it('assumes everything is available until the settings have loaded', () => {
    expect(resolveChannels(undefined)).toEqual(all)
    expect(resolveChannels(emailOnly)).toEqual(emailOnly)
  })
})

describe('isChannelAvailable', () => {
  it('maps picker values to the capability flags; AUTO is always offered', () => {
    expect(isChannelAvailable('AUTO', none)).toBe(true)
    expect(isChannelAvailable('EMAIL', emailOnly)).toBe(true)
    expect(isChannelAvailable('SMS', emailOnly)).toBe(false)
    expect(isChannelAvailable('WHATSAPP', emailOnly)).toBe(false)
    expect(isChannelAvailable('SMS', smsOnly)).toBe(true)
    expect(isChannelAvailable('EMAIL', smsOnly)).toBe(false)
  })
})

describe('defaultSendChannel (invoices, reminders, payment links)', () => {
  it('prefers email, then SMS, else leaves it to the server', () => {
    expect(defaultSendChannel(all)).toBe('EMAIL')
    expect(defaultSendChannel(emailOnly)).toBe('EMAIL')
    expect(defaultSendChannel(smsOnly)).toBe('SMS')
    expect(defaultSendChannel(none)).toBe('AUTO')
  })
})

describe('defaultMessageChannel (round and property messages, lower case)', () => {
  it('prefers email, then sms', () => {
    expect(defaultMessageChannel(all)).toBe('email')
    expect(defaultMessageChannel(smsOnly)).toBe('sms')
    expect(defaultMessageChannel(none)).toBe('email')
  })
})

describe('channelNotes', () => {
  it('explains each unavailable channel in plain words', () => {
    expect(channelNotes(all)).toEqual([])
    expect(channelNotes(emailOnly)).toEqual(['SMS and WhatsApp need GoHighLevel, which is not connected. Email works without it.'])
    expect(channelNotes(smsOnly)).toEqual(['Email is not available right now: it is switched off, paused or not set up. See Settings, Email and branding.'])
    expect(channelNotes(none)).toHaveLength(2)
  })
})
