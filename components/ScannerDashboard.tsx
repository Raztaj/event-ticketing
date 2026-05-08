'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ScannerDashboard() {
  const router = useRouter()

  useEffect(() => {
    router.push('/dashboard/scan')
  }, [router])

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-gray-400">Redirecting to scanner...</p>
    </div>
  )
}
