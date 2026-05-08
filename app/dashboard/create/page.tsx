'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'qrcode'

export default function CreateTicketPage() {
  const [visitorName, setVisitorName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<{
    id: string
    ticket_code: string
    visitor_name: string
  } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTicket(null)
    setQrDataUrl('')

    const name = visitorName.trim()
    if (!name) {
      setError('Visitor name is required')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    const ticketCode = 'TKT-' + Array.from({ length: 6 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')

    const { data: newTicket, error: dbError } = await supabase
      .from('tickets')
      .insert({
        ticket_code: ticketCode,
        visitor_name: name,
        notes,
        created_by: user.id,
      })
      .select('id, ticket_code, visitor_name')
      .single()

    if (dbError || !newTicket) {
      setError(dbError?.message || 'Failed to create ticket')
      setLoading(false)
      return
    }

    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: 'ticket_created',
      p_ticket_id: newTicket.id,
      p_visitor_name: name,
    })

    const qr = await QRCode.toDataURL(newTicket.id, {
      width: 400,
      margin: 2,
      color: { dark: '#D94A4A', light: '#FFFFFF' },
    })

    setTicket(newTicket)
    setQrDataUrl(qr)
    setLoading(false)
  }

  const handleDownloadPNG = () => {
    if (!qrDataUrl || !ticket) return
    const link = document.createElement('a')
    link.download = `${ticket.ticket_code}-${ticket.visitor_name.replace(/\s+/g, '_')}.png`
    link.href = qrDataUrl
    link.click()
  }

  const handleDownloadPDF = async () => {
    if (!qrDataUrl || !ticket) return
    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF('portrait', 'mm', 'a6')
    const imgData = qrDataUrl
    const pageWidth = pdf.internal.pageSize.getWidth()
    const qrSize = 60
    const x = (pageWidth - qrSize) / 2
    let y = 20

    pdf.setFontSize(12)
    pdf.setTextColor(217, 74, 74)
    pdf.text('Easily', pageWidth / 2, y, { align: 'center' })
    y += 8

    pdf.setFontSize(10)
    pdf.setTextColor(0, 0, 0)
    pdf.text(`Ticket: ${ticket.ticket_code}`, pageWidth / 2, y, { align: 'center' })
    y += 6
    pdf.text(`Visitor: ${ticket.visitor_name}`, pageWidth / 2, y, { align: 'center' })
    y += 8

    pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize)

    pdf.save(`${ticket.ticket_code}-${ticket.visitor_name.replace(/\s+/g, '_')}.pdf`)
  }

  const logReissue = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !ticket) return
    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: 'ticket_reissued',
      p_ticket_id: ticket.id,
      p_visitor_name: ticket.visitor_name,
    })
  }

  if (ticket && qrDataUrl) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Ticket Created</h2>

        <div className="bg-white rounded-xl p-6 border border-primary-light shadow-sm text-center space-y-3">
          <p className="text-sm text-gray-400">{ticket.ticket_code}</p>
          <p className="text-xl font-semibold text-gray-800">{ticket.visitor_name}</p>
          <img src={qrDataUrl} alt="QR Code" className="mx-auto w-48 h-48" />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { handleDownloadPNG(); logReissue() }}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Download PNG
          </button>
          <button
            onClick={() => { handleDownloadPDF(); logReissue() }}
            className="flex-1 bg-white text-primary border border-primary py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            Download PDF
          </button>
        </div>

        <button
          onClick={() => { setTicket(null); setQrDataUrl(''); setVisitorName(''); setNotes('') }}
          className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
        >
          Create Another Ticket
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Create Ticket</h2>

      <form onSubmit={handleCreate} className="bg-white rounded-xl p-5 border border-primary-light shadow-sm space-y-4">
        {error && (
          <div className="bg-red-50 text-primary-dark text-sm p-3 rounded-lg border border-primary-light">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Visitor Full Name <span className="text-primary">*</span>
          </label>
          <input
            type="text"
            value={visitorName}
            onChange={e => setVisitorName(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            placeholder="e.g. Ahmed Mohamed"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            placeholder="e.g. VIP, Guest of honor"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Generate Ticket'}
        </button>
      </form>
    </div>
  )
}
