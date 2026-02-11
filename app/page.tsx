'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PrayerRequestForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Healing & Health',
    privacyLevel: 'public',
    requesterName: '',
    requesterPhone: '',
    requesterEmail: '',
    timeline: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestedVerse, setSuggestedVerse] = useState('')
  const [loadingVerse, setLoadingVerse] = useState(false)

  const categories = [
    'Healing & Health',
    'Family & Relationships',
    'Financial Provision',
    'Guidance & Decisions',
    'Salvation & Faith',
    'Grief & Loss',
    'Anxiety & Mental Health',
    'Ministry & Calling',
    'Thanksgiving & Praise',
    'Other'
  ]

  const handleGetVerseHelp = async () => {
    if (!formData.description || formData.description.length < 10) {
      alert('Please write your prayer request first')
      return
    }

    setLoadingVerse(true)
    try {
      const response = await fetch('/api/ai/verse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prayerRequest: formData.description,
          category: formData.category
        })
      })

      const data = await response.json()
      setSuggestedVerse(data.verse)
    } catch (error) {
      console.error('Error getting verse:', error)
    } finally {
      setLoadingVerse(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Extract timeline using AI
      let timelineDays = null
      if (formData.timeline) {
        try {
          const timelineResponse = await fetch('/api/ai/timeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: formData.timeline })
          })
          const timelineData = await timelineResponse.json()
          timelineDays = timelineData.days
        } catch (error) {
          console.error('Timeline extraction failed:', error)
        }
      }

      const { data, error } = await supabase
        .from('prayer_requests')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            privacy_level: formData.privacyLevel,
            requester_name: formData.privacyLevel === 'anonymous' ? null : formData.requesterName,
            requester_phone: formData.requesterPhone,
            requester_email: formData.requesterEmail,
            timeline: formData.timeline || null,
            timeline_days: timelineDays
          }
        ])

      if (error) throw error

      setSubmitted(true)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'Healing & Health',
        privacyLevel: 'public',
        requesterName: '',
        requesterPhone: '',
        requesterEmail: '',
        timeline: ''
      })
      setSuggestedVerse('')
    } catch (error) {
      console.error('Error submitting prayer request:', error)
      alert('Error submitting request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🙏</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Prayer Request Submitted!
          </h1>
          <p className="text-gray-600 mb-6">
            Our prayer warriors have been notified and will begin praying for you. 
            You'll receive updates via {formData.requesterPhone ? 'text' : 'email'}.
          </p>
          {suggestedVerse && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
              <p className="text-sm font-semibold text-blue-800 mb-2">📖 A verse for you:</p>
              <p className="text-blue-900 italic text-sm">{suggestedVerse}</p>
            </div>
          )}
          <button
            onClick={() => setSubmitted(false)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🙏 Prayer Request</h1>
          <p className="text-gray-600">Share your prayer need with our church family</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
          {/* Privacy Level */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Privacy Level
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={formData.privacyLevel === 'public'}
                  onChange={(e) => setFormData({...formData, privacyLevel: e.target.value})}
                  className="mr-2"
                />
                <span className="text-gray-700">Public to Staff</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="anonymous"
                  checked={formData.privacyLevel === 'anonymous'}
                  onChange={(e) => setFormData({...formData, privacyLevel: e.target.value})}
                  className="mr-2"
                />
                <span className="text-gray-700">Anonymous (staff won't see your name)</span>
              </label>
            </div>
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title (Short Summary)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Surgery Recovery"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Full Details)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Share your prayer need in detail..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
            />
            
            {/* AI Verse Suggestion Button */}
            <button
              type="button"
              onClick={handleGetVerseHelp}
              disabled={loadingVerse}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              {loadingVerse ? (
                <>⏳ Finding a verse for you...</>
              ) : (
                <>✨ Get an encouraging Bible verse</>
              )}
            </button>

            {/* Show suggested verse */}
            {suggestedVerse && (
              <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 mb-1">📖 Suggested verse:</p>
                <p className="text-blue-900 italic text-sm">{suggestedVerse}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Timeline (Optional)
            </label>
            <input
              type="text"
              value={formData.timeline}
              onChange={(e) => setFormData({...formData, timeline: e.target.value})}
              placeholder="e.g., Surgery on Friday, Exam in 3 days"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">
              ✨ AI will automatically calculate the deadline for you
            </p>
          </div>

          {/* Requester Info */}
          {formData.privacyLevel === 'public' && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={formData.requesterName}
                onChange={(e) => setFormData({...formData, requesterName: e.target.value})}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                required={formData.privacyLevel === 'public'}
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contact (for updates)
            </label>
            <input
              type="tel"
              value={formData.requesterPhone}
              onChange={(e) => setFormData({...formData, requesterPhone: e.target.value})}
              placeholder="Phone number"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white mb-3"
            />
            <input
              type="email"
              value={formData.requesterEmail}
              onChange={(e) => setFormData({...formData, requesterEmail: e.target.value})}
              placeholder="Email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Prayer Request'}
          </button>
        </form>
      </div>
    </div>
  )
}