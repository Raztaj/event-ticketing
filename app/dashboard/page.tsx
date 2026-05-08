'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import StaffDashboard from '@/components/StaffDashboard'
import MasterDashboard from '@/components/MasterDashboard'
import ScannerDashboard from '@/components/ScannerDashboard'

export default function DashboardHome() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (data) setRole(data.role)
      setLoading(false)
    }

    getRole()
  }, [supabase])

  if (loading) return null

  if (role === 'master_admin') return <MasterDashboard />
  if (role === 'staff_admin') return <StaffDashboard />
  return <ScannerDashboard />
}
