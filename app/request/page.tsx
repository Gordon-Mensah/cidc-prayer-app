'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import APP_CONFIG, { getChurchName, getPageTitle } from '@/lib/config'

export default function PrayerRequestPage() {
  const [formData, setFormData] = useState({
    requesterName: '',
    description: '',
    privacyLevel: 'public',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.title = getPageTitle('Prayer Request')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('prayer_requests')
        .insert([{
          title: formData.description.slice(0, 80),
          description: formData.description,
          category: 'General',
          privacy_level: formData.privacyLevel,
          requester_name: formData.privacyLevel === 'anonymous' ? null : formData.requesterName,
          status: 'active',
        }])

      if (error) throw error
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting prayer request:', error)
      alert('Error submitting request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
              {getChurchName.short()}
            </p>
            <h1 className="text-5xl font-serif font-bold text-white mb-4 leading-tight">
              Request Received
            </h1>
            <p className="text-slate-300 text-xl max-w-xl mx-auto leading-relaxed">
              Our prayer warriors have been notified and will begin praying for you
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg border-2 border-slate-200 p-10 mb-8">
            <p className="text-slate-600 leading-relaxed mb-8">
              Thank you for sharing your prayer need with us. Our team will be lifting you up in prayer.
            </p>
            <button
              onClick={() => {
                setSubmitted(false)
                setFormData({ requesterName: '', description: '', privacyLevel: 'public' })
              }}
              className="inline-block bg-slate-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
            >
              Submit Another Request
            </button>
          </div>
          <a href="/" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
            Return to Home
          </a>
        </div>

        <footer className="bg-slate-800 text-white py-10 px-4 border-t-4 border-slate-900">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-slate-300">{APP_CONFIG.footerText}</p>
            <p className="text-slate-400 text-sm mt-2">&copy; {APP_CONFIG.copyrightYear} {getChurchName.short()}</p>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-4">
            {getChurchName.short()}
          </p>
          <h1 className="text-5xl font-serif font-bold text-white mb-4 leading-tight">
            Submit a Prayer Request
          </h1>
          <p className="text-slate-300 text-xl max-w-xl mx-auto leading-relaxed">
            Share your prayer need with our church family
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-lg border-2 border-slate-200 shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            {/* Name */}
            {formData.privacyLevel === 'public' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.requesterName}
                  onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                  required={formData.privacyLevel === 'public'}
                />
              </div>
            )}

            {/* Prayer Request */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Prayer Request
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Share your prayer need..."
                rows={6}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Prayer Request'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
            Return to Home
          </a>
        </div>
      </div>

      <footer className="bg-slate-800 text-white py-10 px-4 border-t-4 border-slate-900 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-300">{APP_CONFIG.footerText}</p>
          <p className="text-slate-400 text-sm mt-2">&copy; {APP_CONFIG.copyrightYear} {getChurchName.short()}</p>
        </div>
      </footer>
    </div>
  )
}