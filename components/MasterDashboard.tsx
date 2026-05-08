'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const actions = [
  { href: '/dashboard/create', label: 'Create Ticket', icon: '＋' },
  { href: '/dashboard/scan', label: 'Scan QR', icon: '◈' },
  { href: '/dashboard/search', label: 'Find Ticket', icon: '◎' },
  { href: '/dashboard/tickets', label: 'All Tickets', icon: '▤' },
  { href: '/dashboard/logs', label: 'Activity Logs', icon: '☰' },
  { href: '/dashboard/users', label: 'Manage Users', icon: '⚇' },
]

export default function MasterDashboard() {
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, unused: 0, revoked: 0 })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('tickets').select('id', { count: 'exact', head: true }),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'checked_in'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'unused'),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'revoked'),
    ]).then(([total, checkedIn, unused, revoked]) => {
      setStats({
        total: total.count ?? 0,
        checkedIn: checkedIn.count ?? 0,
        unused: unused.count ?? 0,
        revoked: revoked.count ?? 0,
      })
    })
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Master Dashboard</h2>

      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white rounded-xl p-3 border border-primary-light text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-primary-light text-center shadow-sm">
          <p className="text-2xl font-bold text-green-500">{stats.checkedIn}</p>
          <p className="text-xs text-gray-400">In</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-primary-light text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-600">{stats.unused}</p>
          <p className="text-xs text-gray-400">Open</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-primary-light text-center shadow-sm">
          <p className="text-2xl font-bold text-red-400">{stats.revoked}</p>
          <p className="text-xs text-gray-400">Revoked</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="flex flex-col items-center justify-center gap-2 bg-white rounded-xl p-5 border border-primary-light hover:border-primary/30 transition-colors shadow-sm"
          >
            <span className="text-2xl text-primary">{a.icon}</span>
            <span className="text-sm font-medium text-gray-700">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
