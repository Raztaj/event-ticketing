'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'

type Ticket = {
  id: string
  ticket_code: string
  visitor_name: string
  status: string
  notes: string
  created_at: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Ticket[]>([])
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    setSelected(null)
    setQrDataUrl('')

    const { data } = await supabase
      .from('tickets')
      .select('*')
      .or(`visitor_name.ilike.%${q}%,ticket_code.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    setResults(data ?? [])
    setSearched(true)
    setLoading(false)
  }

  const handleSelect = async (ticket: Ticket) => {
    if (ticket.status !== 'unused') return
    setSelected(ticket)
    const qr = await QRCode.toDataURL(ticket.id, {
      width: 400,
      margin: 2,
      color: { dark: '#D94A4A', light: '#FFFFFF' },
    })
    setQrDataUrl(qr)
  }

  const handleDownload = async () => {
    if (!qrDataUrl || !selected) return
    const link = document.createElement('a')
    link.download = `${selected.ticket_code}-${selected.visitor_name.replace(/\s+/g, '_')}.png`
    link.href = qrDataUrl
    link.click()

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'ticket_reissued',
        p_ticket_id: selected.id,
        p_visitor_name: selected.visitor_name,
      })
    }
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
      <h2 className="text-lg font-semibold text-gray-800">Find Ticket</h2>
      <p className="text-sm text-gray-400">Search by visitor name or ticket code</p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm bg-white"
          placeholder="Name or ticket code..."
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </form>

      {selected && qrDataUrl && (
        <div className="bg-white rounded-xl p-6 border border-primary-light shadow-sm text-center space-y-3">
          <p className="text-xs text-gray-400">{selected.ticket_code}</p>
          <p className="text-lg font-semibold text-gray-800">{selected.visitor_name}</p>
          <img src={qrDataUrl} alt="QR" className="mx-auto w-40 h-40" />
          <button
            onClick={handleDownload}
            className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Download QR
          </button>
          <button
            onClick={() => { setSelected(null); setQrDataUrl('') }}
            className="block w-full text-xs text-gray-400 hover:text-gray-600 mt-1"
          >
            Close
          </button>
        </div>
      )}

      {searched && !loading && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tickets found</p>
          ) : (
            results.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-xl p-4 border border-primary-light shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{t.visitor_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge(t.status)}`}>
                    {t.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t.ticket_code}</span>
                  {t.status === 'unused' && (
                    <button
                      onClick={() => handleSelect(t)}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Re-download QR
                    </button>
                  )}
                  {t.status !== 'unused' && (
                    <span className="text-xs text-gray-300">Not available</span>
                  )}
                </div>
                {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
