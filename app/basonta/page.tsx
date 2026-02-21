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

interface BasontaMeeting {
  id: string
  meeting_date: string
  people_present: number
  first_timers: number
  testimonies_count: number
  comments: string | null
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
  const [meetings, setMeetings] = useState<BasontaMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showLogSession, setShowLogSession] = useState(false)
  const [showLogMeeting, setShowLogMeeting] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<{[key: string]: {attended: boolean, duration: number}}>({})
  const [recentSessions, setRecentSessions] = useState<any[]>([])

  const [meetingForm, setMeetingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    peoplePresent: 0,
    firstTimers: 0,
    testimoniesCount: 0,
    comments: ''
  })

  const [stats, setStats] = useState({
    totalMembers: 0,
    avgAttendance: 0,
    totalHoursThisMonth: 0,
    totalMeetings: 0,
    avgMeetingAttendance: 0,
    totalFirstTimers: 0,
    totalTestimonies: 0
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

      const { data: groupData } = await supabase
        .from('basonta_groups')
        .select('*')
        .eq('leader_id', user.id)
        .single()

      if (groupData) {
        setGroup(groupData)

        const { data: membersData } = await supabase
          .from('basonta_members')
          .select('*')
          .eq('group_id', groupData.id)
          .order('name')

        setMembers(membersData || [])

        const initialAttendance: any = {}
        membersData?.forEach(member => {
          initialAttendance[member.id] = { attended: false, duration: 0 }
        })
        setAttendance(initialAttendance)

        const { data: sessionsData } = await supabase
          .from('basonta_prayer_logs')
          .select(`*, basonta_members (name)`)
          .eq('group_id', groupData.id)
          .order('session_date', { ascending: false })
          .limit(20)

        setRecentSessions(sessionsData || [])

        const { data: meetingsData } = await supabase
          .from('basonta_meetings')
          .select('*')
          .eq('group_id', groupData.id)
          .order('meeting_date', { ascending: false })

        setMeetings(meetingsData || [])

        const totalMembers = membersData?.length || 0

        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        const { data: monthLogs } = await supabase
          .from('basonta_prayer_logs')
          .select('*')
          .eq('group_id', groupData.id)
          .gte('session_date', firstDayOfMonth.toISOString().split('T')[0])

        const totalHoursThisMonth = monthLogs?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0

        const uniqueSessions = [...new Set(monthLogs?.map(l => l.session_date) || [])]
        const avgAttendance = uniqueSessions.length > 0
          ? (monthLogs?.filter(l => l.attended).length || 0) / uniqueSessions.length / totalMembers * 100
          : 0

        const totalMeetings = meetingsData?.length || 0
        const avgMeetingAttendance = totalMeetings > 0
          ? meetingsData.reduce((sum, m) => sum + m.people_present, 0) / totalMeetings
          : 0
        const totalFirstTimers = meetingsData?.reduce((sum, m) => sum + (m.first_timers || 0), 0) || 0
        const totalTestimonies = meetingsData?.reduce((sum, m) => sum + (m.testimonies_count || 0), 0) || 0

        setStats({
          totalMembers,
          avgAttendance,
          totalHoursThisMonth: totalHoursThisMonth / 60,
          totalMeetings,
          avgMeetingAttendance,
          totalFirstTimers,
          totalTestimonies
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
      if (!user) {
        alert('You must be logged in')
        return
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: user.id,
            email: user.email || '',
            name: user.email?.split('@')[0] || 'User',
            role: 'basonta_shepherd'
          }])
          .select()
          .single()

        if (insertError) {
          alert(`Cannot create user: ${insertError.message}. Please contact admin.`)
          return
        }
      }

      const { data: groupData, error: groupError } = await supabase
        .from('basonta_groups')
        .insert([{
          name: groupName,
          leader_id: user.id,
          prayer_day: prayerDay,
          prayer_time: prayerTime
        }])
        .select()
        .single()

      if (groupError) {
        alert(`Error creating group: ${groupError.message}`)
        return
      }

      setGroup(groupData)
      alert('Basonta group created successfully.')
      loadData()
    } catch (error: any) {
      alert(`Error: ${error.message || 'Unknown error'}`)
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

      alert('Member added successfully.')
      setNewMemberName('')
      setNewMemberPhone('')
      setShowAddMember(false)
      loadData()
    } catch (error) {
      alert('Error adding member')
    }
  }

  const handleLogSession = async () => {
    if (!group) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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

      alert('Prayer session logged successfully.')
      setShowLogSession(false)

      const resetAttendance: any = {}
      members.forEach(member => {
        resetAttendance[member.id] = { attended: false, duration: 0 }
      })
      setAttendance(resetAttendance)

      loadData()
    } catch (error) {
      alert('Error logging prayer session')
    }
  }

  const handleLogMeeting = async () => {
    if (!group) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('basonta_meetings')
        .insert([{
          group_id: group.id,
          meeting_date: meetingForm.date,
          people_present: meetingForm.peoplePresent,
          first_timers: meetingForm.firstTimers,
          testimonies_count: meetingForm.testimoniesCount,
          comments: meetingForm.comments || null,
          logged_by: user.id
        }])

      if (error) throw error

      alert('Meeting logged successfully.')
      setShowLogMeeting(false)

      setMeetingForm({
        date: new Date().toISOString().split('T')[0],
        peoplePresent: 0,
        firstTimers: 0,
        testimoniesCount: 0,
        comments: ''
      })

      loadData()
    } catch (error) {
      alert('Error logging meeting')
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

      alert('Member removed successfully.')
      loadData()
    } catch (error) {
      alert('Error removing member')
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

  // Create Group Screen
  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 h-1/3 top-0" />

        <div className="relative z-10 max-w-md w-full">
          <div className="text-center mb-8">
            <p className="text-slate-200 text-sm font-semibold uppercase tracking-widest mb-2">
              Basonta Shepherd
            </p>
            <h1 className="text-4xl font-serif font-bold text-white leading-tight">
              Create Your Group
            </h1>
          </div>

          <div className="bg-white rounded-lg border-2 border-slate-200 shadow-xl p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-serif font-bold text-slate-800 mb-1">Group Setup</h2>
              <p className="text-slate-500 text-sm">Configure your Basonta prayer group</p>
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
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Group Name
                </label>
                <input
                  type="text"
                  name="groupName"
                  placeholder="e.g., Youth Choir, Adult Praise Team"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                  required
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Prayer Day
                </label>
                <select
                  name="prayerDay"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                  required
                >
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                  <option value="Friday">Friday</option>
                  <option value="Wednesday">Wednesday</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Prayer Time
                </label>
                <input
                  type="time"
                  name="prayerTime"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
              >
                Create Group
              </button>
            </form>

            <div className="mt-6 pt-6 border-t-2 border-slate-100 text-center">
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">
              Basonta Shepherd
            </p>
            <h1 className="text-2xl font-serif font-bold text-white">
              {group.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              {group.prayer_day}s at {group.prayer_time} &mdash; {user?.email}
            </p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Members', value: stats.totalMembers },
            { label: 'Meetings', value: stats.totalMeetings },
            { label: 'First Timers', value: stats.totalFirstTimers },
            { label: 'Testimonies', value: stats.totalTestimonies },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border-2 border-slate-200 p-5 hover:border-slate-300 hover:shadow-lg transition-all"
            >
              <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <button
            onClick={() => setShowAddMember(true)}
            className="bg-slate-800 text-white py-4 rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl"
          >
            Add Member
          </button>
          <button
            onClick={() => setShowLogMeeting(true)}
            className="bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Log Meeting
          </button>
          <button
            onClick={() => setShowLogSession(true)}
            className="bg-green-700 text-white py-4 rounded-lg font-semibold hover:bg-green-800 transition-all shadow-lg hover:shadow-xl"
          >
            Log Prayer Session
          </button>
        </div>

        {/* Meetings Log */}
        <div className="bg-white rounded-lg border-2 border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Recent Meetings</h2>
          {meetings.length > 0 ? (
            <div className="space-y-4">
              {meetings.map(meeting => (
                <div key={meeting.id} className="p-5 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-slate-800 text-lg">
                        {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">{group.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-800">{meeting.people_present}</div>
                      <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mt-1">Present</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xl font-bold text-green-800">{meeting.first_timers}</div>
                      <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mt-1">First Timers</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-xl font-bold text-purple-800">{meeting.testimonies_count}</div>
                      <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mt-1">Testimonies</div>
                    </div>
                    <div className="text-center p-3 bg-slate-100 rounded-lg border border-slate-200">
                      <div className="text-xl font-bold text-slate-800">
                        {stats.totalMembers > 0 ? Math.round((meeting.people_present / stats.totalMembers) * 100) : 0}%
                      </div>
                      <div className="text-xs text-slate-600 font-semibold uppercase tracking-wide mt-1">Attendance</div>
                    </div>
                  </div>
                  {meeting.comments && (
                    <div className="p-4 bg-white rounded-lg border-2 border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Comments</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{meeting.comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
              <p className="text-slate-500 text-lg">No meetings logged yet</p>
              <button
                onClick={() => setShowLogMeeting(true)}
                className="mt-4 text-slate-700 hover:text-slate-900 font-semibold underline underline-offset-4 text-sm"
              >
                Log your first meeting
              </button>
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg border-2 border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Group Members</h2>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-all"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{member.name}</p>
                    {member.phone && (
                      <p className="text-sm text-slate-500 mt-0.5">{member.phone}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="px-4 py-2 text-red-600 border-2 border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg text-sm font-semibold transition-all"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
              <p className="text-slate-500 text-lg">No members yet. Add your first member.</p>
            </div>
          )}
        </div>

        {/* Recent Prayer Sessions */}
        <div className="bg-white rounded-lg border-2 border-slate-200 p-8">
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Recent Prayer Sessions</h2>
          {recentSessions.length > 0 ? (
            <div className="space-y-4">
              {[...new Set(recentSessions.map(s => s.session_date))].map(date => {
                const sessionLogs = recentSessions.filter(s => s.session_date === date)
                const attended = sessionLogs.filter(s => s.attended).length
                const totalHours = sessionLogs.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60

                return (
                  <div key={date} className="p-5 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <div className="mb-3">
                      <p className="font-bold text-slate-800">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {attended} of {members.length} attended &bull; {totalHours.toFixed(1)} hours total
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {sessionLogs.filter(s => s.attended).map(log => (
                        <span
                          key={log.id}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded border border-green-200 text-xs font-semibold"
                        >
                          {log.basonta_members.name} &mdash; {log.duration_minutes}min
                        </span>
                      ))}
                      {sessionLogs.filter(s => !s.attended).map(log => (
                        <span
                          key={log.id}
                          className="px-3 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 text-xs font-semibold"
                        >
                          {log.basonta_members.name} &mdash; absent
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
              <p className="text-slate-500 text-lg">No prayer sessions logged yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-10 px-4 border-t-4 border-slate-900 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-300">Church Management System</p>
          <p className="text-slate-400 text-sm mt-2">&copy; 2026 All rights reserved</p>
        </div>
      </footer>

      {/* ── Add Member Modal ── */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Add New Member</h2>
            <p className="text-slate-500 text-sm mb-8">Add a member to {group.name}</p>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Member's full name"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Phone Number <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="tel"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
              <button
                onClick={() => {
                  setShowAddMember(false)
                  setNewMemberName('')
                  setNewMemberPhone('')
                }}
                className="px-6 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Meeting Modal ── */}
      {showLogMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Log Meeting</h2>
            <p className="text-slate-500 text-sm mb-8">Record attendance and highlights for this Basonta session</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  People Present
                </label>
                <input
                  type="number"
                  min="0"
                  value={meetingForm.peoplePresent}
                  onChange={(e) => setMeetingForm({...meetingForm, peoplePresent: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  First Timers
                </label>
                <input
                  type="number"
                  min="0"
                  value={meetingForm.firstTimers}
                  onChange={(e) => setMeetingForm({...meetingForm, firstTimers: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Testimonies
                </label>
                <input
                  type="number"
                  min="0"
                  value={meetingForm.testimoniesCount}
                  onChange={(e) => setMeetingForm({...meetingForm, testimoniesCount: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Comments <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={meetingForm.comments}
                  onChange={(e) => setMeetingForm({...meetingForm, comments: e.target.value})}
                  placeholder="Share highlights, testimonies, or notes about the meeting..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white placeholder-slate-400 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleLogMeeting}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg"
              >
                Log Meeting
              </button>
              <button
                onClick={() => {
                  setShowLogMeeting(false)
                  setMeetingForm({
                    date: new Date().toISOString().split('T')[0],
                    peoplePresent: 0,
                    firstTimers: 0,
                    testimoniesCount: 0,
                    comments: ''
                  })
                }}
                className="px-6 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Session Modal ── */}
      {showLogSession && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Log Prayer Session</h2>
            <p className="text-slate-500 text-sm mb-8">Record attendance and duration for each member</p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
              />
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Attendance</h3>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <div className="flex items-start gap-4">
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
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-800"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{member.name}</p>
                        {attendance[member.id]?.attended && (
                          <div className="mt-3">
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                              Duration (minutes)
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
                              className="w-32 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:ring-0 focus:border-slate-500"
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
                className="flex-1 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-all shadow-lg"
              >
                Log Session
              </button>
              <button
                onClick={() => setShowLogSession(false)}
                className="px-6 py-3 border-2 border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold transition-all"
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