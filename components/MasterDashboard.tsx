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
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [showDeleteUnusedConfirm, setShowDeleteUnusedConfirm] = useState(false)
  const [deletingUnused, setDeletingUnused] = useState(false)
  const [deleteUnusedMessage, setDeleteUnusedMessage] = useState('')

  const loadStats = () => {
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
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleReset = async () => {
    setResetting(true)
    setResetMessage('')
    const res = await fetch('/api/tickets/reset', { method: 'POST' })
    const data = await res.json()
    setResetting(false)
    setShowResetConfirm(false)
    if (!res.ok) {
      setResetMessage(`Error: ${data.error}`)
    } else {
      setResetMessage(`All tickets reset to unused (${data.count} tickets)`)
      loadStats()
    }
  }

  const handleDownloadUnused = () => {
    window.open('/api/tickets/unused/download', '_blank')
  }

  const handleDeleteUnused = async () => {
    setDeletingUnused(true)
    setDeleteUnusedMessage('')
    const res = await fetch('/api/tickets/unused/delete', { method: 'POST' })
    const data = await res.json()
    setDeletingUnused(false)
    setShowDeleteUnusedConfirm(false)
    if (!res.ok) {
      setDeleteUnusedMessage(`Error: ${data.error}`)
    } else {
      setDeleteUnusedMessage(`${data.count} unused tickets deleted`)
      loadStats()
    }
  }

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

      {resetMessage && (
        <div className={`text-sm p-3 rounded-lg border ${
          resetMessage.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {resetMessage}
          <button onClick={() => setResetMessage('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      {showResetConfirm ? (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center space-y-3">
          <p className="text-sm font-medium text-red-700">Reset all tickets?</p>
          <p className="text-xs text-red-500">This will clear all check-in data and set every ticket back to unused.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset All'}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="text-gray-500 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Reset All Tickets for New Event
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleDownloadUnused}
          className="flex-1 border border-primary text-primary rounded-xl py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          Download Unused ({stats.unused})
        </button>
        <button
          onClick={() => setShowDeleteUnusedConfirm(true)}
          disabled={stats.unused === 0}
          className="flex-1 border border-red-200 text-red-500 rounded-xl py-3 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete Unused ({stats.unused})
        </button>
      </div>

      {deleteUnusedMessage && (
        <div className={`text-sm p-3 rounded-lg border ${
          deleteUnusedMessage.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {deleteUnusedMessage}
          <button onClick={() => setDeleteUnusedMessage('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      {showDeleteUnusedConfirm && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center space-y-3">
          <p className="text-sm font-medium text-red-700">Delete all unused tickets?</p>
          <p className="text-xs text-red-500">This permanently removes {stats.unused} unused tickets. This cannot be undone.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleDeleteUnused}
              disabled={deletingUnused}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deletingUnused ? 'Deleting...' : 'Yes, Delete All'}
            </button>
            <button
              onClick={() => setShowDeleteUnusedConfirm(false)}
              className="text-gray-500 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
