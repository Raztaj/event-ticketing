'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const staffLinks = [
  { href: '/dashboard', label: 'Home', icon: '◉' },
  { href: '/dashboard/create', label: 'Create', icon: '＋' },
  { href: '/dashboard/scan', label: 'Scan', icon: '◈' },
  { href: '/dashboard/search', label: 'Search', icon: '◎' },
]

const masterLinks = [
  { href: '/dashboard', label: 'Home', icon: '◉' },
  { href: '/dashboard/create', label: 'Create', icon: '＋' },
  { href: '/dashboard/scan', label: 'Scan', icon: '◈' },
  { href: '/dashboard/search', label: 'Search', icon: '◎' },
  { href: '/dashboard/tickets', label: 'Tickets', icon: '▤' },
  { href: '/dashboard/logs', label: 'Logs', icon: '☰' },
]

const scannerLinks = [
  { href: '/dashboard', label: 'Scan', icon: '◈' },
]

export default function Navigation({ role }: { role: string }) {
  const pathname = usePathname()
  const links =
    role === 'master_admin' ? masterLinks :
    role === 'staff_admin' ? staffLinks :
    scannerLinks

  return (
    <nav className="bg-white border-t border-primary-light px-2 py-1">
      <div className="max-w-lg mx-auto flex justify-around">
        {links.map(link => {
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors text-xs ${
                isActive
                  ? 'text-primary font-medium'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg leading-none mb-0.5">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
