import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['staff_admin', 'master_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const entries: { visitor_name: string; notes?: string }[] = body.tickets

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'No tickets provided' }, { status: 400 })
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const generateCode = () => {
      let code = 'TKT-'
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
      return code
    }

    const results = { success: 0, errors: 0, items: [] as { visitor_name: string; ticket_code: string; error?: string }[] }

    for (const entry of entries) {
      const name = (entry.visitor_name || '').trim()
      if (!name) {
        results.errors++
        results.items.push({ visitor_name: '', ticket_code: '', error: 'Name is required' })
        continue
      }

      const ticketCode = generateCode()

      const { data: newTicket, error: dbError } = await supabase
        .from('tickets')
        .insert({
          ticket_code: ticketCode,
          visitor_name: name,
          notes: entry.notes || '',
          created_by: user.id,
        })
        .select('id, ticket_code, visitor_name')
        .single()

      if (dbError || !newTicket) {
        results.errors++
        results.items.push({ visitor_name: name, ticket_code: '', error: dbError?.message || 'Insert failed' })
        continue
      }

      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action_type: 'ticket_created',
        p_ticket_id: newTicket.id,
        p_visitor_name: name,
      })

      results.success++
      results.items.push({ visitor_name: name, ticket_code: newTicket.ticket_code })
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
