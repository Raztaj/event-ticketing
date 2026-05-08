'use client'

import Link from 'next/link'

const actions = [
  { href: '/dashboard/create', label: 'Create Ticket', desc: 'Issue a new ticket', icon: '＋' },
  { href: '/dashboard/scan', label: 'Scan QR', desc: 'Verify entry at gate', icon: '◈' },
  { href: '/dashboard/search', label: 'Find Ticket', desc: 'Lost QR recovery', icon: '◎' },
]

export default function StaffDashboard() {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Staff Dashboard</h2>
      <p className="text-sm text-gray-500 mb-4">Select an action to get started</p>
      <div className="space-y-3">
        {actions.map(a => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-4 bg-white rounded-xl p-4 border border-primary-light hover:border-primary/30 transition-colors shadow-sm"
          >
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-xl text-primary">
              {a.icon}
            </div>
            <div>
              <p className="font-medium text-gray-800">{a.label}</p>
              <p className="text-sm text-gray-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
