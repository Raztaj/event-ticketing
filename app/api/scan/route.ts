import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { ticket_id, user_id } = await request.json()

    if (!ticket_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing ticket_id or user_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase.rpc('check_in_ticket', {
      p_ticket_id: ticket_id,
      p_user_id: user_id,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
