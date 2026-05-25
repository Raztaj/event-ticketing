'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Log = {
  id: string
  user_id: string
  action_type: string
  ticket_id: string | null
  visitor_name: string | null
  old_value: unknown
  new_value: unknown
  created_at: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')
  const [isMaster, setIsMaster] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      setIsMaster(profile?.role === 'master_admin')
    }

    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (actionFilter !== 'all') {
      query = query.eq('action_type', actionFilter)
    }

    const { data } = await query
    setLogs(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs()
  }, [actionFilter])

  const handleDeleteLogs = async () => {
    setDeleting(true)
    setMessage('')

    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('All activity logs deleted')
      fetchLogs()
    }

    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  const exportCSV = () => {
    const headers = ['ID', 'Action', 'Visitor', 'Ticket ID', 'Old Value', 'New Value', 'Date']
    const rows = logs.map(l => [
      l.id,
      l.action_type,
      l.visitor_name || '',
      l.ticket_id || '',
      JSON.stringify(l.old_value || ''),
      JSON.stringify(l.new_value || ''),
      new Date(l.created_at).toISOString(),
    ])

    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const actionTypes = ['all', 'ticket_created', 'ticket_edited', 'ticket_revoked', 'ticket_scanned', 'ticket_reissued']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Activity Logs</h2>
        <div className="flex gap-2">
          {isMaster && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete All
            </button>
          )}
          <button
            onClick={exportCSV}
            className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-lg border ${
          message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-center space-y-3">
          <p className="text-sm font-medium text-red-700">Delete all activity logs?</p>
          <p className="text-xs text-red-500">This permanently removes all logs. This cannot be undone.</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleDeleteLogs}
              disabled={deleting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete All'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-gray-500 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {actionTypes.map(a => (
          <button
            key={a}
            onClick={() => setActionFilter(a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              actionFilter === a
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary/30'
            }`}
          >
            {a === 'all' ? 'All' : a.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No logs found</p>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl p-3 border border-primary-light shadow-sm text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">{log.action_type.replace(/_/g, ' ')}</span>
                <span className="text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              {log.visitor_name && (
                <p className="text-gray-500 mt-1">Visitor: {log.visitor_name}</p>
              )}
              {log.old_value && (
                <p className="text-gray-400 mt-0.5">From: {JSON.stringify(log.old_value)}</p>
              )}
              {log.new_value && (
                <p className="text-gray-400">To: {JSON.stringify(log.new_value)}</p>
              )}
              {log.ticket_id && (
                <p className="text-gray-400 mt-0.5">Ticket: {log.ticket_id.slice(0, 8)}...</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
