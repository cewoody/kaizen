import { NextRequest, NextResponse } from 'next/server'
import { getAthleteActivities, refreshAccessToken, StravaActivity, mapStravaWorkoutType } from '@/lib/strava'
import { createClient } from '@supabase/supabase-js'
import { subYears } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const { user_id, athlete_id } = await request.json()

    if (!user_id && !athlete_id) {
      return NextResponse.json({ error: 'user_id or athlete_id required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user from database (by user_id or athlete_id for backwards compatibility)
    let query = supabase.from('users').select('*')
    if (user_id) {
      query = query.eq('id', user_id)
    } else {
      query = query.eq('strava_athlete_id', athlete_id)
    }

    const { data: user, error: userError } = await query.single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.strava_refresh_token) {
      return NextResponse.json({ error: 'No Strava refresh token configured' }, { status: 400 })
    }

    if (!user.strava_client_id || !user.strava_client_secret) {
      return NextResponse.json({ error: 'Missing Strava client credentials' }, { status: 400 })
    }

    // Always refresh the token using per-user credentials to ensure we have a valid token
    console.log(`Refreshing token for user ${user.id} with client_id ${user.strava_client_id}`)
    const tokenData = await refreshAccessToken(
      user.strava_refresh_token,
      user.strava_client_id,
      user.strava_client_secret
    )
    const accessToken = tokenData.access_token

    // Update tokens in database
    await supabase
      .from('users')
      .update({
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
        strava_athlete_id: tokenData.athlete?.id || user.strava_athlete_id,
      })
      .eq('id', user.id)

    console.log(`Token refreshed successfully, fetching activities...`)

    // Fetch activities from the past year
    const oneYearAgo = subYears(new Date(), 1)
    const afterTimestamp = Math.floor(oneYearAgo.getTime() / 1000)

    let allActivities: StravaActivity[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const activities = await getAthleteActivities(
        accessToken,
        afterTimestamp,
        undefined,
        page,
        100
      )

      if (activities.length === 0) {
        hasMore = false
      } else {
        allActivities = [...allActivities, ...activities]
        page++

        // Safety limit
        if (page > 20) hasMore = false
      }
    }

    // Log races for debugging
    const races = allActivities.filter((a) => a.workout_type === 1 || a.workout_type === 11)
    console.log(`Found ${races.length} races:`, races.map((r) => ({ name: r.name, workout_type: r.workout_type })))

    // Upsert activities into database
    const activitiesToInsert = allActivities.map((activity: StravaActivity) => ({
      user_id: user.id,
      strava_id: activity.id,
      name: activity.name,
      type: activity.type || activity.sport_type,
      workout_type: mapStravaWorkoutType(activity.workout_type, activity.type || activity.sport_type),
      description: activity.description,
      moving_time_seconds: activity.moving_time,
      elapsed_time_seconds: activity.elapsed_time,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      timezone: activity.timezone,
      suffer_score: activity.suffer_score,
    }))

    if (activitiesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('activities')
        .upsert(activitiesToInsert, {
          onConflict: 'strava_id',
        })

      if (insertError) {
        console.error('Error inserting activities:', insertError)
        return NextResponse.json({ error: 'Failed to save activities' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      synced: activitiesToInsert.length,
    })
  } catch (err) {
    console.error('Error syncing activities:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
