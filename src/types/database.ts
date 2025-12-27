export interface User {
  id: string
  email: string
  name: string
  strava_athlete_id: number | null
  strava_client_id: string | null
  strava_client_secret: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_token_expires_at: number | null
  handicap: number
  weekly_target_hours: number  // Target hours per week, bonus range is +/- 1 hour
  created_at: string
}

export interface Activity {
  id: string
  user_id: string
  strava_id: number
  name: string
  type: string
  workout_type: 'training' | 'race' | 'golf_tournament'
  description: string | null
  moving_time_seconds: number
  elapsed_time_seconds: number
  start_date: string
  start_date_local: string
  timezone: string | null
  suffer_score: number | null
  created_at: string
}

export interface WeeklyScore {
  weekStart: string
  trainingPoints: number      // Base training points (1 pt/hr, 0.5 for golf/ski)
  bonusPoints: number         // Extra points from hours above 25% threshold (0.25x per hour)
  racePoints: number
  golfTournamentPoints: number
  poptartPenalty: number      // -0.5 per poptart (includes small bag of chips)
  winePenalty: number         // -0.25 per glass
  totalPoints: number
}
