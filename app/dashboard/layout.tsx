import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Navigation from '@/components/Navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  return (
    <div className="flex flex-col flex-1 bg-accent">
      <Header userName={profile.name} role={profile.role} />
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {children}
      </main>
      <Navigation role={profile.role} />
      <Footer />
    </div>
  )
}
