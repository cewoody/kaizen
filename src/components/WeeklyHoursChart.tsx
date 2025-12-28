'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar } from 'react-chartjs-2'
import { startOfWeek, format, parseISO } from 'date-fns'
import { Activity } from '@/types/database'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler, annotationPlugin, ChartDataLabels)

interface WeeklyHoursChartProps {
  activities: Activity[]
  userName: string
  weeklyTargetHours?: number
  selectedYear: number
}

// Chinese zodiac mappings
const ZODIAC_DATA: Record<string, { emoji: string; element: string; animal: string; year: number; elementColor: string }> = {
  'Lee': { emoji: '🐰', element: 'Water', animal: 'Rabbit', year: 1963, elementColor: 'bg-blue-100 text-blue-700' },
  'Catherine': { emoji: '🐀', element: 'Fire', animal: 'Rat', year: 1996, elementColor: 'bg-red-100 text-red-700' },
}

export default function WeeklyHoursChart({ activities, userName, weeklyTargetHours = 7, selectedYear }: WeeklyHoursChartProps) {
  const zodiac = ZODIAC_DATA[userName]
  const REDUCED_RATE_ACTIVITIES = ['golf', 'alpineski', 'backcountryski']

  interface WeekActivity {
    name: string
    movingTime: number // in seconds
    adjustedHours: number
    type: string
  }

  const weeklyData = useMemo(() => {
    // Filter to 2025 only and group by week using LOCAL time
    const weeklyRawHours: Record<string, number> = {}
    const weeklyAdjustedHours: Record<string, number> = {}
    const weeklyRaces: Record<string, { dates: Set<string> }> = {}
    const weeklyActivities: Record<string, WeekActivity[]> = {}

    const activitiesForYear = activities.filter((activity) =>
      parseISO(activity.start_date_local).getFullYear() === selectedYear
    )

    // Find the date range (first activity to now) using LOCAL time
    if (activitiesForYear.length === 0) {
      return { labels: [], rawData: [], adjustedData: [], extraData: [], racePoints: [], activitiesByWeek: [] }
    }

    const sortedByDate = [...activitiesForYear].sort((a, b) =>
      parseISO(a.start_date_local).getTime() - parseISO(b.start_date_local).getTime()
    )
    const firstActivityDate = parseISO(sortedByDate[0].start_date_local)
    const firstWeekStart = startOfWeek(firstActivityDate, { weekStartsOn: 1 })
    const now = new Date()
    const currentYear = now.getFullYear()

    // For current year, use current week. For past years, use end of that year
    const endDate = selectedYear < currentYear
      ? new Date(selectedYear, 11, 31) // Dec 31 of selected year
      : now
    const lastWeekStart = startOfWeek(endDate, { weekStartsOn: 1 })

    // Generate all weeks from first activity to end date
    const allWeeks: string[] = []
    let weekCursor = firstWeekStart
    while (weekCursor <= lastWeekStart) {
      allWeeks.push(format(weekCursor, 'yyyy-MM-dd'))
      weekCursor = new Date(weekCursor.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    // Initialize all weeks with zero
    allWeeks.forEach((weekKey) => {
      weeklyRawHours[weekKey] = 0
      weeklyAdjustedHours[weekKey] = 0
      weeklyRaces[weekKey] = { dates: new Set() }
      weeklyActivities[weekKey] = []
    })

    activitiesForYear
      .filter((activity) => activity.workout_type === 'training' || !activity.workout_type)
      .forEach((activity) => {
        // Use LOCAL time for week calculation
        const localDate = parseISO(activity.start_date_local)
        const weekStart = startOfWeek(localDate, { weekStartsOn: 1 }) // Monday
        const weekKey = format(weekStart, 'yyyy-MM-dd')

        // Only add if week exists in our range
        if (weeklyRawHours[weekKey] !== undefined) {
          // Convert seconds to hours
          const hours = activity.moving_time_seconds / 3600
          const isReduced = REDUCED_RATE_ACTIVITIES.includes(activity.type.toLowerCase())
          const adjustedHours = isReduced ? hours * 0.5 : hours

          weeklyRawHours[weekKey] += hours
          weeklyAdjustedHours[weekKey] += adjustedHours

          // Store activity details for tooltip
          weeklyActivities[weekKey].push({
            name: activity.name,
            movingTime: activity.moving_time_seconds,
            adjustedHours,
            type: activity.type,
          })
        }
      })

    // Track race dates separately using LOCAL time
    activitiesForYear
      .filter((activity) => activity.workout_type === 'race')
      .forEach((activity) => {
        const localDate = parseISO(activity.start_date_local)
        const weekStart = startOfWeek(localDate, { weekStartsOn: 1 })
        const weekKey = format(weekStart, 'yyyy-MM-dd')

        if (weeklyRaces[weekKey]) {
          const raceDate = format(localDate, 'yyyy-MM-dd')
          weeklyRaces[weekKey].dates.add(raceDate)
        }
      })

    // Prepare chart data
    const labels = allWeeks.map((week) => format(parseISO(week), 'MMM d'))
    const rawData = allWeeks.map((week) => Number(weeklyRawHours[week].toFixed(2)))
    const adjustedData = allWeeks.map((week) => Number(weeklyAdjustedHours[week].toFixed(2)))
    // Extra hours = raw - adjusted (the "discount" from golf/ski)
    const extraData = allWeeks.map((week) =>
      Number((weeklyRawHours[week] - weeklyAdjustedHours[week]).toFixed(2))
    )
    const racePoints = allWeeks.map((week) => weeklyRaces[week]?.dates.size * 10 || 0)
    const activitiesByWeek = allWeeks.map((week) => weeklyActivities[week] || [])

    return { labels, rawData, adjustedData, extraData, racePoints, activitiesByWeek }
  }, [activities, selectedYear])

  // Calculate y-axis max: 10% buffer above tallest bar OR 10% above bonus line, whichever is higher
  // Round up to nearest 5
  const bonusLine = weeklyTargetHours * 1.25
  const maxRawHours = Math.max(...weeklyData.rawData, 0)
  const yAxisMax = Math.ceil((Math.max(maxRawHours, bonusLine) * 1.1) / 5) * 5

  const chartData = {
    labels: weeklyData.labels,
    datasets: [
      // Adjusted hours (colored based on target)
      {
        label: 'Adjusted Hours',
        data: weeklyData.adjustedData,
        backgroundColor: weeklyData.adjustedData.map((hours) => {
          const exceeds25Percent = hours >= weeklyTargetHours * 1.25
          if (exceeds25Percent) {
            return 'rgba(74, 222, 128, 0.8)' // lighter bright green - 25%+ above goal
          }
          if (hours >= weeklyTargetHours) {
            return 'rgba(34, 197, 94, 0.7)' // green - meets goal
          }
          return 'rgba(59, 130, 246, 0.7)' // blue - below goal
        }),
        borderColor: weeklyData.adjustedData.map((hours) => {
          const exceeds25Percent = hours >= weeklyTargetHours * 1.25
          if (exceeds25Percent) {
            return 'rgb(22, 163, 74)' // green border - 25%+ above
          }
          if (hours >= weeklyTargetHours) {
            return 'rgb(34, 197, 94)' // green border - meets goal
          }
          return 'rgb(59, 130, 246)' // blue border - below
        }),
        borderWidth: weeklyData.adjustedData.map((hours) =>
          hours >= weeklyTargetHours * 1.25 ? 3 : 1
        ),
        stack: 'stack1',
        datalabels: {
          display: false,
        },
      },
      // Extra raw hours (light grey, stacked on top)
      {
        label: 'Raw Hours Difference',
        data: weeklyData.extraData,
        backgroundColor: 'rgba(209, 213, 219, 0.6)', // light grey
        borderColor: 'rgba(156, 163, 175, 0.8)',
        borderWidth: 1,
        stack: 'stack1',
        datalabels: {
          anchor: 'end' as const,
          align: 'top' as const,
          formatter: (_value: number, context: { dataIndex: number }) => {
            const pts = weeklyData.racePoints[context.dataIndex]
            return pts > 0 ? '🏆' : ''
          },
          font: {
            size: 16,
          },
        },
      },
    ],
  }

  // Helper to format hours (decimal) to h:mm
  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  // Helper to format seconds to h:mm
  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context: { dataIndex: number }[]) => {
            const idx = context[0]?.dataIndex
            if (idx === undefined) return ''
            return `Week of ${weeklyData.labels[idx]}`
          },
          beforeBody: (context: { dataIndex: number }[]) => {
            const idx = context[0]?.dataIndex
            if (idx === undefined) return []
            const weekActivities = weeklyData.activitiesByWeek[idx] || []
            if (weekActivities.length === 0) return ['No activities']

            const lines: string[] = ['']
            weekActivities.forEach((act) => {
              const timeStr = formatSeconds(act.movingTime)
              const adjStr = formatHours(act.adjustedHours)
              lines.push(`${act.name}`)
              lines.push(`  ${timeStr} → ${adjStr} adj`)
            })
            return lines
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return `Adjusted: ${formatHours(context.parsed.y)}`
            } else {
              return `Raw difference: +${formatHours(context.parsed.y)}`
            }
          },
          footer: (context: { dataIndex: number }[]) => {
            const idx = context[0]?.dataIndex
            if (idx === undefined) return ''
            const adjusted = weeklyData.adjustedData[idx]
            const raw = weeklyData.rawData[idx]
            return `Total: ${formatHours(adjusted)} adj / ${formatHours(raw)} raw`
          },
        },
      },
      annotation: {
        annotations: {
          exceeds25Zone: {
            type: 'box' as const,
            yMin: weeklyTargetHours * 1.25,
            yMax: yAxisMax,
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            borderWidth: 0,
          },
          exceeds25Line: {
            type: 'line' as const,
            yMin: weeklyTargetHours * 1.25,
            yMax: weeklyTargetHours * 1.25,
            borderColor: 'rgba(22, 163, 74, 0.6)',
            borderWidth: 1,
            borderDash: [3, 3],
            label: {
              display: true,
              content: `+25%`,
              position: 'end' as const,
              backgroundColor: 'rgba(22, 163, 74, 0.7)',
              color: 'white',
              font: { size: 9 },
              padding: 2,
            },
          },
          targetLine: {
            type: 'line' as const,
            yMin: weeklyTargetHours,
            yMax: weeklyTargetHours,
            borderColor: 'rgba(34, 197, 94, 0.8)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `${weeklyTargetHours} hrs`,
              position: 'start' as const,
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              color: 'white',
              font: { size: 10 },
              padding: 3,
            },
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: yAxisMax,
        stacked: true,
        title: {
          display: true,
          text: 'Hours',
        },
        grid: {
          drawOnChartArea: true,
        },
        border: {
          display: false,
        },
      },
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Week Starting',
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
      },
    },
  }

  const activitiesFiltered = activities.filter(
    (activity) => parseISO(activity.start_date).getFullYear() === selectedYear
  )
  // Group races by local date to detect triathlons (run + bike on same day)
  const raceActivities = activitiesFiltered.filter((activity) => activity.workout_type === 'race')
  const racesByDate: Record<string, typeof raceActivities> = {}

  raceActivities.forEach((race) => {
    const localDate = format(parseISO(race.start_date_local), 'yyyy-MM-dd')
    if (!racesByDate[localDate]) {
      racesByDate[localDate] = []
    }
    racesByDate[localDate].push(race)
  })

  // Build display list - combine run+bike on same day into triathlon
  const races = Object.entries(racesByDate).map(([date, dayRaces]) => {
    const types = dayRaces.map((r) => r.type.toLowerCase())
    const hasRun = types.some((t) => t === 'run')
    const hasBike = types.some((t) => t === 'ride')

    if (hasRun && hasBike) {
      // Triathlon detected
      return {
        id: `tri-${date}`,
        name: 'Triathlon',
        start_date: dayRaces[0].start_date,
        type: 'Triathlon',
        isTriathlon: true,
        activities: dayRaces,
      }
    }

    // Return individual races
    return dayRaces.map((r) => ({ ...r, isTriathlon: false, activities: [] as typeof dayRaces }))
  }).flat()

  const totalAdjustedHours = weeklyData.adjustedData.reduce((sum, hours) => sum + hours, 0)
  const totalRawHours = weeklyData.rawData.reduce((sum, hours) => sum + hours, 0)
  const avgAdjustedPerWeek = weeklyData.adjustedData.length > 0
    ? totalAdjustedHours / weeklyData.adjustedData.length
    : 0
  const avgRawPerWeek = weeklyData.rawData.length > 0
    ? totalRawHours / weeklyData.rawData.length
    : 0
  const weeksMetGoal = weeklyData.adjustedData.filter((hours) => hours >= weeklyTargetHours).length
  const totalWeeks = weeklyData.adjustedData.length

  // Format for display
  const formatHoursDisplay = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}:${m.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full">
      {/* Header with zodiac and name */}
      <div className="flex items-center gap-3 mb-4">
        {zodiac ? (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl ${zodiac.elementColor}`}>
            {zodiac.emoji}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 font-medium text-sm">{userName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{userName}&apos;s Weekly Adjusted Hours</h3>
          {zodiac && (
            <p className="text-xs text-gray-500">{zodiac.element} {zodiac.animal} ({zodiac.year})</p>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-blue-50 p-2 text-center">
          <p className="text-xs text-gray-600">Adjusted</p>
          <p className="text-lg font-bold text-blue-600">{formatHoursDisplay(totalAdjustedHours)}</p>
          <p className="text-xs text-gray-400">({formatHoursDisplay(totalRawHours)} raw)</p>
        </div>
        <div className="rounded-lg bg-green-50 p-2 text-center">
          <p className="text-xs text-gray-600">Avg/Week</p>
          <p className="text-lg font-bold text-green-600">{formatHoursDisplay(avgAdjustedPerWeek)}</p>
          <p className="text-xs text-gray-400">({formatHoursDisplay(avgRawPerWeek)} raw)</p>
        </div>
        <div className="rounded-lg bg-purple-50 p-2 text-center">
          <p className="text-xs text-gray-600">Workouts</p>
          <p className="text-lg font-bold text-purple-600">{activitiesFiltered.length}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-2 text-center">
          <p className="text-xs text-gray-600">Weeks Met Goal</p>
          <p className="text-lg font-bold text-orange-600">{weeksMetGoal}/{totalWeeks}</p>
        </div>
      </div>
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>

      {races.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🏆 Races (+10 pts each)</h3>
          <div className="space-y-2">
            {races.map((race) => (
              <div
                key={race.id}
                className="rounded-lg bg-purple-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{race.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(race.start_date), 'MMM d, yyyy')} · {race.type}
                    </p>
                  </div>
                  <span className="text-purple-600 font-bold">+10 pts</span>
                </div>
                {race.isTriathlon && race.activities.length > 0 && (
                  <div className="mt-2 pl-3 border-l-2 border-purple-200">
                    {race.activities.map((activity) => (
                      <p key={activity.id} className="text-sm text-gray-600">
                        {activity.name} ({activity.type})
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
