import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/auth/signup with { name, email, password } → creates a confirmed Supabase user.
 * Accounts are created server-side so sign-up works without the confirmation email,
 * which the default Supabase mailer rate-limits heavily. The browser signs in afterwards.
 */
export async function POST(request: Request) {
  const input = (await request.json().catch(() => null)) as {
    name?: string
    email?: string
    password?: string
  } | null
  const name = input?.name?.trim() ?? ''
  const email = input?.email?.trim().toLowerCase() ?? ''
  const password = input?.password ?? ''

  if (!name) return Response.json({ error: 'Enter your name.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) {
    const exists = error.status === 422 || /already/i.test(error.message)
    return Response.json(
      {
        error: exists
          ? 'An account with this email already exists. Sign in instead.'
          : error.message,
      },
      { status: exists ? 409 : 400 },
    )
  }
  return Response.json({ ok: true })
}
