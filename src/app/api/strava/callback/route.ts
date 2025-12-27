import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/strava'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=${error}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=no_code`
    )
  }

  try {
    // Decode state to get user_id
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const userId = stateData.userId

    if (!userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=invalid_state`
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's Strava credentials
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, strava_client_id, strava_client_secret')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=user_not_found`
      )
    }

    // Exchange code for tokens using user's credentials
    const tokenData = await exchangeCodeForTokens(
      code,
      user.strava_client_id,
      user.strava_client_secret
    )

    const athlete = tokenData.athlete

    // Update user with Strava tokens
    const { error: updateError } = await supabase
      .from('users')
      .update({
        strava_athlete_id: athlete.id,
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_token_expires_at: tokenData.expires_at,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?error=database_error`
      )
    }

    // Redirect to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?connected=true&user_id=${userId}`
    )
  } catch (err) {
    console.error('Error in Strava callback:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=token_exchange_failed`
    )
  }
}
