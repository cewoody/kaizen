'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import FamilyMemberCard from '@/components/FamilyMemberCard'
import RulesDropdown from '@/components/RulesDropdown'
import CumulativeChart from '@/components/CumulativeChart'
import WeeklyHoursChart from '@/components/WeeklyHoursChart'
import AddFamilyMemberModal from '@/components/AddFamilyMemberModal'
import { createClient } from '@/lib/supabase/client'
import { Activity } from '@/types/database'

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

export default function Home() {
  const [users, setUsers] = useState<UserWithActivities[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
          <RulesDropdown />
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
            {/* Family member cards */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Family Members
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map((user) => (
                  <FamilyMemberCard
                    key={user.id}
                    name={user.name}
                    activities={user.activities}
                    handicap={user.handicap}
                    weeklyTargetHours={user.weekly_target_hours}
                    userId={user.id}
                    athleteId={user.strava_athlete_id}
                    hasCredentials={!!user.strava_client_id && !!user.strava_refresh_token}
                    onSync={fetchUsers}
                  />
                ))}
              </div>
            </section>

            {/* Weekly Hours Charts - Side by Side */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Weekly Training Hours
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map((user) => (
                  <div key={user.id} className="rounded-lg bg-white p-6 shadow">
                    <WeeklyHoursChart
                      activities={user.activities}
                      userName={user.name}
                      weeklyTargetHours={user.weekly_target_hours}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Cumulative chart */}
            <section className="rounded-lg bg-white p-6 shadow">
              <CumulativeChart
                users={users.map((u) => ({
                  name: u.name,
                  activities: u.activities,
                  handicap: u.handicap,
                  weeklyTargetHours: u.weekly_target_hours,
                }))}
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
    </div>
  )
}
