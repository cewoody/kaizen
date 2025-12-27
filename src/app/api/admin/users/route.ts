import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  return NextResponse.json({ users })
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        email: updates.email,
        handicap: updates.handicap,
        weekly_target_hours: updates.weekly_target_hours,
        strava_athlete_id: updates.strava_athlete_id,
        strava_client_id: updates.strava_client_id,
        strava_client_secret: updates.strava_client_secret,
        strava_access_token: updates.strava_access_token,
        strava_refresh_token: updates.strava_refresh_token,
        strava_token_expires_at: updates.strava_token_expires_at,
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error in update user:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Delete user's activities first (due to foreign key)
  await supabase.from('activities').delete().eq('user_id', id)

  const { error } = await supabase.from('users').delete().eq('id', id)

  if (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
