import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffDashboard from '@/components/StaffDashboard'
import MasterDashboard from '@/components/MasterDashboard'
import ScannerDashboard from '@/components/ScannerDashboard'

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  const role = profile.role

  if (role === 'master_admin') return <MasterDashboard />
  if (role === 'staff_admin') return <StaffDashboard />
  return <ScannerDashboard />
}
