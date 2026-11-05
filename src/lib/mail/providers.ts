import type { SpaceKey } from '@/types/workbench'
import type { MailProviderKey } from './types'

/**
 * Mailboxes each workspace can connect, in the order they are offered. Outlook is turned
 * off for now; add 'outlook' back here (office, studio) to offer it again.
 */
const OPTIONS: Record<SpaceKey, MailProviderKey[]> = {
  office: ['hostinger', 'gmail'],
  studio: ['gmail'],
  personal: ['gmail'],
}

export const PROVIDER_LABEL: Record<MailProviderKey, string> = {
  hostinger: 'Hostinger Mail',
  gmail: 'Gmail',
  outlook: 'Outlook',
}

export const mailOptions = (space: SpaceKey) => OPTIONS[space]
