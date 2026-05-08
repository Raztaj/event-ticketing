'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = document.cookie.split(';').map(c => {
            const [name, ...rest] = c.split('=')
            return { name: name.trim(), value: rest.join('=').trim() }
          }).filter(c => c.name && c.value)
          return cookies
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax${options?.domain ? `; domain=${options.domain}` : ''}${options?.secure ? '; secure' : ''}`
          })
        },
      },
    }
  )
}
