'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

type Row = { visitor_name: string; notes: string; is_vip: boolean }

export default function BulkImportPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [results, setResults] = useState<{ success: number; errors: number; items: { visitor_name: string; ticket_code: string; error?: string }[] } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
      const parsed: Row[] = json.map(r => ({
        visitor_name: String(r.visitor_name || r.Name || r.name || '').trim(),
        notes: String(r.notes || r.Notes || r.NOTES || '').trim(),
        is_vip: !!(r.is_vip || r.isVIP || r.IsVIP || r.vip || r.VIP || r.Vip),
      })).filter(r => r.visitor_name)
      setRows(parsed)
      setResults(null)
      setMessage('')
    }
    reader.readAsArrayBuffer(file)
  }

  const downloadExample = () => {
    const wb = XLSX.utils.book_new()
    const data = [
      { visitor_name: 'Ahmed Mohamed', notes: 'VIP Guest', is_vip: true },
      { visitor_name: 'Sara Ali', notes: '', is_vip: false },
      { visitor_name: 'Omar Hassan', notes: 'Speaker', is_vip: true },
    ]
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'example-tickets.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpload = async () => {
    setUploading(true)
    setMessage('')
    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickets: rows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(`Error: ${data.error}`)
      } else {
        setResults(data)
        if (data.errors === 0) setRows([])
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setUploading(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Bulk Import Tickets</h2>

      {message && (
        <div className={`text-sm p-3 rounded-lg border ${
          message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {message}
          <button onClick={() => setMessage('')} className="float-right font-bold">&times;</button>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 border border-primary-light shadow-sm space-y-4">
        <button
          onClick={downloadExample}
          className="w-full border border-primary text-primary rounded-xl py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          Download Example XLSX
        </button>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload XLSX File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
          />
        </div>

        {rows.length > 0 && (
          <>
            <p className="text-sm text-gray-600">{rows.length} visitors parsed</p>
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">VIP</th>
                    <th className="text-left p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="p-2 text-gray-400">{i + 1}</td>
                      <td className="p-2 text-gray-800">{r.visitor_name}</td>
                      <td className="p-2">{r.is_vip ? <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded-full font-bold">VIP</span> : ''}</td>
                      <td className="p-2 text-gray-400">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {uploading ? 'Importing...' : `Import ${rows.length} Tickets`}
            </button>
          </>
        )}
      </div>

      {results && (
        <div className="bg-white rounded-xl p-5 border border-primary-light shadow-sm space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Results: {results.success} created, {results.errors} failed
          </p>
          {results.errors > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.items.filter(i => i.error).map((item, i) => (
                <p key={i} className="text-xs text-red-500">
                  {item.visitor_name || '(empty)'}: {item.error}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => { setRows([]); setResults(null); setMessage(''); if (fileRef.current) fileRef.current.value = '' }}
        className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
      >
        Clear & Start Over
      </button>
    </div>
  )
}
