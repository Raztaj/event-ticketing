'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Log = {
  id: string
  user_id: string
  action_type: string
  ticket_id: string | null
  visitor_name: string | null
  old_value: any
  new_value: any
  created_at: string
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('all')
  const supabase = createClient()

  const loadLogs = async () => {
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
    loadLogs()
  }, [actionFilter])

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
        <button
          onClick={exportCSV}
          className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Export CSV
        </button>
      </div>

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
