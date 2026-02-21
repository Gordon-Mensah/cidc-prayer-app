'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface PrayerRequest {
  id: string
  title: string
  description: string
  category: string
  privacy_level: string
  requester_name: string | null
  timeline: string | null
  timeline_days: number | null
  created_at: string
  status: string
}

interface PrayerCommitment {
  id: string
  request_id: string
  total_hours_target: number
  hours_completed: number
  deadline: string | null
  completed: boolean
  prayer_requests: PrayerRequest
}

export default function WarriorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [newRequests, setNewRequests] = useState<PrayerRequest[]>([])
  const [myPrayers, setMyPrayers] = useState<PrayerCommitment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null)
  const [logPrayerFor, setLogPrayerFor] = useState<PrayerCommitment | null>(null)
  const [prayerDuration, setPrayerDuration] = useState(15)
  const [prayerNotes, setPrayerNotes] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkUser()
    loadData()

    const fetchUserRole = async () => {
      const response = await fetch(
        'https://skzevxyiqqisowqznlwv.supabase.co/rest/v1/users?select=role&email=eq.gordonmensahj%40gmail.com',
        {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Accept': 'application/json',
          },
        }
      )
      if (!response.ok) {
        console.error('Failed to fetch user role:', response.status, response.statusText)
        return
      }
      const data = await response.json()
      console.log('User role data:', data)
    }
    fetchUserRole()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
  }

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: requests } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const { data: commitments } = await supabase
        .from('prayer_commitments')
        .select('request_id')
        .eq('warrior_id', user.id)

      const committedIds = commitments?.map(c => c.request_id) || []
      const available = requests?.filter(r => !committedIds.includes(r.id)) || []
      setNewRequests(available)

      const { data: myCommitments } = await supabase
        .from('prayer_commitments')
        .select(`*, prayer_requests (*)`)
        .eq('warrior_id', user.id)
        .eq('completed', false)
        .order('deadline', { ascending: true })

      setMyPrayers(myCommitments || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async (request: PrayerRequest) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let deadline = null
      if (request.timeline_days) {
        deadline = new Date()
        deadline.setDate(deadline.getDate() + request.timeline_days)
      }

      const { error } = await supabase
        .from('prayer_commitments')
        .insert([{
          request_id: request.id,
          warrior_id: user.id,
          total_hours_target: 4.0,
          deadline: deadline ? deadline.toISOString().split('T')[0] : null
        }])

      if (error) throw error

      alert('You have committed to pray for this request.')
      setSelectedRequest(null)
      loadData()
    } catch (error) {
      console.error('Error committing:', error)
      alert('Error committing to prayer')
    }
  }

  const handleLogPrayer = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !logPrayerFor) return

      const { error: logError } = await supabase
        .from('prayer_logs')
        .insert([{
          commitment_id: logPrayerFor.id,
          warrior_id: user.id,
          request_id: logPrayerFor.request_id,
          duration_minutes: prayerDuration,
          notes: prayerNotes || null
        }])

      if (logError) throw logError

      const newHours = logPrayerFor.hours_completed + (prayerDuration / 60)
      const { error: updateError } = await supabase
        .from('prayer_commitments')
        .update({
          hours_completed: newHours,
          completed: newHours >= logPrayerFor.total_hours_target
        })
        .eq('id', logPrayerFor.id)

      if (updateError) throw updateError

      alert('Prayer time logged successfully.')
      setLogPrayerFor(null)
      setPrayerDuration(15)
      setPrayerNotes('')
      loadData()
    } catch (error) {
      console.error('Error logging prayer:', error)
      alert('Error logging prayer')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mb-4"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
              Prayer Warrior
            </p>
            <h1 className="text-2xl font-serif font-bold text-white">
              Warrior Dashboard
            </h1>
            <p className="text-slate-300 text-sm mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Active Prayers', value: myPrayers.length },
            {
              label: 'Hours Prayed',
              value: `${myPrayers.reduce((sum, p) => sum + p.hours_completed, 0).toFixed(1)}h`
            },
            { label: 'New Requests', value: newRequests.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* New Prayer Requests */}
        <div className="mb-10">
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-slate-800">New Prayer Requests</h2>
            <p className="text-slate-500 text-sm mt-1">Review and commit to pray for those in need</p>
          </div>

          {newRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newRequests.map(request => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-xl transition-all"
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="inline-block px-3 py-1 rounded border bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold uppercase tracking-wide">
                      {request.category}
                    </span>
                    {request.timeline && (
                      <span className="inline-block px-3 py-1 rounded border bg-orange-100 text-orange-800 border-orange-200 text-xs font-semibold uppercase tracking-wide">
                        {request.timeline}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-slate-800 mb-2 leading-tight">
                    {request.title}
                    {request.privacy_level === 'anonymous' && (
                      <span className="ml-2 text-xs text-slate-400 font-normal normal-case">Anonymous</span>
                    )}
                  </h3>

                  <p className="text-slate-600 text-sm mb-5 line-clamp-2 leading-relaxed">
                    {request.description}
                  </p>

                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
                  >
                    View Details & Commit
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
              <p className="text-slate-500 text-lg">No new prayer requests at the moment</p>
            </div>
          )}
        </div>

        {/* My Active Prayers */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-slate-800">My Active Prayers</h2>
            <p className="text-slate-500 text-sm mt-1">Track your prayer commitments and log your sessions</p>
          </div>

          {myPrayers.length > 0 ? (
            <div className="space-y-4">
              {myPrayers.map(commitment => {
                const progress = (commitment.hours_completed / commitment.total_hours_target) * 100
                return (
                  <div
                    key={commitment.id}
                    className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight">
                          {commitment.prayer_requests.title}
                        </h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded border bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold uppercase tracking-wide">
                          {commitment.prayer_requests.category}
                        </span>
                      </div>
                      {commitment.deadline && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                          Due {new Date(commitment.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-5">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500 font-medium uppercase tracking-wide text-xs">Progress</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {commitment.hours_completed.toFixed(1)} / {commitment.total_hours_target} hours
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div
                          className="bg-slate-800 h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setLogPrayerFor(commitment)}
                        className="flex-1 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-all shadow-md hover:shadow-lg"
                      >
                        Log Prayer Time
                      </button>
                      <button
                        onClick={() => setSelectedRequest(commitment.prayer_requests)}
                        className="px-5 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
              <p className="text-slate-500 text-lg">You have not committed to any prayers yet</p>
              <p className="text-slate-400 text-sm mt-2">Browse new requests above to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-10 px-4 border-t-4 border-slate-900 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-300">Church Prayer Management System</p>
          <p className="text-slate-400 text-sm mt-2">&copy; 2026 All rights reserved</p>
        </div>
      </footer>

      {/* ── Request Detail Modal ── */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-block px-3 py-1 rounded border bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold uppercase tracking-wide mb-3">
                  {selectedRequest.category}
                </span>
                <h2 className="text-2xl font-serif font-bold text-slate-800 leading-tight">
                  {selectedRequest.title}
                </h2>
                {selectedRequest.privacy_level === 'public' && selectedRequest.requester_name && (
                  <p className="text-sm text-slate-500 mt-2">Submitted by {selectedRequest.requester_name}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none transition-colors ml-4"
              >
                &times;
              </button>
            </div>

            {selectedRequest.timeline && (
              <div className="mb-5 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-orange-800 font-semibold text-sm uppercase tracking-wide">
                  Timeline: {selectedRequest.timeline}
                </p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Prayer Request</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleCommit(selectedRequest)}
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg"
              >
                Commit to Pray for This
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Prayer Modal ── */}
      {logPrayerFor && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-1">Log Prayer Time</h2>
            <p className="text-slate-500 text-sm mb-8">
              Recording time for: <span className="font-semibold text-slate-700">{logPrayerFor.prayer_requests.title}</span>
            </p>

            <div className="mb-7">
              <label className="block text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                Duration
              </label>
              <div className="space-y-2">
                {[15, 30, 45, 60].map(min => (
                  <label
                    key={min}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      prayerDuration === min
                        ? 'border-slate-800 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={min}
                      checked={prayerDuration === min}
                      onChange={(e) => setPrayerDuration(Number(e.target.value))}
                      className="mr-3"
                    />
                    <span className="text-slate-700 font-medium">{min} minutes</span>
                  </label>
                ))}
                <label className="flex items-center p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition-all">
                  <input
                    type="radio"
                    name="duration"
                    value="custom"
                    onChange={() => setPrayerDuration(0)}
                    className="mr-3"
                  />
                  <input
                    type="number"
                    placeholder="Custom minutes"
                    className="flex-1 px-3 py-1.5 border-2 border-slate-200 rounded-lg text-slate-800 text-sm focus:ring-0 focus:border-slate-500 bg-white"
                    onChange={(e) => setPrayerDuration(Number(e.target.value))}
                    min="1"
                  />
                </label>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={prayerNotes}
                onChange={(e) => setPrayerNotes(e.target.value)}
                placeholder="Share any encouragement or scripture..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogPrayer}
                disabled={prayerDuration === 0}
                className="flex-1 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-all shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Log Prayer
              </button>
              <button
                onClick={() => {
                  setLogPrayerFor(null)
                  setPrayerDuration(15)
                  setPrayerNotes('')
                }}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}