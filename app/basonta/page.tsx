'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface BasontaMember {
  id: string
  name: string
  phone: string | null
  joined_at: string
}

interface BasontaGroup {
  id: string
  name: string
  prayer_day: string
  prayer_time: string | null
  created_at: string
}

interface PrayerLog {
  id: string
  session_date: string
  member_id: string
  attended: boolean
  duration_minutes: number | null
  basonta_members: BasontaMember
}

export default function BasontaDashboard() {
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<BasontaGroup | null>(null)
  const [members, setMembers] = useState<BasontaMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showLogSession, setShowLogSession] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<{[key: string]: {attended: boolean, duration: number}}>({})
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalMembers: 0,
    avgAttendance: 0,
    totalHoursThisMonth: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkUser()
    loadData()
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

      // Check if user has a group
      const { data: groupData } = await supabase
        .from('basonta_groups')
        .select('*')
        .eq('leader_id', user.id)
        .single()

      if (groupData) {
        setGroup(groupData)

        // Load group members
        const { data: membersData } = await supabase
          .from('basonta_members')
          .select('*')
          .eq('group_id', groupData.id)
          .order('name')

        setMembers(membersData || [])

        // Initialize attendance state
        const initialAttendance: any = {}
        membersData?.forEach(member => {
          initialAttendance[member.id] = { attended: false, duration: 0 }
        })
        setAttendance(initialAttendance)

        // Load recent sessions
        const { data: sessionsData } = await supabase
          .from('basonta_prayer_logs')
          .select(`
            *,
            basonta_members (name)
          `)
          .eq('group_id', groupData.id)
          .order('session_date', { ascending: false })
          .limit(20)

        setRecentSessions(sessionsData || [])

        // Calculate stats
        const totalMembers = membersData?.length || 0
        
        // Get this month's logs
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        const { data: monthLogs } = await supabase
          .from('basonta_prayer_logs')
          .select('*')
          .eq('group_id', groupData.id)
          .gte('session_date', firstDayOfMonth.toISOString().split('T')[0])

        const totalHoursThisMonth = monthLogs?.reduce((sum, log) => {
          return sum + (log.duration_minutes || 0)
        }, 0) || 0

        // Calculate average attendance
        const uniqueSessions = [...new Set(monthLogs?.map(l => l.session_date) || [])]
        const avgAttendance = uniqueSessions.length > 0
          ? (monthLogs?.filter(l => l.attended).length || 0) / uniqueSessions.length / totalMembers * 100
          : 0

        setStats({
          totalMembers,
          avgAttendance,
          totalHoursThisMonth: totalHoursThisMonth / 60
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (groupName: string, prayerDay: string, prayerTime: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('basonta_groups')
        .insert([{
          name: groupName,
          leader_id: user.id,
          prayer_day: prayerDay,
          prayer_time: prayerTime
        }])
        .select()
        .single()

      if (error) throw error

      setGroup(data)
      alert('✅ Basonta group created!')
      loadData()
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Error creating group')
    }
  }

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !group) return

    try {
      const { error } = await supabase
        .from('basonta_members')
        .insert([{
          group_id: group.id,
          name: newMemberName.trim(),
          phone: newMemberPhone.trim() || null
        }])

      if (error) throw error

      alert('✅ Member added!')
      setNewMemberName('')
      setNewMemberPhone('')
      setShowAddMember(false)
      loadData()
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Error adding member')
    }
  }

  const handleLogSession = async () => {
    if (!group) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Insert all attendance records
      const logs = Object.entries(attendance).map(([memberId, data]) => ({
        group_id: group.id,
        session_date: sessionDate,
        member_id: memberId,
        attended: data.attended,
        duration_minutes: data.attended ? data.duration : null,
        logged_by: user.id
      }))

      const { error } = await supabase
        .from('basonta_prayer_logs')
        .insert(logs)

      if (error) throw error

      alert('✅ Prayer session logged!')
      setShowLogSession(false)
      
      // Reset attendance
      const resetAttendance: any = {}
      members.forEach(member => {
        resetAttendance[member.id] = { attended: false, duration: 0 }
      })
      setAttendance(resetAttendance)
      
      loadData()
    } catch (error) {
      console.error('Error logging session:', error)
      alert('Error logging prayer session')
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('basonta_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      alert('✅ Member removed')
      loadData()
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Error removing member')
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

  // If no group exists, show create group form
  // If no group exists, show create group form
  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎵</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Create Your Basonta Group</h1>
            <p className="text-gray-600">Set up your prayer group</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            handleCreateGroup(
              formData.get('groupName') as string,
              formData.get('prayerDay') as string,
              formData.get('prayerTime') as string
            )
          }}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                name="groupName"
                placeholder="e.g., Youth Choir, Adult Praise Team"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white placeholder-gray-400"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prayer Day
              </label>
              <select
                name="prayerDay"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                required
              >
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
                <option value="Friday">Friday</option>
                <option value="Wednesday">Wednesday</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Prayer Time
              </label>
              <input
                type="time"
                name="prayerTime"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              Create Group
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full mt-4 text-gray-600 hover:text-gray-800"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🎵 {group.name}</h1>
            <p className="text-sm text-gray-600">
              {group.prayer_day}s at {group.prayer_time} • {user?.email}
            </p>
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
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalMembers}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-2xl font-bold text-gray-800">{stats.avgAttendance.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Avg Attendance</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-3xl mb-2">⏰</div>
            <div className="text-2xl font-bold text-gray-800">{stats.totalHoursThisMonth.toFixed(1)}h</div>
            <div className="text-sm text-gray-600">Hours This Month</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowAddMember(true)}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            + Add Member
          </button>
          <button
            onClick={() => setShowLogSession(true)}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            📝 Log Prayer Session
          </button>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Group Members</h2>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-800">{member.name}</p>
                    {member.phone && (
                      <p className="text-sm text-gray-600">📞 {member.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No members yet. Add your first member!</p>
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Prayer Sessions</h2>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {[...new Set(recentSessions.map(s => s.session_date))].map(date => {
                const sessionLogs = recentSessions.filter(s => s.session_date === date)
                const attended = sessionLogs.filter(s => s.attended).length
                const totalHours = sessionLogs.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60

                return (
                  <div key={date} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {attended} / {members.length} attended • {totalHours.toFixed(1)} hours total
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sessionLogs.filter(s => s.attended).map(log => (
                        <span key={log.id} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {log.basonta_members.name} ({log.duration_minutes}min)
                        </span>
                      ))}
                      {sessionLogs.filter(s => !s.attended).map(log => (
                        <span key={log.id} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {log.basonta_members.name} (absent)
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No prayer sessions logged yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Member</h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Member Name *
              </label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-400"
              >
                Add Member
              </button>
              <button
                onClick={() => {
                  setShowAddMember(false)
                  setNewMemberName('')
                  setNewMemberPhone('')
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Session Modal */}
      {showLogSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Prayer Session</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
              />
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Attendance</h3>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={attendance[member.id]?.attended || false}
                        onChange={(e) => {
                          setAttendance({
                            ...attendance,
                            [member.id]: {
                              attended: e.target.checked,
                              duration: attendance[member.id]?.duration || 60
                            }
                          })
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{member.name}</p>
                        {attendance[member.id]?.attended && (
                          <div className="mt-2">
                            <label className="block text-xs text-gray-600 mb-1">
                              Prayer Duration (minutes)
                            </label>
                            <input
                              type="number"
                              value={attendance[member.id]?.duration || 60}
                              onChange={(e) => {
                                setAttendance({
                                  ...attendance,
                                  [member.id]: {
                                    ...attendance[member.id],
                                    duration: parseInt(e.target.value) || 0
                                  }
                                })
                              }}
                              min="1"
                              className="w-32 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLogSession}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Log Session
              </button>
              <button
                onClick={() => setShowLogSession(false)}
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