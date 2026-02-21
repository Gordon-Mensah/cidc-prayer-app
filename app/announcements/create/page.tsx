'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import APP_CONFIG, { getPageTitle } from '@/lib/config'

export default function CreateAnnouncementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    event_date: '',
    expires_at: '',
    priority: 0
  })
  const [flyerFile, setFlyerFile] = useState<File | null>(null)
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)

  const categories = [
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
    document.title = getPageTitle('Create Announcement')
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFlyerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFlyerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFlyer = async (): Promise<string | null> => {
    if (!flyerFile) return null

    setUploading(true)
    try {
      const fileExt = flyerFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `flyers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, flyerFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading flyer:', error)
      alert('Error uploading flyer. Please try again.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let flyerUrl = null
      if (flyerFile) {
        flyerUrl = await uploadFlyer()
        if (!flyerUrl) {
          setLoading(false)
          return
        }
      }

      const { error } = await supabase
        .from('announcements')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            flyer_url: flyerUrl,
            event_date: formData.event_date || null,
            expires_at: formData.expires_at || null,
            priority: formData.priority,
            is_active: true
          }
        ])

      if (error) throw error

      alert('Announcement created successfully')
      router.push('/announcements')
    } catch (error) {
      console.error('Error creating announcement:', error)
      alert('Error creating announcement. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold text-slate-800 mb-2">
            Create Announcement
          </h1>
          <p className="text-slate-600">Share important updates with {APP_CONFIG.churchName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl border-2 border-slate-200 p-8">
          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Title
              <span className="text-red-600 ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Youth Conference 2025"
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white"
              required
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Category
              <span className="text-red-600 ml-1">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white"
              required
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Description
              <span className="text-red-600 ml-1">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Full details about the announcement..."
              rows={6}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white"
              required
            />
          </div>

          {/* Flyer Upload */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Upload Flyer <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            {flyerPreview && (
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2 font-semibold">Preview:</p>
                <img
                  src={flyerPreview}
                  alt="Flyer preview"
                  className="max-w-full h-64 object-contain rounded-lg border-2 border-slate-300"
                />
              </div>
            )}
          </div>

          {/* Event Date */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Event Date & Time <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              When is this event happening?
            </p>
          </div>

          {/* Expiry Date */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Expires At <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              When should this announcement be automatically hidden?
            </p>
          </div>

          {/* Priority */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Priority
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value="0"
                  checked={formData.priority === 0}
                  onChange={() => setFormData({ ...formData, priority: 0 })}
                  className="mr-2 w-4 h-4 text-slate-600"
                />
                <span className="text-slate-700 font-medium">Normal</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value="1"
                  checked={formData.priority === 1}
                  onChange={() => setFormData({ ...formData, priority: 1 })}
                  className="mr-2 w-4 h-4 text-red-600"
                />
                <span className="text-slate-700 font-medium">High Priority</span>
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4 border-t-2 border-slate-100">
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 bg-slate-800 text-white py-4 rounded-lg font-bold text-lg hover:bg-slate-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Creating...' : uploading ? 'Uploading...' : 'Create Announcement'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/announcements')}
              className="px-8 py-4 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}