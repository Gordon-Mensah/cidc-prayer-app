'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import APP_CONFIG, { getChurchName, getPageTitle } from '@/lib/config'

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

export default function HomePage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set page title dynamically
    document.title = getPageTitle()
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
        .limit(6)

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error loading announcements:', error)
    } finally {
      setLoading(false)
    }
  }

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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - UPDATED WITH CONFIG */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 leading-tight">
              Welcome to {getChurchName.short()}
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-slate-200 leading-relaxed">
              {APP_CONFIG.churchTagline}
            </p>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <a
                href="/login"
                className="flex-1 bg-white text-slate-800 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl"
              >
                Staff Login
              </a>
              <a
                href="/request"
                className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Submit Prayer Request
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-slate-800 mb-4">
            Church Announcements
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Stay informed about upcoming events, services, and important updates from our church community
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mb-4"></div>
            <p className="text-slate-600">Loading announcements...</p>
          </div>
        ) : announcements.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {announcements.map(announcement => (
                <div
                  key={announcement.id}
                  className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all"
                >
                  {/* Flyer Image */}
                  {announcement.flyer_url && (
                    <div className="relative h-56 bg-slate-100 border-b-2 border-slate-200">
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
                    <div className="mb-4 flex items-center gap-2 flex-wrap">
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
                    <h3 className="text-xl font-bold text-slate-800 mb-3 leading-tight">
                      {announcement.title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                      {announcement.description}
                    </p>

                    {/* Event Date */}
                    {announcement.event_date && (
                      <div className="flex items-start gap-2 text-sm text-slate-500 pt-3 border-t border-slate-100">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="leading-tight">{formatDate(announcement.event_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* View All Button */}
            <div className="text-center">
              <a
                href="/announcements"
                className="inline-block px-8 py-4 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
              >
                View All Announcements
              </a>
            </div>
          </>
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-slate-200">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-slate-600 text-lg">No announcements available at this time</p>
          </div>
        )}
      </div>

      {/* Info Cards Section */}
      <div className="bg-slate-50 border-t-2 border-slate-200 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Prayer Requests Card */}
            <div className="bg-white rounded-lg border-2 border-slate-200 p-8 text-center hover:border-slate-300 hover:shadow-xl transition-all">
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Prayer Requests
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Share your prayer needs with our dedicated prayer team
              </p>
              <a
                href="/request"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Submit Request
              </a>
            </div>

            {/* Announcements Card */}
            <div className="bg-white rounded-lg border-2 border-slate-200 p-8 text-center hover:border-slate-300 hover:shadow-xl transition-all">
              <svg className="w-16 h-16 mx-auto mb-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Announcements
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Stay informed about church events and important updates
              </p>
              <a
                href="/announcements"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all"
              >
                View All
              </a>
            </div>

            {/* Staff Portal Card */}
            <div className="bg-white rounded-lg border-2 border-slate-200 p-8 text-center hover:border-slate-300 hover:shadow-xl transition-all">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Staff Portal
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Access prayer warrior and leadership dashboards
              </p>
              <a
                href="/login"
                className="inline-block bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all"
              >
                Login
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - UPDATED WITH CONFIG */}
      <footer className="bg-slate-800 text-white py-12 px-4 border-t-4 border-slate-900">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-300 text-lg mb-2">
            {getChurchName.full()}
          </p>
          <p className="text-slate-400 text-sm mb-4">
            {APP_CONFIG.churchAddress}
          </p>
          <p className="text-slate-400 text-sm">
            {APP_CONFIG.footerText}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            © {APP_CONFIG.copyrightYear} All rights reserved
          </p>
        </div>
      </footer>
    </div>
  )
}