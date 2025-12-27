'use client'

import { useState, useMemo } from 'react'

function getCurrentQuarter(): { quarter: string; year: number } {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return { quarter: `Q${quarter}`, year }
}

export default function SettingsPage() {
  const [appClientId] = useState(process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || '')
  const { quarter, year } = useMemo(() => getCurrentQuarter(), [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Application configuration</p>
      </div>

      <div className="space-y-6">
        {/* App Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Application Info</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">App Name</dt>
              <dd className="text-sm text-gray-900">Family Fitness Competition</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Environment</dt>
              <dd className="text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Development
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Strava Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Strava Configuration</h2>
          <p className="text-sm text-gray-500 mb-4">
            Each user now has their own Strava API credentials. The app-level credentials below are used as fallback.
          </p>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Default Client ID (from .env)</dt>
              <dd className="text-sm text-gray-900 font-mono">
                {appClientId || 'Not configured'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">OAuth Callback URL</dt>
              <dd className="text-sm text-gray-900 font-mono">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/strava/callback` : '/api/strava/callback'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Scoring Rules */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Scoring Rules</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Training:</strong> 1 point per hour (0.5 for golf/ski)</p>
            <p><strong>25% Bonus:</strong> Hours above 125% of target count as 1.25x</p>
            <p><strong>Races:</strong> +10 points per race</p>
            <p><strong>Golf Tournaments:</strong> +5 points each</p>
            <p><strong>Penalties:</strong> -0.5 per poptart/chips, -0.25 per glass of wine</p>
          </div>
        </div>

        {/* Database */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Database</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Provider</dt>
              <dd className="text-sm text-gray-900">Supabase (PostgreSQL)</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Quarterly Handicap Review */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Quarterly Handicap Review</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Coming Soon
            </span>
          </div>
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700">
              Current: {quarter} {year}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Review and adjust weekly target hours for participants who may have
              underestimated their initial commitments.
            </p>
            <p className="text-amber-600 font-medium">
              Note: Weekly target hours can only be increased, not decreased.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
