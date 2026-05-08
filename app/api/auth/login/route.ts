import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return NextResponse.json(
        { error: error?.message || 'Login failed' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })

    const { session } = data
    const maxAge = 60 * 60 * 24 * 365
    const cookiePrefix = `sb-${extractRef(process.env.NEXT_PUBLIC_SUPABASE_URL!)}-auth-token`

    response.cookies.set(cookiePrefix, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + maxAge,
      expires_in: maxAge,
      token_type: 'bearer',
      user: session.user,
    }), {
      path: '/',
      maxAge,
      sameSite: 'lax',
      httpOnly: true,
      secure: true,
    })

    return response
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractRef(url: string): string {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match ? match[1] : ''
}
