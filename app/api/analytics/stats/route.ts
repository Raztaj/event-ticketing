import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('tickets')
      .select('checked_in_at')
      .gte('checked_in_at', sevenDaysAgo.toISOString())
      .eq('status', 'checked_in')
      .order('checked_in_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const dayMap: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      dayMap[d.toISOString().slice(0, 10)] = 0
    }

    ;(data ?? []).forEach(t => {
      if (t.checked_in_at) {
        const day = t.checked_in_at.slice(0, 10)
        if (day in dayMap) dayMap[day]++
      }
    })

    const daily = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

    return NextResponse.json({ daily })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
