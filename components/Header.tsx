'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Header({ userName, role }: { userName: string; role: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const roleLabel =
    role === 'master_admin' ? 'Master Admin' :
    role === 'staff_admin' ? 'Staff' : 'Scanner'

  return (
    <header className="bg-white border-b border-primary-light px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Easily</h1>
          <p className="text-xs text-gray-400 -mt-0.5">Event Ticketing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 leading-tight">{userName}</p>
            <p className="text-xs text-primary">{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-primary-dark transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
