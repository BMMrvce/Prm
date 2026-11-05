/** Free mail providers; projects can't be shared with these (mirrors the database list). */
const PUBLIC_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.in',
  'ymail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'yandex.com',
  'rediffmail.com',
  'hey.com',
  'fastmail.com',
])

/** The organisation domain of an email, or null for free mail providers. */
export function shareableDomain(email: string | undefined) {
  const domain = email?.split('@')[1]?.toLowerCase()
  return domain && !PUBLIC_DOMAINS.has(domain) ? domain : null
}
