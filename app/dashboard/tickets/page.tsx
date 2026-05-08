'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Ticket = {
  id: string
  ticket_code: string
  visitor_name: string
  status: 'unused' | 'checked_in' | 'revoked'
  notes: string
  created_by: string
  checked_in_by: string | null
  checked_in_at: string | null
  created_at: string
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')
  const [isMaster, setIsMaster] = useState(false)
  const supabase = createClient()

  const loadTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    setIsMaster(profile?.role === 'master_admin')

    let query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter === 'unused') query = query.eq('status', 'unused')
    else if (filter === 'checked_in') query = query.eq('status', 'checked_in')
    else if (filter === 'revoked') query = query.eq('status', 'revoked')

    const { data } = await query
    setTickets(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadTickets()
  }, [filter])

  const handleEditName = async (ticketId: string) => {
    const newName = editName.trim()
    if (!newName) return

    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket) return

    const { error } = await supabase
      .from('tickets')
      .update({ visitor_name: newName })
      .eq('id', ticketId)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'ticket_edited',
        p_ticket_id: ticketId,
        p_visitor_name: newName,
        p_old_value: JSON.stringify({ visitor_name: ticket.visitor_name }),
        p_new_value: JSON.stringify({ visitor_name: newName }),
      })
    }

    setEditingId(null)
    setEditName('')
    setMessage('Name updated successfully')
    loadTickets()
  }

  const handleRevoke = async (ticketId: string) => {
    const confirmed = confirm('Revoke this ticket? It will become invalid for entry.')
    if (!confirmed) return

    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket || ticket.status === 'checked_in') {
      setMessage('Cannot revoke a checked-in ticket')
      return
    }

    const { error } = await supabase
      .from('tickets')
      .update({ status: 'revoked' })
      .eq('id', ticketId)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'ticket_revoked',
        p_ticket_id: ticketId,
        p_visitor_name: ticket.visitor_name,
      })
    }

    setMessage('Ticket revoked')
    loadTickets()
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case 'unused': return 'bg-green-50 text-green-600 border-green-200'
      case 'checked_in': return 'bg-blue-50 text-blue-600 border-blue-200'
      case 'revoked': return 'bg-red-50 text-red-600 border-red-200'
      default: return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">All Tickets</h2>

      {message && (
        <div className={`text-sm p-3 rounded-lg border ${
          message.includes('Error') ? 'bg-red-50 text-red-700 border-red-200' :
          'bg-green-50 text-green-700 border-green-200'
        }`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', 'unused', 'checked_in', 'revoked'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-primary/30'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No tickets found</p>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <div key={t.id} className="bg-white rounded-xl p-4 border border-primary-light shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  {editingId === t.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-primary rounded text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEditName(t.id)}
                        className="text-xs bg-primary text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{t.visitor_name}</span>
                      {isMaster && t.status === 'unused' && (
                        <button
                          onClick={() => { setEditingId(t.id); setEditName(t.visitor_name) }}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{t.ticket_code}</p>
                  {t.notes && <p className="text-xs text-gray-400 mt-0.5">{t.notes}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${statusBadge(t.status)}`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <span className="text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
                {isMaster && t.status === 'unused' && (
                  <button
                    onClick={() => handleRevoke(t.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
