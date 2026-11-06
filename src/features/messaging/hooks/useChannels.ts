import { useCallback, useState } from 'react'
import type { Channels } from '@/api/email-settings.api'
import type { SendChannel } from '@/api/invoices.api'
import { useBusinessProfile } from '@/features/settings/hooks/useSettings'
import { defaultSendChannel, resolveChannels } from '@/features/messaging/lib/channels'

/** What can be sent right now (`channels` on the business profile). Everything is assumed until it loads. */
export function useChannels(): Channels {
  return resolveChannels(useBusinessProfile().data?.channels)
}

/**
 * The channel a send dialog starts on (Email when it works) and a setter. Once the user picks, their choice
 * stays even if the settings reload underneath them. The third value goes back to the default (dialogs that stay mounted call it on open).
 */
export function useChannelChoice(): [SendChannel, (channel: SendChannel) => void, () => void] {
  const channels = useChannels()
  const [chosen, setChosen] = useState<SendChannel | null>(null)
  const reset = useCallback(() => setChosen(null), [])
  return [chosen ?? defaultSendChannel(channels), setChosen, reset]
}
