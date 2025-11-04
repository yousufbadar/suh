import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
  // Allow public access to home and icons pages
  if (
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/icons') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/auth/callback')
  ) {
    return await updateSession(request)
  }

  // Protected routes - require authentication
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

