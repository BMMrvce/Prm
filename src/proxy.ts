import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Paths reachable without a session. Everything else needs a signed-in user. */
const PUBLIC_PATHS = ['/login', '/api/auth/', '/api/health', '/api/cron/']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))
}

/**
 * Refreshes the Supabase session cookie on every request and guards the app:
 * signed-out visitors are sent to /login (API calls get 401), signed-in users skip /login.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  const redirect = (path: string) => {
    const target = NextResponse.redirect(new URL(path, request.url))
    // Carry refreshed auth cookies across the redirect.
    response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
    return target
  }

  if (!signedIn && !isPublic(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }
    const next = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`
    return redirect(`/login${next}`)
  }
  if (signedIn && pathname === '/login') return redirect('/office')
  return response
}

export const config = {
  // Skip Next internals and public static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
}
