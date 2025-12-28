import { Activity, WeeklyScore } from '@/types/database'
import { parseISO, startOfWeek, format } from 'date-fns'

const POINTS = {
  PER_HOUR: 1,
  REDUCED_PER_HOUR: 0.5,  // Golf, Ski, BackcountrySki
  BONUS_MULTIPLIER: 1.25, // Hours above 25% bonus threshold count as 1.25x
  RACE: 10,
  GOLF_TOURNAMENT: 5,
  POPTART_PENALTY: -0.5,  // Per poptart (includes small bag of chips)
  WINE_PENALTY: -0.25,    // Per glass
}

const REDUCED_RATE_ACTIVITIES = ['golf', 'alpineski', 'backcountryski']

export function calculateScores(
  activities: Activity[],
  handicap: number,
  weeklyTargetHours: number,  // User's target hours
  selectedYear: number = new Date().getFullYear(),  // Year to filter by
  poptartCount: number = 0,   // Total poptarts (to be tracked later)
  wineGlasses: number = 0     // Total wine glasses (to be tracked later)
): { weeklyScores: WeeklyScore[]; totalScore: number; poptartPenalty: number; winePenalty: number } {
  // Filter to selected year only
  const activitiesForYear = activities.filter(
    (a) => parseISO(a.start_date).getFullYear() === selectedYear
  )

  // Group by week
  const weeklyActivities: Record<string, Activity[]> = {}

  activitiesForYear.forEach((activity) => {
    const date = parseISO(activity.start_date)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weeklyActivities[weekKey]) {
      weeklyActivities[weekKey] = []
    }
    weeklyActivities[weekKey].push(activity)
  })

  // Calculate scores per week
  const bonusThreshold = weeklyTargetHours * 1.25  // 25% above target

  const weeklyScores: WeeklyScore[] = Object.entries(weeklyActivities)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weekActivities]) => {
      // Calculate adjusted hours (with sport multipliers: golf/ski at 0.5x)
      let adjustedHours = 0

      weekActivities.forEach((activity) => {
        const hours = activity.moving_time_seconds / 3600
        const activityType = activity.type.toLowerCase()
        const isReducedRate = REDUCED_RATE_ACTIVITIES.includes(activityType)

        if (activity.workout_type === 'training' || !activity.workout_type) {
          if (isReducedRate) {
            adjustedHours += hours * POINTS.REDUCED_PER_HOUR
          } else {
            adjustedHours += hours * POINTS.PER_HOUR
          }
        }
      })

      // Calculate bonus points for hours above threshold
      // Hours above 25% bonus line count as 1.25x (so 0.25 extra per hour)
      let bonusPoints = 0
      if (adjustedHours > bonusThreshold) {
        const bonusHours = adjustedHours - bonusThreshold
        bonusPoints = bonusHours * (POINTS.BONUS_MULTIPLIER - 1)
      }
      const trainingPoints = adjustedHours + bonusPoints

      // Race points (run + bike on same local day = triathlon, counts as 1 race)
      const raceActivities = weekActivities.filter(
        (a) => a.workout_type === 'race'
      )
      const racesByDay: Record<string, Activity[]> = {}
      raceActivities.forEach((race) => {
        const dayKey = format(parseISO(race.start_date_local), 'yyyy-MM-dd')
        if (!racesByDay[dayKey]) {
          racesByDay[dayKey] = []
        }
        racesByDay[dayKey].push(race)
      })

      let racePoints = 0
      Object.values(racesByDay).forEach((dayRaces) => {
        const types = dayRaces.map((r) => r.type.toLowerCase())
        const hasRun = types.some((t) => t === 'run')
        const hasBike = types.some((t) => t === 'ride')

        if (hasRun && hasBike) {
          // Triathlon - counts as 1 race
          racePoints += POINTS.RACE
        } else {
          // Individual races
          racePoints += dayRaces.length * POINTS.RACE
        }
      })

      // Golf tournament points
      const golfTournaments = weekActivities.filter(
        (a) => a.workout_type === 'golf_tournament'
      )
      const golfTournamentPoints = golfTournaments.length * POINTS.GOLF_TOURNAMENT

      // Apply handicap to training points (base + bonus)
      const adjustedBasePoints = adjustedHours * handicap
      const adjustedBonusPoints = bonusPoints * handicap

      // Penalties will be tracked per-user, not per-week for now
      const totalPoints =
        adjustedBasePoints +
        adjustedBonusPoints +
        racePoints +
        golfTournamentPoints

      return {
        weekStart,
        trainingPoints: Number(adjustedBasePoints.toFixed(1)),
        bonusPoints: Number(adjustedBonusPoints.toFixed(2)),
        racePoints,
        golfTournamentPoints,
        poptartPenalty: 0,  // To be tracked later
        winePenalty: 0,     // To be tracked later
        totalPoints: Number(totalPoints.toFixed(1)),
      }
    })

  // Calculate total penalties (applied to overall score, not weekly)
  const poptartPenalty = poptartCount * POINTS.POPTART_PENALTY
  const winePenalty = wineGlasses * POINTS.WINE_PENALTY

  // Sum up all weekly scores plus penalties
  const weeklyTotal = weeklyScores.reduce((sum, w) => sum + w.totalPoints, 0)
  const totalScore = Number((weeklyTotal + poptartPenalty + winePenalty).toFixed(1))

  return { weeklyScores, totalScore, poptartPenalty, winePenalty }
}
