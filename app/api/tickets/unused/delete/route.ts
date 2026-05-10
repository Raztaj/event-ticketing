import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: toDelete, error: fetchError } = await supabase
      .from('tickets')
      .select('id, ticket_code, visitor_name')
      .eq('status', 'unused')

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const count = toDelete?.length ?? 0

    if (count === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const ids = (toDelete ?? []).map(t => t.id)

    const { error: deleteError } = await supabase
      .from('tickets')
      .delete()
      .in('id', ids)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: 'unused_tickets_deleted',
      p_old_value: { count, tickets: toDelete },
    })

    return NextResponse.json({ success: true, count })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
