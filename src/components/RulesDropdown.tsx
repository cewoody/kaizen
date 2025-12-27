'use client'

import { useState } from 'react'

export default function RulesDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
      >
        <span>Rules</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-20 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Scoring Rules</h3>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-green-600 mb-1">Points Earned</p>
                <ul className="space-y-1 text-gray-600">
                  <li className="flex justify-between">
                    <span>Training</span>
                    <span className="font-medium">+1 pt/hr</span>
                  </li>
                  <li className="pl-3 text-xs text-gray-500 italic">
                    Golf/Ski: 0.5 pt/hr
                  </li>
                  <li className="pl-3 text-xs text-gray-500 italic">
                    Handicap multiplier applies
                  </li>
                  <li className="flex justify-between">
                    <span>25% Bonus Zone</span>
                    <span className="font-medium">1.25x</span>
                  </li>
                  <li className="pl-3 text-xs text-gray-500 italic">
                    Hours above 125% of target count as 1.25x
                  </li>
                  <li className="flex justify-between">
                    <span>Races</span>
                    <span className="font-medium">+10 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Golf Tournament</span>
                    <span className="font-medium">+5 pts</span>
                  </li>
                </ul>
              </div>

              <div className="border-t pt-3">
                <p className="font-medium text-red-600 mb-1">Penalties</p>
                <ul className="space-y-1 text-gray-600">
                  <li className="flex justify-between">
                    <span>Poptart / Chips</span>
                    <span className="font-medium">-0.5 pts</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Wine (per glass)</span>
                    <span className="font-medium">-0.25 pts</span>
                  </li>
                </ul>
              </div>

              <div className="border-t pt-3">
                <p className="font-medium text-blue-600 mb-1">Notes</p>
                <ul className="space-y-1 text-gray-600 text-xs">
                  <li>• Run + Bike race same day = Triathlon</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
