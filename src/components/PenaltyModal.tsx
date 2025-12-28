'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, getDay } from 'date-fns'

interface User {
  id: string
  name: string
}

interface PenaltyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  users: User[]
  currentUserId: string
}

export default function PenaltyModal({
  isOpen,
  onClose,
  onSuccess,
  users,
  currentUserId,
}: PenaltyModalProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentUserId)
  const [penaltyType, setPenaltyType] = useState<'poptart' | 'wine'>('poptart')
  const [quantity, setQuantity] = useState(1)
  const [penaltyDate, setPenaltyDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(currentUserId)
      setPenaltyType('poptart')
      setQuantity(1)
      setPenaltyDate(format(new Date(), 'yyyy-MM-dd'))
      setError(null)
    }
  }, [isOpen, currentUserId])

  // Handle ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Check if selected date is valid (Sun-Thu)
  const isValidDay = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const day = getDay(date)
    // Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4
    return day >= 0 && day <= 4
  }

  const handleDateChange = (dateStr: string) => {
    setPenaltyDate(dateStr)
    if (!isValidDay(dateStr)) {
      setError('Balance is key -- enjoy your treat!')
    } else {
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (!isValidDay(penaltyDate)) {
      setError('Balance is key -- enjoy your treat!')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          penalty_type: penaltyType,
          quantity,
          penalty_date: penaltyDate,
          logged_by_user_id: currentUserId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to log penalty')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log penalty')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
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
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Log Penalty</h2>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Person selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Who?
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Penalty type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Penalty Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPenaltyType('poptart')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  penaltyType === 'poptart'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🍪</div>
                <div className="text-sm font-medium">Poptart/Chips</div>
                <div className="text-xs text-gray-500">-0.5 pts</div>
              </button>
              <button
                type="button"
                onClick={() => setPenaltyType('wine')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                  penaltyType === 'wine'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">🍷</div>
                <div className="text-sm font-medium">Wine</div>
                <div className="text-xs text-gray-500">-0.25 pts/glass</div>
              </button>
            </div>
          </div>

          {/* Quantity selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-2xl font-semibold w-12 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(q => Math.min(10, q + 1))}
                disabled={quantity >= 10}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={penaltyDate}
              onChange={(e) => handleDateChange(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Penalties apply Sunday through Thursday only
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={loading || !isValidDay(penaltyDate)}
            className="w-full py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Logging...' : 'Log Penalty'}
          </button>
        </div>
      </div>
    </div>
  )
}
