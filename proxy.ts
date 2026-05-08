import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/')

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && pathname === '/' && request.method === 'GET') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/', request.url))
    }

    const role = profile.role

    if (pathname.startsWith('/dashboard/logs') || pathname.startsWith('/dashboard/users')) {
      if (role !== 'master_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
