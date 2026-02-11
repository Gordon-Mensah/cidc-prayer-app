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

    // Example: fetch user role by email using Supabase REST API
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
      );
      if (!response.ok) {
        console.error('Failed to fetch user role:', response.status, response.statusText);
        return;
      }
      const data = await response.json();
      console.log('User role data:', data);
    };
    fetchUserRole();
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

      // Load new prayer requests (not committed to by this warrior)
      const { data: requests } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Filter out requests this warrior already committed to
      const { data: commitments } = await supabase
        .from('prayer_commitments')
        .select('request_id')
        .eq('warrior_id', user.id)

      const committedIds = commitments?.map(c => c.request_id) || []
      const available = requests?.filter(r => !committedIds.includes(r.id)) || []
      setNewRequests(available)

      // Load warrior's active commitments
      const { data: myCommitments } = await supabase
        .from('prayer_commitments')
        .select(`
          *,
          prayer_requests (*)
        `)
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

      // Calculate deadline based on timeline
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

      alert('✅ You committed to pray for this request!')
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

      // Insert prayer log
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

      // Update hours completed
      const newHours = logPrayerFor.hours_completed + (prayerDuration / 60)
      const { error: updateError } = await supabase
        .from('prayer_commitments')
        .update({ 
          hours_completed: newHours,
          completed: newHours >= logPrayerFor.total_hours_target
        })
        .eq('id', logPrayerFor.id)

      if (updateError) throw updateError

      alert('✅ Prayer time logged!')
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🙏 Prayer Warrior Dashboard</h1>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-2xl font-bold text-gray-800">{myPrayers.length}</div>
            <div className="text-sm text-gray-600">Active Prayers</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">⏰</div>
            <div className="text-2xl font-bold text-gray-800">
              {myPrayers.reduce((sum, p) => sum + p.hours_completed, 0).toFixed(1)}h
            </div>
            <div className="text-sm text-gray-600">Hours Prayed</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">🔔</div>
            <div className="text-2xl font-bold text-gray-800">{newRequests.length}</div>
            <div className="text-sm text-gray-600">New Requests</div>
          </div>
        </div>

        {/* New Requests */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔔 New Prayer Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newRequests.map(request => (
              <div key={request.id} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-2">
                      {request.category}
                    </span>
                    {request.timeline && (
                      <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold mb-2 ml-2">
                        ⏰ {request.timeline}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">
                  {request.title}
                  {request.privacy_level === 'anonymous' && (
                    <span className="ml-2 text-xs text-gray-500">(Anonymous)</span>
                  )}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {request.description}
                </p>
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  View Details & Commit
                </button>
              </div>
            ))}
          </div>
          {newRequests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <div className="text-6xl mb-4">✨</div>
              <p className="text-gray-600">No new prayer requests at the moment</p>
            </div>
          )}
        </div>

        {/* My Active Prayers */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">📅 My Active Prayers</h2>
          <div className="space-y-4">
            {myPrayers.map(commitment => {
              const progress = (commitment.hours_completed / commitment.total_hours_target) * 100
              return (
                <div key={commitment.id} className="bg-white rounded-xl shadow p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {commitment.prayer_requests.title}
                      </h3>
                      <span className="text-sm text-gray-600">
                        {commitment.prayer_requests.category}
                      </span>
                    </div>
                    {commitment.deadline && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                        Due: {new Date(commitment.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-800">
                        {commitment.hours_completed.toFixed(1)} / {commitment.total_hours_target} hours
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setLogPrayerFor(commitment)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      Log Prayer Time
                    </button>
                    <button
                      onClick={() => setSelectedRequest(commitment.prayer_requests)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {myPrayers.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <div className="text-6xl mb-4">🙏</div>
              <p className="text-gray-600">You haven't committed to any prayers yet</p>
              <p className="text-sm text-gray-500 mt-2">Browse new requests above to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mb-2">
                  {selectedRequest.category}
                </span>
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedRequest.title}
                </h2>
                {selectedRequest.privacy_level === 'public' && selectedRequest.requester_name && (
                  <p className="text-sm text-gray-600 mt-1">by {selectedRequest.requester_name}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedRequest.timeline && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-orange-800 font-semibold">⏰ Timeline: {selectedRequest.timeline}</span>
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Prayer Request:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleCommit(selectedRequest)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                I'll Pray for This
              </button>
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Prayer Modal */}
      {logPrayerFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Log Prayer Time</h2>
            <p className="text-gray-600 mb-6">For: {logPrayerFor.prayer_requests.title}</p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                How long did you pray?
              </label>
              <div className="space-y-2">
                {[15, 30, 45, 60].map(min => (
                  <label key={min} className="flex items-center">
                    <input
                      type="radio"
                      name="duration"
                      value={min}
                      checked={prayerDuration === min}
                      onChange={(e) => setPrayerDuration(Number(e.target.value))}
                      className="mr-2"
                    />
                    <span className="text-gray-700">{min} minutes</span>
                  </label>
                ))}
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="duration"
                    value="custom"
                    onChange={() => setPrayerDuration(0)}
                    className="mr-2"
                  />
                  <input
                    type="number"
                    placeholder="Custom minutes"
                    className="ml-2 px-3 py-1 border border-gray-300 rounded"
                    onChange={(e) => setPrayerDuration(Number(e.target.value))}
                    min="1"
                  />
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Optional Notes (encouragement, scripture, etc.)
              </label>
              <textarea
                value={prayerNotes}
                onChange={(e) => setPrayerNotes(e.target.value)}
                placeholder="Share any encouragement or scripture..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogPrayer}
                disabled={prayerDuration === 0}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
              >
                Log Prayer
              </button>
              <button
                onClick={() => {
                  setLogPrayerFor(null)
                  setPrayerDuration(15)
                  setPrayerNotes('')
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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