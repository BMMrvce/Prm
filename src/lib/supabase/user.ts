import { createClient } from './server'

/** Id of the signed-in user for a route handler, or null when signed out. */
export async function currentUserId() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
