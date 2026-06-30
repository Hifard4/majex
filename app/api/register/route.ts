import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { email, phone, password, fullName } = await req.json()

  if (!email || !phone || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Create the auth user
  const { data: userData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation; adjust if you want verification
  })

  if (authError || !userData.user) {
    return NextResponse.json({ error: authError?.message || 'Could not create user' }, { status: 400 })
  }

  // Create the profile row
  const { error: profileError } = await admin.from('profiles').insert({
    id: userData.user.id,
    email,
    phone,
    full_name: fullName ?? null,
  })

  if (profileError) {
    // rollback the auth user if profile creation fails
    await admin.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}