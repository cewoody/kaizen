import { NextRequest, NextResponse } from 'next/server'
import { getStravaAuthUrl } from '@/lib/strava'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=no_user_selected`
    )
  }

  // Look up user's Strava credentials
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: user, error } = await supabase
    .from('users')
    .select('id, strava_client_id, strava_client_secret')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=user_not_found`
    )
  }

  if (!user.strava_client_id || !user.strava_client_secret) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=missing_strava_credentials`
    )
  }

  // Encode user_id in the state parameter (along with CSRF token)
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')

  const authUrl = getStravaAuthUrl(state, user.strava_client_id)

  // Redirect to Strava authorization
  return NextResponse.redirect(authUrl)
}
