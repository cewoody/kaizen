import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { refreshAccessToken, mapStravaWorkoutType } from '@/lib/strava'

const STRAVA_API_URL = 'https://www.strava.com/api/v3'
const VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || 'family-fitness-comp'

// GET: Webhook verification (Strava sends this to validate the endpoint)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST: Receive webhook events
export async function POST(request: NextRequest) {
  try {
    const event = await request.json()

    console.log('Webhook event received:', JSON.stringify(event))

    const { object_type, object_id, aspect_type, owner_id } = event

    // We only care about activity events
    if (object_type !== 'activity') {
      return NextResponse.json({ received: true })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find user by strava athlete id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('strava_athlete_id', owner_id)
      .single()

    if (userError || !user) {
      console.log('User not found for athlete:', owner_id)
      return NextResponse.json({ received: true })
    }

    // Handle different event types
    if (aspect_type === 'create' || aspect_type === 'update') {
      await syncSingleActivity(supabase, user, object_id)
    } else if (aspect_type === 'delete') {
      await deleteActivity(supabase, object_id)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  }
}

async function syncSingleActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  user: { id: string; strava_access_token: string; strava_refresh_token: string; strava_token_expires_at: number; strava_client_id?: string; strava_client_secret?: string },
  activityId: number
) {
  let accessToken = user.strava_access_token

  // Check if token needs refresh
  const now = Math.floor(Date.now() / 1000)
  if (user.strava_token_expires_at < now) {
    const tokenData = await refreshAccessToken(
      user.strava_refresh_token,
      user.strava_client_id,
      user.strava_client_secret
    )
    accessToken = tokenData.access_token

    await supabase
      .from('users')
      .update({
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
      })
      .eq('id', user.id)
  }

  // Fetch activity details from Strava
  const response = await fetch(`${STRAVA_API_URL}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    console.error('Failed to fetch activity:', activityId)
    return
  }

  const activity = await response.json()

  // Upsert activity
  const { error } = await supabase.from('activities').upsert(
    {
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
    },
    { onConflict: 'strava_id' }
  )

  if (error) {
    console.error('Failed to upsert activity:', error)
  } else {
    console.log('Activity synced:', activityId)
  }
}

async function deleteActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  activityId: number
) {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('strava_id', activityId)

  if (error) {
    console.error('Failed to delete activity:', error)
  } else {
    console.log('Activity deleted:', activityId)
  }
}
