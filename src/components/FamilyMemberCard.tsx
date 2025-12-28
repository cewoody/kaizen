'use client'

import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import annotationPlugin from 'chartjs-plugin-annotation'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import Link from 'next/link'
import { Activity } from '@/types/database'
import { calculateScores } from '@/lib/scoring'
import { parseISO, startOfWeek, format, getDay } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, annotationPlugin, ChartDataLabels)

interface FamilyMemberCardProps {
  name: string
  activities: Activity[]
  handicap: number
  weeklyTargetHours: number
  userId: string
  athleteId?: number | null
  hasCredentials?: boolean
  onSync?: () => void
  selectedYear: number
}

// Chinese zodiac mappings
const ZODIAC_DATA: Record<string, { emoji: string; element: string; animal: string; year: number; elementColor: string }> = {
  'Lee': { emoji: '🐰', element: 'Water', animal: 'Rabbit', year: 1963, elementColor: 'bg-blue-100 text-blue-700' },
  'Catherine': { emoji: '🐀', element: 'Fire', animal: 'Rat', year: 1996, elementColor: 'bg-red-100 text-red-700' },
}

export default function FamilyMemberCard({
  name,
  activities,
  handicap,
  weeklyTargetHours,
  userId,
  athleteId,
  hasCredentials,
  onSync,
  selectedYear
}: FamilyMemberCardProps) {
  const zodiac = ZODIAC_DATA[name]
  const [syncing, setSyncing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSyncing(true)
    try {
      const response = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (response.ok) {
        onSync?.()
      } else {
        const data = await response.json()
        console.error('Sync failed:', data.error)
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }
  const { totalScore, weeklyScores, poptartPenalty, winePenalty } = useMemo(
    () => calculateScores(activities, handicap, weeklyTargetHours, selectedYear),
    [activities, handicap, weeklyTargetHours, selectedYear]
  )

  // Calculate totals for selected year with point breakdown
  const stats = useMemo(() => {
    const activitiesForYear = activities.filter(
      (a) => parseISO(a.start_date).getFullYear() === selectedYear
    )

    const REDUCED_RATE_ACTIVITIES = ['golf', 'alpineski', 'backcountryski']

    // Calculate training hours by sport (excluding races) - matching scoring.ts logic
    const hoursBySport: Record<string, { hours: number; isReduced: boolean }> = {}

    activitiesForYear.forEach((a) => {
      if (a.workout_type === 'training' || !a.workout_type) {
        const hours = a.moving_time_seconds / 3600
        const sport = a.type
        const isReduced = REDUCED_RATE_ACTIVITIES.includes(a.type.toLowerCase())

        if (!hoursBySport[sport]) {
          hoursBySport[sport] = { hours: 0, isReduced }
        }
        hoursBySport[sport].hours += hours
      }
    })

    // Sort sports by hours descending
    const sportBreakdown = Object.entries(hoursBySport)
      .map(([sport, data]) => ({
        sport,
        hours: Number(data.hours.toFixed(1)),
        rate: data.isReduced ? 0.5 : 1,
        points: Number((data.hours * (data.isReduced ? 0.5 : 1) * handicap).toFixed(1)),
      }))
      .sort((a, b) => b.hours - a.hours)

    const totalTrainingHours = sportBreakdown.reduce((sum, s) => sum + s.hours, 0)

    // Calculate points from weeklyScores (these are already handicap-adjusted for training)
    const trainingPoints = weeklyScores.reduce((sum, w) => sum + w.trainingPoints, 0)
    const bonusPoints = weeklyScores.reduce((sum, w) => sum + w.bonusPoints, 0)
    const racePoints = weeklyScores.reduce((sum, w) => sum + w.racePoints, 0)
    const golfTournamentPoints = weeklyScores.reduce((sum, w) => sum + w.golfTournamentPoints, 0)
    const competitionPoints = racePoints + golfTournamentPoints

    // Races (unique days for triathlon detection)
    const raceCount = weeklyScores.reduce((sum, w) => sum + (w.racePoints / 10), 0)
    const golfTournamentCount = weeklyScores.reduce((sum, w) => sum + (w.golfTournamentPoints / 5), 0)

    // Count weeks with bonus
    const weeksWithBonus = weeklyScores.filter((w) => w.bonusPoints > 0).length

    return {
      sportBreakdown,
      totalTrainingHours: Number(totalTrainingHours.toFixed(1)),
      trainingPoints: Number(trainingPoints.toFixed(1)),
      bonusPoints: Number(bonusPoints.toFixed(2)),
      weeksWithBonus,
      competitionPoints,
      racePoints,
      golfTournamentPoints,
      raceCount,
      golfTournamentCount,
    }
  }, [activities, handicap, weeklyScores, selectedYear])

  // Get current week's cumulative data for scatter plot (adjusted and unadjusted)
  // Only shown for the current year
  const currentYear = new Date().getFullYear()
  const isCurrentYear = selectedYear === currentYear

  const weeklyScatterData = useMemo(() => {
    if (!isCurrentYear) {
      return { adjustedPoints: [], rawPoints: [], currentAdjusted: 0, currentRaw: 0 }
    }

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const currentDayIndex = getDay(now) === 0 ? 6 : getDay(now) - 1 // 0=Mon, 6=Sun

    const REDUCED_RATE_ACTIVITIES = ['golf', 'alpineski', 'backcountryski']

    const activitiesForYear = activities.filter(
      (a) => parseISO(a.start_date).getFullYear() === selectedYear
    )

    // Filter to current week (only training activities)
    const thisWeekActivities = activitiesForYear.filter((a) => {
      if (a.workout_type === 'race' || a.workout_type === 'golf_tournament') return false
      const activityWeekStart = startOfWeek(parseISO(a.start_date), { weekStartsOn: 1 })
      return format(activityWeekStart, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd')
    })

    // Group by day of week - both adjusted and raw hours
    const dailyAdjustedHours: number[] = [0, 0, 0, 0, 0, 0, 0]
    const dailyRawHours: number[] = [0, 0, 0, 0, 0, 0, 0]

    thisWeekActivities.forEach((activity) => {
      const date = parseISO(activity.start_date_local)
      let dayIndex = getDay(date) - 1
      if (dayIndex < 0) dayIndex = 6

      const hours = activity.moving_time_seconds / 3600
      const isReduced = REDUCED_RATE_ACTIVITIES.includes(activity.type.toLowerCase())

      dailyRawHours[dayIndex] += hours
      dailyAdjustedHours[dayIndex] += isReduced ? hours * 0.5 : hours
    })

    // Build cumulative points for both lines
    let cumulativeAdjusted = 0
    let cumulativeRaw = 0
    const adjustedPoints: { x: number; y: number }[] = []
    const rawPoints: { x: number; y: number }[] = []

    for (let i = 0; i <= currentDayIndex; i++) {
      cumulativeAdjusted += dailyAdjustedHours[i]
      cumulativeRaw += dailyRawHours[i]
      adjustedPoints.push({ x: i, y: Number(cumulativeAdjusted.toFixed(2)) })
      rawPoints.push({ x: i, y: Number(cumulativeRaw.toFixed(2)) })
    }

    return { adjustedPoints, rawPoints, currentAdjusted: cumulativeAdjusted, currentRaw: cumulativeRaw }
  }, [activities, selectedYear, isCurrentYear])

  const chartData = {
    datasets: [
      // Raw hours (grey reference line - behind)
      {
        label: 'Raw Hours',
        data: weeklyScatterData.rawPoints,
        backgroundColor: 'rgba(156, 163, 175, 0.4)',
        borderColor: 'rgba(156, 163, 175, 0.6)',
        showLine: true,
        pointRadius: 2,
        tension: 0,
        borderDash: [4, 4],
        datalabels: { display: false },
      },
      // Adjusted hours (main blue line - in front)
      {
        label: 'Adjusted Hours',
        data: weeklyScatterData.adjustedPoints,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        showLine: true,
        pointRadius: 3,
        tension: 0,
        datalabels: {
          display: (context: { dataIndex: number }) =>
            context.dataIndex === weeklyScatterData.adjustedPoints.length - 1,
          align: 'top' as const,
          anchor: 'end' as const,
          offset: 4,
          backgroundColor: 'rgb(59, 130, 246)',
          borderRadius: 3,
          color: 'white',
          font: { size: 10, weight: 'bold' as const },
          padding: { top: 2, bottom: 2, left: 4, right: 4 },
          formatter: () => `${weeklyScatterData.currentAdjusted.toFixed(1)}`,
        },
      },
    ],
  }

  // Calculate y-axis max: 40% above target or current hours, whichever is higher, rounded to nearest 1
  const yAxisMax = Math.round(Math.max(weeklyTargetHours, weeklyScatterData.currentRaw) * 1.4)

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 20, right: 10, left: 30 },
    },
    plugins: {
      legend: { display: false },
      annotation: {
        annotations: {
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
              yAdjust: 0,
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
      x: {
        type: 'linear' as const,
        min: 0,
        max: 6,
        ticks: {
          stepSize: 1,
          callback: (value: number | string) => {
            const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
            const idx = typeof value === 'number' ? value : parseInt(value)
            return days[idx] || ''
          },
        },
      },
      y: {
        beginAtZero: true,
        max: yAxisMax,
        title: { display: false },
      },
    },
  }

  return (
    <Link href={athleteId ? `/?athlete_id=${athleteId}` : '#'} className="block rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow cursor-pointer">
      {/* Header with name and total points */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {zodiac ? (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl ${zodiac.elementColor}`}>
              {zodiac.emoji}
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 font-medium text-sm">{name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              {handicap !== 1.0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Handicap: {(handicap * 100).toFixed(0)}%
                </span>
              )}
              {hasCredentials ? (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="rounded p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  title="Sync from Strava"
                >
                  <svg
                    className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              ) : (
                <span className="text-xs text-gray-400">(no credentials)</span>
              )}
            </div>
            {zodiac && (
              <p className="text-xs text-gray-500">{zodiac.element} {zodiac.animal} ({zodiac.year})</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blue-600">{totalScore}</p>
          <p className="text-xs text-gray-500">total pts</p>
        </div>
      </div>

      {/* Score breakdown table */}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1 text-gray-500 font-medium">Category</th>
            <th className="text-right py-1 text-gray-500 font-medium">Count</th>
            <th className="text-right py-1 text-gray-500 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {/* Training Hours */}
          <tr
            className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
            onClick={toggleSection('training')}
          >
            <td className="py-1 font-medium text-gray-800">
              <span className="inline-block w-4 text-gray-400">{expandedSections.training ? '▼' : '▶'}</span>
              Training Hours
            </td>
            <td className="text-right text-gray-600">{stats.totalTrainingHours} hrs</td>
            <td className="text-right font-semibold text-gray-800">{stats.trainingPoints}</td>
          </tr>
          {expandedSections.training && stats.sportBreakdown.map((sport) => (
            <tr key={sport.sport} className="text-gray-400 text-xs bg-gray-50">
              <td className="py-0.5 pl-6">{sport.sport} {sport.rate === 0.5 && '(0.5x)'}</td>
              <td className="text-right">{sport.hours} hrs</td>
              <td className="text-right">{sport.points}</td>
            </tr>
          ))}

          {/* Bonus for exceeding 25% above target */}
          {stats.bonusPoints > 0 && (
            <tr className="border-b border-gray-100">
              <td className="py-1 font-medium text-green-600">
                <span className="inline-block w-4"></span>
                +25% Bonus
              </td>
              <td className="text-right text-gray-600">{stats.weeksWithBonus} wks</td>
              <td className="text-right font-semibold text-green-600">+{stats.bonusPoints}</td>
            </tr>
          )}

          {/* Competition */}
          <tr
            className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
            onClick={toggleSection('competition')}
          >
            <td className="py-1 font-medium text-purple-700">
              <span className="inline-block w-4 text-gray-400">{expandedSections.competition ? '▼' : '▶'}</span>
              Competition
            </td>
            <td className="text-right text-gray-600">{stats.raceCount + stats.golfTournamentCount}</td>
            <td className="text-right font-semibold text-purple-700">{stats.competitionPoints}</td>
          </tr>
          {expandedSections.competition && (
            <>
              {stats.raceCount > 0 && (
                <tr className="text-gray-400 text-xs bg-gray-50">
                  <td className="py-0.5 pl-6">Races × 10 pts</td>
                  <td className="text-right">{stats.raceCount}</td>
                  <td className="text-right">{stats.racePoints}</td>
                </tr>
              )}
              {stats.golfTournamentCount > 0 && (
                <tr className="text-gray-400 text-xs bg-gray-50">
                  <td className="py-0.5 pl-6">Golf Tournaments × 5 pts</td>
                  <td className="text-right">{stats.golfTournamentCount}</td>
                  <td className="text-right">{stats.golfTournamentPoints}</td>
                </tr>
              )}
              {stats.raceCount === 0 && stats.golfTournamentCount === 0 && (
                <tr className="text-gray-400 text-xs bg-gray-50">
                  <td className="py-0.5 pl-6">No competitions yet</td>
                  <td className="text-right"></td>
                  <td className="text-right"></td>
                </tr>
              )}
            </>
          )}

          {/* Penalties */}
          {(poptartPenalty < 0 || winePenalty < 0) && (
            <>
              <tr
                className="border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={toggleSection('penalties')}
              >
                <td className="py-1 font-medium text-red-600">
                  <span className="inline-block w-4 text-gray-400">{expandedSections.penalties ? '▼' : '▶'}</span>
                  Penalties
                </td>
                <td className="text-right text-gray-600"></td>
                <td className="text-right font-semibold text-red-600">{(poptartPenalty + winePenalty).toFixed(1)}</td>
              </tr>
              {expandedSections.penalties && (
                <>
                  {poptartPenalty < 0 && (
                    <tr className="text-gray-400 text-xs bg-gray-50">
                      <td className="py-0.5 pl-6">Poptarts/Chips × -0.5 pts</td>
                      <td className="text-right">{Math.abs(poptartPenalty / 0.5)}</td>
                      <td className="text-right">{poptartPenalty.toFixed(1)}</td>
                    </tr>
                  )}
                  {winePenalty < 0 && (
                    <tr className="text-gray-400 text-xs bg-gray-50">
                      <td className="py-0.5 pl-6">Wine × -0.25 pts/glass</td>
                      <td className="text-right">{Math.abs(winePenalty / 0.25)}</td>
                      <td className="text-right">{winePenalty.toFixed(2)}</td>
                    </tr>
                  )}
                </>
              )}
            </>
          )}

        </tbody>
      </table>

      {/* Weekly cumulative scatter chart */}
      <div>
        <p className="text-xs text-gray-500 mb-1">
          This week: {weeklyScatterData.currentAdjusted.toFixed(1)} adj hrs
          {weeklyScatterData.currentRaw !== weeklyScatterData.currentAdjusted && (
            <span className="text-gray-400"> ({weeklyScatterData.currentRaw.toFixed(1)} raw)</span>
          )}
        </p>
        <div className="h-24">
          <Scatter data={chartData} options={chartOptions} />
        </div>
      </div>
    </Link>
  )
}
