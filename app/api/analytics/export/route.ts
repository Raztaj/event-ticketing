import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    const [ticketsRes, logsRes, usersRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('ticket_code, visitor_name, status, notes, created_by, checked_in_by, checked_in_at, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('activity_logs')
        .select('created_at, user_id, action_type, visitor_name, ticket_id, old_value, new_value')
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('email, name, role, is_active, created_at')
        .order('created_at', { ascending: false }),
    ])

    if (ticketsRes.error) throw new Error(ticketsRes.error.message)
    if (logsRes.error) throw new Error(logsRes.error.message)
    if (usersRes.error) throw new Error(usersRes.error.message)

    const tickets = ticketsRes.data ?? []
    const logs = logsRes.data ?? []
    const users = usersRes.data ?? []

    const lines: string[] = []
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }

    lines.push('=== TICKETS ===')
    lines.push('Ticket Code,Visitor Name,Status,Notes,Created At,Checked In At')
    tickets.forEach(t => {
      lines.push([
        esc(t.ticket_code),
        esc(t.visitor_name),
        esc(t.status),
        esc(t.notes),
        esc(t.created_at),
        esc(t.checked_in_at),
      ].join(','))
    })

    lines.push('')
    lines.push('=== ACTIVITY LOGS ===')
    lines.push('Timestamp,Action Type,Visitor Name,Ticket ID,Old Value,New Value')
    logs.forEach(l => {
      lines.push([
        esc(l.created_at),
        esc(l.action_type),
        esc(l.visitor_name),
        esc(l.ticket_id),
        esc(JSON.stringify(l.old_value)),
        esc(JSON.stringify(l.new_value)),
      ].join(','))
    })

    lines.push('')
    lines.push('=== USERS ===')
    lines.push('Email,Name,Role,Active,Created At')
    users.forEach(u => {
      lines.push([
        esc(u.email),
        esc(u.name),
        esc(u.role),
        esc(u.is_active),
        esc(u.created_at),
      ].join(','))
    })

    const csv = lines.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-${Date.now()}.csv"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
