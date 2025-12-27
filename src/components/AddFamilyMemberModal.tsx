'use client'

import { useState } from 'react'

interface AddFamilyMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddFamilyMemberModal({
  isOpen,
  onClose,
  onSuccess,
}: AddFamilyMemberModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(7)
  const [stravaClientId, setStravaClientId] = useState('')
  const [stravaClientSecret, setStravaClientSecret] = useState('')
  const [stravaAccessToken, setStravaAccessToken] = useState('')
  const [stravaRefreshToken, setStravaRefreshToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          weekly_target_hours: weeklyTargetHours,
          strava_client_id: stravaClientId || null,
          strava_client_secret: stravaClientSecret || null,
          strava_access_token: stravaAccessToken || null,
          strava_refresh_token: stravaRefreshToken || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add family member')
      }

      // Reset form and close
      setName('')
      setEmail('')
      setWeeklyTargetHours(7)
      setStravaClientId('')
      setStravaClientSecret('')
      setStravaAccessToken('')
      setStravaRefreshToken('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Family Member
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Weekly Target Hours *
            </label>
            <input
              type="number"
              required
              min="1"
              max="20"
              value={weeklyTargetHours}
              onChange={(e) => setWeeklyTargetHours(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Bonus range: {weeklyTargetHours - 1}-{weeklyTargetHours + 1} hrs/week
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm text-gray-500">
              Strava API Credentials (from strava.com/settings/api)
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Client ID
                </label>
                <input
                  type="text"
                  value={stravaClientId}
                  onChange={(e) => setStravaClientId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={stravaClientSecret}
                  onChange={(e) => setStravaClientSecret(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your client secret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Token
                </label>
                <input
                  type="text"
                  value={stravaAccessToken}
                  onChange={(e) => setStravaAccessToken(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your access token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Refresh Token
                </label>
                <input
                  type="text"
                  value={stravaRefreshToken}
                  onChange={(e) => setStravaRefreshToken(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Your refresh token"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
