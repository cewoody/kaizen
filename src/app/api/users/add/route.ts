import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const {
      name,
      email,
      weekly_target_hours,
      strava_client_id,
      strava_client_secret,
      strava_access_token,
      strava_refresh_token
    } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Insert new user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        weekly_target_hours: weekly_target_hours || 7,
        strava_client_id: strava_client_id || null,
        strava_client_secret: strava_client_secret || null,
        strava_access_token: strava_access_token || null,
        strava_refresh_token: strava_refresh_token || null,
        handicap: 1.0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user })
  } catch (err) {
    console.error('Error in add user:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
