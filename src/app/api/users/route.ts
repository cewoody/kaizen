import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all users with their activities
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, handicap, weekly_target_hours, strava_athlete_id, strava_client_id, strava_access_token, strava_refresh_token')

  if (usersError) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }

  // Get all activities for all users
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .order('start_date', { ascending: true })

  if (activitiesError) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }

  // Group activities by user
  const usersWithActivities = users.map((user) => ({
    ...user,
    activities: activities.filter((a) => a.user_id === user.id),
  }))

  return NextResponse.json({ users: usersWithActivities })
}
