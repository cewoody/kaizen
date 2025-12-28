'use client'

import { useMemo } from 'react'
import { parseISO, startOfWeek, format, getDay } from 'date-fns'
import { Activity } from '@/types/database'

interface WeeklyProgressCardProps {
  activities: Activity[]
  weeklyTargetHours: number
  userName: string
}

const REDUCED_RATE_ACTIVITIES = ['golf', 'alpineski', 'backcountryski']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyProgressCard({ activities, weeklyTargetHours, userName }: WeeklyProgressCardProps) {
  const weekData = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const currentDayIndex = getDay(now) === 0 ? 6 : getDay(now) - 1

    const currentYear = now.getFullYear()
    const activitiesThisYear = activities.filter(
      (a) => parseISO(a.start_date).getFullYear() === currentYear
    )

    // Filter to current week (only training activities)
    const thisWeekActivities = activitiesThisYear.filter((a) => {
      if (a.workout_type === 'race' || a.workout_type === 'golf_tournament') return false
      const activityWeekStart = startOfWeek(parseISO(a.start_date), { weekStartsOn: 1 })
      return format(activityWeekStart, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')
    })

    // Group by day of week
    const dailyActivities: { hours: number; adjustedHours: number; count: number; names: string[] }[] =
      Array(7).fill(null).map(() => ({ hours: 0, adjustedHours: 0, count: 0, names: [] }))

    thisWeekActivities.forEach((activity) => {
      const date = parseISO(activity.start_date_local)
      let dayIndex = getDay(date) - 1
      if (dayIndex < 0) dayIndex = 6

      const hours = activity.moving_time_seconds / 3600
      const isReduced = REDUCED_RATE_ACTIVITIES.includes(activity.type.toLowerCase())

      dailyActivities[dayIndex].hours += hours
      dailyActivities[dayIndex].adjustedHours += isReduced ? hours * 0.5 : hours
      dailyActivities[dayIndex].count += 1
      dailyActivities[dayIndex].names.push(activity.name)
    })

    // Calculate totals
    const totalAdjustedHours = dailyActivities.reduce((sum, d) => sum + d.adjustedHours, 0)
    const totalRawHours = dailyActivities.reduce((sum, d) => sum + d.hours, 0)
    const totalWorkouts = dailyActivities.reduce((sum, d) => sum + d.count, 0)

    // Calculate remaining needed
    const hoursRemaining = Math.max(0, weeklyTargetHours - totalAdjustedHours)
    const daysRemaining = 6 - currentDayIndex // Days left including today if not done
    const progressPercent = Math.min(100, (totalAdjustedHours / weeklyTargetHours) * 100)

    // Determine status message
    let statusMessage = ''
    let statusType: 'success' | 'warning' | 'info' = 'info'

    if (totalAdjustedHours >= weeklyTargetHours * 1.25) {
      statusMessage = "You're crushing it! 25% bonus earned!"
      statusType = 'success'
    } else if (totalAdjustedHours >= weeklyTargetHours) {
      statusMessage = "Goal reached! Keep going for the 25% bonus."
      statusType = 'success'
    } else if (daysRemaining === 0 && hoursRemaining > 0) {
      statusMessage = `${formatHours(hoursRemaining)} to go today to hit your goal.`
      statusType = 'warning'
    } else if (hoursRemaining > 0) {
      const avgNeeded = hoursRemaining / Math.max(1, daysRemaining + 1)
      statusMessage = `${formatHours(hoursRemaining)} to go. ~${formatHours(avgNeeded)}/day to stay on track.`
      statusType = 'info'
    }

    return {
      dailyActivities,
      totalAdjustedHours,
      totalRawHours,
      totalWorkouts,
      hoursRemaining,
      progressPercent,
      statusMessage,
      statusType,
      currentDayIndex,
      weekStart,
    }
  }, [activities, weeklyTargetHours])

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">This Week</h3>
        <span className="text-sm text-gray-500">
          Week of {format(weekData.weekStart, 'MMM d')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">
            {formatHours(weekData.totalAdjustedHours)} / {weeklyTargetHours} hrs
          </span>
          <span className="text-gray-500">{Math.round(weekData.progressPercent)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              weekData.progressPercent >= 125
                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                : weekData.progressPercent >= 100
                ? 'bg-green-500'
                : weekData.progressPercent >= 70
                ? 'bg-blue-500'
                : 'bg-blue-400'
            }`}
            style={{ width: `${Math.min(100, weekData.progressPercent)}%` }}
          />
        </div>
        {weekData.progressPercent >= 100 && (
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((weekData.progressPercent - 100) / 25) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Status message */}
      <div className={`mb-4 p-3 rounded-lg text-sm ${
        weekData.statusType === 'success'
          ? 'bg-green-50 text-green-700'
          : weekData.statusType === 'warning'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-blue-50 text-blue-700'
      }`}>
        {weekData.statusMessage}
      </div>

      {/* Daily breakdown */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((day, index) => {
          const dayData = weekData.dailyActivities[index]
          const isToday = index === weekData.currentDayIndex
          const isPast = index < weekData.currentDayIndex
          const hasActivity = dayData.count > 0

          return (
            <div
              key={day}
              className={`text-center p-2 rounded-lg ${
                isToday
                  ? 'bg-blue-100 ring-2 ring-blue-500'
                  : hasActivity
                  ? 'bg-green-100'
                  : isPast
                  ? 'bg-gray-100'
                  : 'bg-gray-50'
              }`}
              title={hasActivity ? dayData.names.join(', ') : undefined}
            >
              <div className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-600'}`}>
                {day}
              </div>
              {hasActivity ? (
                <div className="text-sm font-semibold text-green-600 mt-1">
                  {formatHours(dayData.adjustedHours)}
                </div>
              ) : isPast ? (
                <div className="text-sm text-gray-400 mt-1">-</div>
              ) : (
                <div className="text-sm text-gray-300 mt-1">·</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-600">
        <span>{weekData.totalWorkouts} workout{weekData.totalWorkouts !== 1 ? 's' : ''}</span>
        {weekData.totalRawHours !== weekData.totalAdjustedHours && (
          <span className="text-gray-400">
            ({formatHours(weekData.totalRawHours)} raw)
          </span>
        )}
      </div>
    </div>
  )
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
