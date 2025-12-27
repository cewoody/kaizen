'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  handicap: number
  weekly_target_hours: number
  strava_athlete_id: number | null
  strava_client_id: string | null
  strava_client_secret: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_token_expires_at: number | null
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'User updated successfully' })
        fetchUsers()
        setEditingUser(null)
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to update user' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update user' })
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async (userId: string) => {
    setSyncing(userId)
    setMessage(null)

    try {
      const response = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Synced ${data.synced} activities` })
        fetchUsers()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Sync failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Sync failed' })
    } finally {
      setSyncing(null)
    }
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted' })
        fetchUsers()
      } else {
        setMessage({ type: 'error', text: 'Failed to delete user' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete user' })
    }
  }

  const handleAuthorize = (userId: string) => {
    // Redirect to Strava OAuth with this user's client_id
    window.location.href = `/api/strava/auth?user_id=${userId}`
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600">Manage family members and their Strava credentials</p>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weekly Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Strava Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Handicap
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{user.weekly_target_hours} hrs</span>
                  <span className="text-xs text-gray-500 ml-1">({user.weekly_target_hours - 1}-{user.weekly_target_hours + 1})</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.strava_access_token ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Not Connected
                    </span>
                  )}
                  {user.strava_client_id && (
                    <span className="ml-2 text-xs text-gray-500">
                      Client: {user.strava_client_id}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.handicap}x
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {user.strava_client_id && (
                    <button
                      onClick={() => handleAuthorize(user.id)}
                      className="text-orange-600 hover:text-orange-900"
                    >
                      Authorize
                    </button>
                  )}
                  <button
                    onClick={() => handleSync(user.id)}
                    disabled={syncing === user.id || !user.strava_refresh_token}
                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing === user.id ? 'Syncing...' : 'Sync'}
                  </button>
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, user.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Edit User: {editingUser.name}</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Handicap</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingUser.handicap}
                    onChange={(e) => setEditingUser({ ...editingUser, handicap: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Weekly Target (hrs)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="20"
                    value={editingUser.weekly_target_hours}
                    onChange={(e) => setEditingUser({ ...editingUser, weekly_target_hours: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Bonus range: {(editingUser.weekly_target_hours || 7) - 1}-{(editingUser.weekly_target_hours || 7) + 1} hrs</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Strava Athlete ID</label>
                  <input
                    type="text"
                    value={editingUser.strava_athlete_id || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, strava_athlete_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Auto-populated on sync"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Strava API Credentials</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client ID</label>
                    <input
                      type="text"
                      value={editingUser.strava_client_id || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, strava_client_id: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                    <input
                      type="password"
                      value={editingUser.strava_client_secret || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, strava_client_secret: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Strava Tokens</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Access Token</label>
                    <input
                      type="text"
                      value={editingUser.strava_access_token || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, strava_access_token: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Refresh Token</label>
                    <input
                      type="text"
                      value={editingUser.strava_refresh_token || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, strava_refresh_token: e.target.value || null })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Token Expires At (Unix timestamp)</label>
                    <input
                      type="text"
                      value={editingUser.strava_token_expires_at || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, strava_token_expires_at: e.target.value ? parseInt(e.target.value) : null })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Leave empty to force refresh on next sync"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
