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
  requester_phone: string | null
  requester_email: string | null
  timeline: string | null
  timeline_days: number | null
  created_at: string
  status: string
}

interface Warrior {
  id: string
  name: string
  email: string
}

interface PrayerCommitment {
  id: string
  request_id: string
  warrior_id: string
  total_hours_target: number
  hours_completed: number
  deadline: string | null
  completed: boolean
  users: Warrior
}

interface RequestWithCommitments extends PrayerRequest {
  commitments: PrayerCommitment[]
  total_hours: number
  warriors_count: number
}

export default function LeaderDashboard() {
  const [user, setUser] = useState<any>(null)
  const [requests, setRequests] = useState<RequestWithCommitments[]>([])
  const [warriors, setWarriors] = useState<Warrior[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<RequestWithCommitments | null>(null)
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalHours: 0,
    activeWarriors: 0,
    answeredPrayers: 0
  })
  const [filter, setFilter] = useState<'all' | 'active' | 'answered'>('active')
  const router = useRouter()

  useEffect(() => {
    checkUser()
    loadData()
  }, [filter])

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
      // Load all prayer requests
      let query = supabase
        .from('prayer_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter === 'active') {
        query = query.eq('status', 'active')
      } else if (filter === 'answered') {
        query = query.eq('status', 'answered')
      }

      const { data: requestsData } = await query

      // Load all commitments with warrior info
      const { data: commitmentsData } = await supabase
        .from('prayer_commitments')
        .select(`
          *,
          users (id, name, email)
        `)

      // Load all prayer logs to calculate total hours
      const { data: logsData } = await supabase
        .from('prayer_logs')
        .select('*')

      // Combine data
      const requestsWithCommitments = requestsData?.map(request => {
        const requestCommitments = commitmentsData?.filter(c => c.request_id === request.id) || []
        const requestLogs = logsData?.filter(l => l.request_id === request.id) || []
        const totalHours = requestLogs.reduce((sum, log) => sum + (log.duration_minutes / 60), 0)
        
        return {
          ...request,
          commitments: requestCommitments,
          total_hours: totalHours,
          warriors_count: requestCommitments.length
        }
      }) || []

      setRequests(requestsWithCommitments)

      // Load all warriors
      const { data: warriorsData } = await supabase
        .from('users')
        .select('id, name, email')
        .in('role', ['warrior', 'leader'])

      setWarriors(warriorsData || [])

      // Calculate stats
      const totalRequests = requestsData?.length || 0
      const totalHours = logsData?.reduce((sum, log) => sum + (log.duration_minutes / 60), 0) || 0
      const activeWarriors = new Set(commitmentsData?.map(c => c.warrior_id)).size
      const answeredPrayers = requestsData?.filter(r => r.status === 'answered').length || 0

      setStats({
        totalRequests,
        totalHours,
        activeWarriors,
        answeredPrayers
      })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReassign = async (commitmentId: string, newWarriorId: string) => {
    try {
      const { error } = await supabase
        .from('prayer_commitments')
        .update({ warrior_id: newWarriorId })
        .eq('id', commitmentId)

      if (error) throw error

      alert('✅ Prayer reassigned successfully!')
      loadData()
      setSelectedRequest(null)
    } catch (error) {
      console.error('Error reassigning:', error)
      alert('Error reassigning prayer')
    }
  }

  const handleMarkAnswered = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .update({ 
          status: 'answered',
          answered_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      alert('✅ Prayer marked as answered!')
      loadData()
      setSelectedRequest(null)
    } catch (error) {
      console.error('Error marking answered:', error)
      alert('Error marking prayer as answered')
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this prayer request?')) return

    try {
      const { error } = await supabase
        .from('prayer_requests')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      alert('✅ Prayer request deleted')
      loadData()
      setSelectedRequest(null)
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Error deleting prayer request')
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
            <h1 className="text-2xl font-bold text-gray-800">👨‍💼 Church Leader Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalRequests}</div>
            <div className="text-sm text-gray-600">Total Requests</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">⏰</div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">Total Prayer Hours</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-800">{stats.activeWarriors}</div>
            <div className="text-sm text-gray-600">Active Warriors</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold text-gray-800">{stats.answeredPrayers}</div>
            <div className="text-sm text-gray-600">Answered Prayers</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'active' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('answered')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              filter === 'answered' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Answered
          </button>
        </div>

        {/* Prayer Requests List */}
        <div className="space-y-4">
          {requests.map(request => (
            <div key={request.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {request.category}
                    </span>
                    {request.privacy_level === 'anonymous' && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                        Anonymous
                      </span>
                    )}
                    {request.status === 'answered' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        ✅ Answered
                      </span>
                    )}
                    {request.timeline && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                        ⏰ {request.timeline}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {request.title}
                  </h3>
                  {request.requester_name && (
                    <p className="text-sm text-gray-600 mb-2">by {request.requester_name}</p>
                  )}
                  <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                    {request.description}
                  </p>
                </div>
              </div>

              {/* Prayer Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{request.warriors_count}</div>
                  <div className="text-xs text-gray-600">Warriors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{request.total_hours.toFixed(1)}h</div>
                  <div className="text-xs text-gray-600">Hours Prayed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">
                    {request.commitments.reduce((sum, c) => sum + c.hours_completed, 0).toFixed(1)} / 
                    {request.commitments.reduce((sum, c) => sum + c.total_hours_target, 0)}h
                  </div>
                  <div className="text-xs text-gray-600">Committed Hours</div>
                </div>
              </div>

              {/* Warriors List */}
              {request.commitments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Praying Warriors:</p>
                  <div className="flex flex-wrap gap-2">
                    {request.commitments.map(commitment => (
                      <span key={commitment.id} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                        {commitment.users.name} ({commitment.hours_completed.toFixed(1)}h)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                >
                  View Details & Manage
                </button>
                {request.status === 'active' && (
                  <button
                    onClick={() => handleMarkAnswered(request.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    Mark Answered
                  </button>
                )}
                <button
                  onClick={() => handleDeleteRequest(request.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-600">No prayer requests found</p>
            </div>
          )}
        </div>
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {selectedRequest.title}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {selectedRequest.category}
                  </span>
                  {selectedRequest.privacy_level === 'anonymous' ? (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">
                      Anonymous Request
                    </span>
                  ) : (
                    <span className="text-sm text-gray-600">
                      by {selectedRequest.requester_name || 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Prayer Request:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
            </div>

            {selectedRequest.timeline && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-semibold">⏰ Timeline: {selectedRequest.timeline}</p>
              </div>
            )}

            {(selectedRequest.requester_phone || selectedRequest.requester_email) && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">Contact Information:</h3>
                {selectedRequest.requester_phone && (
                  <p className="text-gray-700">📞 {selectedRequest.requester_phone}</p>
                )}
                {selectedRequest.requester_email && (
                  <p className="text-gray-700">📧 {selectedRequest.requester_email}</p>
                )}
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Prayer Warriors:</h3>
              {selectedRequest.commitments.length > 0 ? (
                <div className="space-y-3">
                  {selectedRequest.commitments.map(commitment => (
                    <div key={commitment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{commitment.users.name}</p>
                        <p className="text-sm text-gray-600">{commitment.users.email}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{commitment.hours_completed.toFixed(1)} / {commitment.total_hours_target}h</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min((commitment.hours_completed / commitment.total_hours_target) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value && confirm('Reassign this prayer to another warrior?')) {
                            handleReassign(commitment.id, e.target.value)
                          }
                        }}
                        className="ml-4 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        defaultValue=""
                      >
                        <option value="">Reassign</option>
                        {warriors
                          .filter(w => w.id !== commitment.warrior_id)
                          .map(warrior => (
                            <option key={warrior.id} value={warrior.id}>
                              {warrior.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No warriors assigned yet</p>
              )}
            </div>

            <div className="flex gap-3">
              {selectedRequest.status === 'active' && (
                <button
                  onClick={() => handleMarkAnswered(selectedRequest.id)}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Mark as Answered
                </button>
              )}
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
    </div>
  )
}