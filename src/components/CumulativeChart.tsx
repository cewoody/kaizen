'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import { parseISO, startOfWeek, format, eachWeekOfInterval, startOfYear } from 'date-fns'
import { Activity } from '@/types/database'
import { calculateScores } from '@/lib/scoring'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface UserData {
  name: string
  activities: Activity[]
  handicap: number
  weeklyTargetHours: number
}

interface CumulativeChartProps {
  users: UserData[]
  selectedYear: number
}

const COLORS = [
  { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' },   // blue
  { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },     // red
  { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },     // green
  { bg: 'rgba(168, 85, 247, 0.7)', border: 'rgb(168, 85, 247)' },   // purple
  { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgb(249, 115, 22)' },   // orange
]

export default function CumulativeChart({ users, selectedYear }: CumulativeChartProps) {
  const chartData = useMemo(() => {
    // Get all weeks from start of selected year to end of year (or now if current year)
    const yearStart = startOfYear(new Date(selectedYear, 0, 1))
    const now = new Date()
    const currentYear = now.getFullYear()
    const endDate = selectedYear < currentYear
      ? new Date(selectedYear, 11, 31) // Dec 31 of selected year
      : now
    const weeks = eachWeekOfInterval(
      { start: yearStart, end: endDate },
      { weekStartsOn: 1 }
    )

    const datasets = users.map((user, userIndex) => {
      const { weeklyScores } = calculateScores(user.activities, user.handicap, user.weeklyTargetHours, selectedYear)

      // Build cumulative points per week
      let cumulative = 0
      const points: { x: number; y: number }[] = []

      weeks.forEach((weekStart, weekIndex) => {
        const weekKey = format(weekStart, 'yyyy-MM-dd')
        const weekScore = weeklyScores.find((w) => w.weekStart === weekKey)

        if (weekScore) {
          cumulative += weekScore.totalPoints * user.handicap
        }

        points.push({ x: weekIndex, y: Number(cumulative.toFixed(1)) })
      })

      const color = COLORS[userIndex % COLORS.length]

      return {
        label: user.name,
        data: points,
        backgroundColor: color.bg,
        borderColor: color.border,
        showLine: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.1,
      }
    })

    return {
      datasets,
      weekLabels: weeks.map((w) => format(w, 'MMM d')),
    }
  }, [users, selectedYear])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Cumulative Points Over Time',
        font: {
          size: 18,
        },
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y} pts`
          },
        },
      },
      datalabels: {
        display: false,
      },
    },
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Week',
        },
        ticks: {
          callback: function(value: number | string) {
            const idx = typeof value === 'number' ? value : parseInt(value)
            return chartData.weekLabels[idx] || ''
          },
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Points',
        },
      },
    },
  }

  return (
    <div className="h-96">
      <Scatter data={chartData} options={options} />
    </div>
  )
}
