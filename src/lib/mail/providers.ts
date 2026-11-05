import type { SpaceKey } from '@/types/workbench'
import type { MailProviderKey } from './types'

/** Mailboxes each workspace can connect, in the order they are offered. */
const OPTIONS: Record<SpaceKey, MailProviderKey[]> = {
  office: ['hostinger', 'gmail', 'outlook'],
  studio: ['outlook', 'gmail'],
  personal: ['gmail'],
}

export const PROVIDER_LABEL: Record<MailProviderKey, string> = {
  hostinger: 'Hostinger Mail',
  gmail: 'Gmail',
  outlook: 'Outlook',
}

export const mailOptions = (space: SpaceKey) => OPTIONS[space]
