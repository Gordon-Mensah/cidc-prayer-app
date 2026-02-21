'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import APP_CONFIG, { getPageTitle } from '@/lib/config'

interface Announcement {
  id: string
  title: string
  description: string
  category: string
  flyer_url: string | null
  event_date: string | null
  created_at: string
  priority: number
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = [
    'All',
    'General',
    'Events',
    'Services',
    'Ministry',
    'Youth',
    'Worship',
    'Community',
    'Urgent'
  ]

  useEffect(() => {
    document.title = getPageTitle('Announcements')
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error loading announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAnnouncements = selectedCategory === 'All'
    ? announcements
    : announcements.filter(a => a.category === selectedCategory)

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'General': 'bg-blue-100 text-blue-800 border-blue-200',
      'Events': 'bg-purple-100 text-purple-800 border-purple-200',
      'Services': 'bg-green-100 text-green-800 border-green-200',
      'Ministry': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Youth': 'bg-pink-100 text-pink-800 border-pink-200',
      'Worship': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Community': 'bg-orange-100 text-orange-800 border-orange-200',
      'Urgent': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mb-4"></div>
          <p className="text-slate-600">Loading announcements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif font-bold text-slate-800 mb-4">
            Church Announcements
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Stay updated with the latest news and events from {APP_CONFIG.churchName}
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                selectedCategory === category
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-2 border-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Announcements Grid */}
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border-2 border-slate-200">
            <svg className="w-20 h-20 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-600 text-lg">No announcements available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnnouncements.map(announcement => (
              <div
                key={announcement.id}
                className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all"
              >
                {/* Flyer Image */}
                {announcement.flyer_url && (
                  <div className="relative h-64 bg-slate-100">
                    <img
                      src={announcement.flyer_url}
                      alt={announcement.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className={`inline-block px-3 py-1 rounded border text-xs font-semibold uppercase tracking-wide ${getCategoryColor(announcement.category)}`}>
                      {announcement.category}
                    </span>
                    {announcement.priority > 0 && (
                      <span className="inline-block px-3 py-1 rounded border bg-red-50 text-red-800 border-red-200 text-xs font-semibold uppercase tracking-wide">
                        Important
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight">
                    {announcement.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                    {announcement.description}
                  </p>

                  {/* Event Date */}
                  {announcement.event_date && (
                    <div className="flex items-start gap-2 text-sm text-slate-500">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="leading-tight">{formatDate(announcement.event_date)}</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t-2 border-slate-100">
                  <p className="text-xs text-slate-500">
                    Posted {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="inline-block px-8 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  )
}