import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const athleteId = searchParams.get('athlete_id')

  if (!athleteId) {
    return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, handicap')
    .eq('strava_athlete_id', athleteId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get activities
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: true })

  if (activitiesError) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }

  return NextResponse.json({
    user,
    activities,
  })
}
