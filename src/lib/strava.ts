const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_URL = 'https://www.strava.com/api/v3'

export function getStravaAuthUrl(
  state: string,
  clientId?: string
): string {
  const params = new URLSearchParams({
    client_id: clientId || process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback`,
    response_type: 'code',
    scope: 'read,activity:read_all',
    approval_prompt: 'force',
    state,
  })

  return `${STRAVA_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(
  code: string,
  clientId?: string,
  clientSecret?: string
) {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId || process.env.STRAVA_CLIENT_ID,
      client_secret: clientSecret || process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token exchange failed:', response.status, errorText)
    throw new Error(`Failed to exchange code for tokens: ${errorText}`)
  }

  return response.json()
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId?: string,
  clientSecret?: string
) {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId || process.env.STRAVA_CLIENT_ID,
      client_secret: clientSecret || process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Strava token refresh failed:', response.status, errorText)
    throw new Error(`Failed to refresh access token: ${response.status} ${errorText}`)
  }

  return response.json()
}

export async function getAthleteActivities(
  accessToken: string,
  after?: number,
  before?: number,
  page: number = 1,
  perPage: number = 100
) {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  })

  if (after) params.set('after', after.toString())
  if (before) params.set('before', before.toString())

  const response = await fetch(
    `${STRAVA_API_URL}/athlete/activities?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Strava activities fetch failed:', response.status, errorText)
    throw new Error(`Failed to fetch activities: ${response.status} ${errorText}`)
  }

  return response.json()
}

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  description: string | null
  start_date: string
  start_date_local: string
  timezone: string
  moving_time: number
  elapsed_time: number
  distance: number
  suffer_score: number | null
  workout_type: number | null  // Strava's numeric workout type
}

// Map Strava's numeric workout_type to our string type
export function mapStravaWorkoutType(
  stravaWorkoutType: number | null,
  activityType: string
): 'training' | 'race' | 'golf_tournament' {
  // Race values: 1 (run), 11 (ride)
  if (stravaWorkoutType === 1 || stravaWorkoutType === 11) {
    return 'race'
  }

  // Golf detection (Strava doesn't have golf races, so we check manually)
  // This would need manual tagging for tournaments

  return 'training'
}
