import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await supabaseServer()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { currentMajorId, targetMajorId } = await req.json()

  if (!currentMajorId || !targetMajorId || currentMajorId === targetMajorId) {
    return NextResponse.json({ error: 'Invalid majors' }, { status: 400 })
  }

  // Insert triggers find_match() automatically via the DB trigger
  const { data, error } = await supabase
    .from('exchange_requests')
    .insert({
      user_id: user.id,
      current_major_id: currentMajorId,
      target_major_id: targetMajorId,
    })
    .select()
    .single()

  if (error) {
    // unique index violation = user already has a pending request
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have a pending request' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ request: data })
}

export async function GET() {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: requests, error } = await supabase
    .from('exchange_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ request: requests?.[0] ?? null })
}