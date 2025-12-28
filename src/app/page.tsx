'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import FamilyMemberCard from '@/components/FamilyMemberCard'
import RulesDropdown from '@/components/RulesDropdown'
import CumulativeChart from '@/components/CumulativeChart'
import WeeklyHoursChart from '@/components/WeeklyHoursChart'
import WeeklyProgressCard from '@/components/WeeklyProgressCard'
import AddFamilyMemberModal from '@/components/AddFamilyMemberModal'
import PenaltyModal from '@/components/PenaltyModal'
import { createClient } from '@/lib/supabase/client'
import { Activity } from '@/types/database'
import { calculateScores } from '@/lib/scoring'

interface UserWithActivities {
  id: string
  name: string
  handicap: number
  weekly_target_hours: number
  strava_athlete_id: number | null
  strava_client_id: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  activities: Activity[]
}

// Calculate handicaps dynamically based on weekly target hours
// Person with lowest target hours gets 1.0, others are adjusted proportionally
function calculateHandicaps(users: UserWithActivities[]): Record<string, number> {
  if (users.length === 0) return {}

  const minTargetHours = Math.min(...users.map(u => u.weekly_target_hours))

  return users.reduce((acc, user) => {
    // Handicap = minTargetHours / userTargetHours
    // e.g., if min is 5hrs and user has 7hrs, handicap = 5/7 ≈ 0.714
    acc[user.id] = minTargetHours / user.weekly_target_hours
    return acc
  }, {} as Record<string, number>)
}

// Generate available years from 2025 to current year
const START_YEAR = 2025
const CURRENT_YEAR = new Date().getFullYear()
const AVAILABLE_YEARS = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => CURRENT_YEAR - i
)

export default function Home() {
  const [users, setUsers] = useState<UserWithActivities[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showPenaltyModal, setShowPenaltyModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)

  // Calculate handicaps dynamically based on all users' weekly target hours
  const handicaps = useMemo(() => calculateHandicaps(users), [users])

  // Sort users by total points (highest first)
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const handicapA = handicaps[a.id] || 1
      const handicapB = handicaps[b.id] || 1
      const scoreA = calculateScores(a.activities, handicapA, a.weekly_target_hours, selectedYear).totalScore
      const scoreB = calculateScores(b.activities, handicapB, b.weekly_target_hours, selectedYear).totalScore
      return scoreB - scoreA // Descending order
    })
  }, [users, handicaps, selectedYear])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()

    // Set up real-time subscription for activities
    const supabase = createClient()
    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
        },
        () => {
          // Refetch users when any activity changes
          fetchUsers()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchUsers])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Invisible overlay to close menu when clicking outside */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide-out menu panel */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b">
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-4 space-y-2">
          <button
            onClick={() => {
              setShowAddMemberModal(true)
              setMenuOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Family Member
          </button>
          <Link
            href="/admin"
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={() => setMenuOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </Link>
        </nav>
      </div>

      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              Family Fitness Competition
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Penalty button */}
            <button
              onClick={() => setShowPenaltyModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Log Penalty"
            >
              <svg viewBox="0 0 200 200" className="w-10 h-10" fill="none">
                <g transform="translate(75, 100)">
                  <rect x="-35" y="-50" width="60" height="80" rx="8" ry="8" fill="#d4a574" stroke="#b8956c" strokeWidth="2"/>
                  <rect x="-30" y="-45" width="50" height="70" rx="5" ry="5" fill="none" stroke="#c49a6c" strokeWidth="1.5" strokeDasharray="5 3"/>
                  <circle cx="-15" cy="-30" r="4" fill="#c49a6c"/>
                  <circle cx="5" cy="-30" r="4" fill="#c49a6c"/>
                  <circle cx="-5" cy="-15" r="4" fill="#c49a6c"/>
                  <circle cx="-20" cy="-10" r="4" fill="#c49a6c"/>
                  <circle cx="10" cy="-10" r="4" fill="#c49a6c"/>
                </g>
                <g transform="translate(115, 105)">
                  <path d="M -28 -40 Q -32 0 0 15 Q 32 0 28 -40" fill="none" stroke="#9ca3af" strokeWidth="3"/>
                  <path d="M -26 -30 Q -30 0 0 12 Q 30 0 26 -30 Z" fill="#7c1d4d"/>
                  <ellipse cx="0" cy="-30" rx="26" ry="8" fill="#9d174d"/>
                  <ellipse cx="0" cy="-40" rx="28" ry="9" fill="none" stroke="#9ca3af" strokeWidth="3"/>
                  <line x1="0" y1="15" x2="0" y2="45" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round"/>
                  <ellipse cx="0" cy="48" rx="20" ry="6" fill="none" stroke="#9ca3af" strokeWidth="3"/>
                </g>
                <circle cx="100" cy="100" r="85" fill="none" stroke="#dc2626" strokeWidth="8"/>
                <line x1="40" y1="160" x2="160" y2="40" stroke="#dc2626" strokeWidth="8" strokeLinecap="round"/>
              </svg>
            </button>
            <RulesDropdown />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {users.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="mb-4">No family members added yet.</p>
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="text-blue-600 hover:underline"
            >
              Add a family member to get started
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Welcome message */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">Welcome back, Catherine.</h2>
            </div>

            {/* Weekly progress for logged-in user (Catherine) */}
            {users.find(u => u.name === 'Catherine W') && (
              <WeeklyProgressCard
                activities={users.find(u => u.name === 'Catherine W')!.activities}
                weeklyTargetHours={users.find(u => u.name === 'Catherine W')!.weekly_target_hours}
                userName="Catherine"
              />
            )}

            {/* Year filter */}
            <div className="flex justify-start">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {AVAILABLE_YEARS.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedYear === year
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Stats - sorted by points */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Weekly Stats
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedUsers.map((user) => (
                  <FamilyMemberCard
                    key={user.id}
                    name={user.name}
                    activities={user.activities}
                    handicap={handicaps[user.id] || 1}
                    weeklyTargetHours={user.weekly_target_hours}
                    userId={user.id}
                    athleteId={user.strava_athlete_id}
                    hasCredentials={!!user.strava_client_id && !!user.strava_refresh_token}
                    onSync={fetchUsers}
                    selectedYear={selectedYear}
                  />
                ))}
              </div>
            </section>

            {/* Weekly Hours Charts - Side by Side */}
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedUsers.map((user) => (
                  <div key={user.id} className="rounded-lg bg-white p-6 shadow">
                    <WeeklyHoursChart
                      activities={user.activities}
                      userName={user.name}
                      weeklyTargetHours={user.weekly_target_hours}
                      selectedYear={selectedYear}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Cumulative chart */}
            <section className="rounded-lg bg-white p-6 shadow">
              <CumulativeChart
                users={sortedUsers.map((u) => ({
                  name: u.name,
                  activities: u.activities,
                  handicap: handicaps[u.id] || 1,
                  weeklyTargetHours: u.weekly_target_hours,
                }))}
                selectedYear={selectedYear}
              />
            </section>
          </div>
        )}
      </main>

      <AddFamilyMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onSuccess={() => {
          fetchUsers()
        }}
      />

      <PenaltyModal
        isOpen={showPenaltyModal}
        onClose={() => setShowPenaltyModal(false)}
        onSuccess={() => {
          fetchUsers()
        }}
        users={users.map(u => ({ id: u.id, name: u.name }))}
        currentUserId={users.find(u => u.name === 'Catherine W')?.id || ''}
      />
    </div>
  )
}
