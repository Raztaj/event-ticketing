'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ScanResult = {
  status: 'valid' | 'invalid' | 'already_used' | 'error'
  message: string
  visitor_name?: string
  ticket_code?: string
  is_vip?: boolean
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [cameraError, setCameraError] = useState('')
  const scannerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null)
  const supabase = createClient()

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
      } catch {}
      html5QrCodeRef.current = null
    }
  }

  const startScanner = async () => {
    setResult(null)
    setCameraError('')
    setScanning(true)

    try {
      const Html5Qrcode = (await import('html5-qrcode')).Html5Qrcode
      const scanner = new Html5Qrcode('qr-reader')
      html5QrCodeRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await stopScanner()
          setScanning(false)
          await verifyTicket(decodedText)
        },
        () => {}
      )
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Camera access denied or unavailable')
      setScanning(false)
    }
  }

  const verifyTicket = async (ticketId: string) => {
    setVerifying(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setResult({ status: 'error', message: 'Session expired' })
      setVerifying(false)
      return
    }

    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: 'ticket_scanned',
      p_ticket_id: ticketId,
    })

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, user_id: user.id }),
    })

    const data: ScanResult & { error?: string } = await res.json()

    if (data.error) {
      setResult({ status: 'error', message: data.error })
    } else {
      setResult(data)
    }

    setVerifying(false)
  }

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  const statusColor = (s: string) => {
    switch (s) {
      case 'valid': return 'bg-green-50 border-green-300 text-green-700'
      case 'already_used': return 'bg-yellow-50 border-yellow-300 text-yellow-700'
      case 'invalid': return 'bg-red-50 border-red-300 text-red-700'
      default: return 'bg-gray-50 border-gray-300 text-gray-700'
    }
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case 'valid': return '✅'
      case 'already_used': return '⚠️'
      case 'invalid': return '❌'
      default: return '✕'
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Scan Ticket</h2>

      {!scanning && !result && (
        <div className="bg-white rounded-xl p-6 border border-primary-light shadow-sm text-center space-y-4">
          <div className="text-6xl text-primary/30">◈</div>
          <p className="text-sm text-gray-500">Point the camera at a QR code to verify entry</p>
          <button
            onClick={startScanner}
            className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Start Scanning
          </button>
          {cameraError && (
            <p className="text-xs text-red-500">{cameraError}</p>
          )}
        </div>
      )}

      {scanning && (
        <div className="bg-white rounded-xl p-4 border border-primary-light shadow-sm">
          <div id="qr-reader" ref={scannerRef} className="mx-auto max-w-xs" />
          <button
            onClick={async () => { await stopScanner(); setScanning(false) }}
            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            Cancel Scanning
          </button>
        </div>
      )}

      {verifying && (
        <div className="bg-white rounded-xl p-6 border border-primary-light shadow-sm text-center">
          <div className="animate-pulse text-4xl text-primary mb-3">◈</div>
          <p className="text-sm text-gray-500">Verifying ticket...</p>
        </div>
      )}

      {result && (
        <div className={`rounded-xl border-2 shadow-sm text-center ${statusColor(result.status)}`}>
          <div className="py-8 px-6">
            <div className="text-5xl mb-3">{statusIcon(result.status)}</div>
            <p className="text-xl font-bold capitalize mb-1">{result.status.replace('_', ' ')}</p>
            <p className="text-sm opacity-80">{result.message}</p>
            {result.visitor_name && (
              <p className="text-base font-semibold mt-3">
                {result.visitor_name}
                {result.is_vip && (
                  <span className="ml-1.5 text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold align-middle">VIP</span>
                )}
              </p>
            )}
            {result.ticket_code && (
              <p className="text-xs opacity-60 mt-0.5">{result.ticket_code}</p>
            )}
          </div>
          <div className="border-t border-inherit opacity-20" />
          <button
            onClick={() => { setResult(null) }}
            className="w-full py-3 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Tap to Scan Next
          </button>
        </div>
      )}
    </div>
  )
}
