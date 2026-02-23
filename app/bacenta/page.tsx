'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import APP_CONFIG, { getChurchName, getPageTitle } from '@/lib/config'

interface BacentaMember {
  id: string
  name: string
  phone: string | null
  is_basonta_member: boolean
  joined_at: string
}

interface BacentaGroup {
  id: string
  name: string
  location: string
  meeting_day: string
  meeting_time: string | null
  created_at: string
}

interface BacentaMeeting {
  id: string
  meeting_date: string
  attendance: number
  first_timers: number
  converts: number
  testimonies_count: number
  attendance_coming_sunday: number
  absent_but_coming_sunday: number
  picture_url: string | null
  comments: string | null
  created_at: string
}

export default function BacentaDashboard() {
  const [user, setUser] = useState<any>(null)
  const [group, setGroup] = useState<BacentaGroup | null>(null)
  const [members, setMembers] = useState<BacentaMember[]>([])
  const [meetings, setMeetings] = useState<BacentaMeeting[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showLogMeeting, setShowLogMeeting] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({ name: '', phone: '', is_basonta_member: false })
  const [uploading, setUploading] = useState(false)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)

  const [meetingForm, setMeetingForm] = useState({
    date: new Date().toISOString().split('T')[0],
    attendance: 0,
    first_timers: 0,
    converts: 0,
    testimonies_count: 0,
    attendance_coming_sunday: 0,
    absent_but_coming_sunday: 0,
    comments: ''
  })

  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMeetings: 0,
    avgAttendance: 0,
    totalFirstTimers: 0,
    totalConverts: 0,
    totalTestimonies: 0,
    basontaMembers: 0
  })

  const router = useRouter()

  useEffect(() => {
    document.title = getPageTitle('Bacenta Dashboard')
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
        .from('bacenta_groups')
        .select('*')
        .eq('leader_id', user.id)
        .single()

      if (groupData) {
        setGroup(groupData)

        const { data: membersData } = await supabase
          .from('bacenta_members')
          .select('*')
          .eq('group_id', groupData.id)
          .order('name')

        setMembers(membersData || [])

        const { data: meetingsData } = await supabase
          .from('bacenta_meetings')
          .select('*')
          .eq('group_id', groupData.id)
          .order('meeting_date', { ascending: false })

        setMeetings(meetingsData || [])

        // Calculate stats
        const totalMembers = membersData?.length || 0
        const totalMeetings = meetingsData?.length || 0
        const avgAttendance = totalMeetings > 0
          ? meetingsData.reduce((sum, m) => sum + m.attendance, 0) / totalMeetings
          : 0
        const totalFirstTimers = meetingsData?.reduce((sum, m) => sum + m.first_timers, 0) || 0
        const totalConverts = meetingsData?.reduce((sum, m) => sum + m.converts, 0) || 0
        const totalTestimonies = meetingsData?.reduce((sum, m) => sum + m.testimonies_count, 0) || 0
        const basontaMembers = membersData?.filter(m => m.is_basonta_member).length || 0

        setStats({
          totalMembers,
          totalMeetings,
          avgAttendance,
          totalFirstTimers,
          totalConverts,
          totalTestimonies,
          basontaMembers
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberForm.name.trim() || !group) return

    try {
      const { error } = await supabase
        .from('bacenta_members')
        .insert([{
          group_id: group.id,
          name: newMemberForm.name.trim(),
          phone: newMemberForm.phone.trim() || null,
          is_basonta_member: newMemberForm.is_basonta_member
        }])

      if (error) throw error

      alert('Member added successfully')
      setNewMemberForm({ name: '', phone: '', is_basonta_member: false })
      setShowAddMember(false)
      loadData()
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Error adding member')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPictureFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPicturePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPicture = async (): Promise<string | null> => {
    if (!pictureFile || !group) return null

    setUploading(true)
    try {
      const fileExt = pictureFile.name.split('.').pop()
      const fileName = `${group.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('bacenta_pictures')
        .upload(filePath, pictureFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('bacenta_pictures')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading picture:', error)
      alert('Error uploading picture. Please try again.')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleLogMeeting = async () => {
    if (!group) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let pictureUrl = null
      if (pictureFile) {
        pictureUrl = await uploadPicture()
        if (!pictureUrl && pictureFile) {
          // Upload failed but user tried to upload
          return
        }
      }

      const { error } = await supabase
        .from('bacenta_meetings')
        .insert([{
          group_id: group.id,
          meeting_date: meetingForm.date,
          attendance: meetingForm.attendance,
          first_timers: meetingForm.first_timers,
          converts: meetingForm.converts,
          testimonies_count: meetingForm.testimonies_count,
          attendance_coming_sunday: meetingForm.attendance_coming_sunday,
          absent_but_coming_sunday: meetingForm.absent_but_coming_sunday,
          picture_url: pictureUrl,
          comments: meetingForm.comments || null,
          logged_by: user.id
        }])

      if (error) throw error

      alert('Meeting logged successfully')
      setShowLogMeeting(false)

      setMeetingForm({
        date: new Date().toISOString().split('T')[0],
        attendance: 0,
        first_timers: 0,
        converts: 0,
        testimonies_count: 0,
        attendance_coming_sunday: 0,
        absent_but_coming_sunday: 0,
        comments: ''
      })
      setPictureFile(null)
      setPicturePreview(null)

      loadData()
    } catch (error) {
      console.error('Error logging meeting:', error)
      alert('Error logging meeting')
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('bacenta_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      alert('Member removed successfully')
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mb-4"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If no group assigned
  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl border-2 border-slate-200 p-8 text-center">
          <svg className="w-20 h-20 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">No Bacenta Group Assigned</h2>
          <p className="text-slate-600 mb-6">Please contact your church leader to be assigned a bacenta group.</p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition"
          >
            Sign Out
          </button>
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
              Bacenta Leader
            </p>
            <h1 className="text-2xl font-serif font-bold text-white">
              {group.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1">
              {group.location} • {group.meeting_day}s at {group.meeting_time || 'TBD'}
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
            { label: 'Avg Attendance', value: stats.avgAttendance.toFixed(1) },
            { label: 'Converts', value: stats.totalConverts },
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
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
                    {meeting.picture_url && (
                      <img 
                        src={meeting.picture_url} 
                        alt="Bacenta meeting" 
                        className="w-24 h-24 object-cover rounded-lg border-2 border-slate-200"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="text-xl font-bold text-blue-800">{meeting.attendance}</div>
                      <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide mt-1">Attendance</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="text-xl font-bold text-green-800">{meeting.first_timers}</div>
                      <div className="text-xs text-green-600 font-semibold uppercase tracking-wide mt-1">First Timers</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="text-xl font-bold text-purple-800">{meeting.converts}</div>
                      <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide mt-1">Converts</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="text-xl font-bold text-orange-800">{meeting.testimonies_count}</div>
                      <div className="text-xs text-orange-600 font-semibold uppercase tracking-wide mt-1">Testimonies</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                      <div className="text-xl font-bold text-cyan-800">{meeting.attendance_coming_sunday}</div>
                      <div className="text-xs text-cyan-600 font-semibold uppercase tracking-wide mt-1">Coming Sunday</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div className="text-xl font-bold text-yellow-800">{meeting.absent_but_coming_sunday}</div>
                      <div className="text-xs text-yellow-600 font-semibold uppercase tracking-wide mt-1">Absent but Coming</div>
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-slate-800">Bacenta Members</h2>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{stats.basontaMembers}</span> also in Basonta
            </p>
          </div>
          {members.length > 0 ? (
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{member.name}</p>
                      {member.is_basonta_member && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-semibold">
                          Basonta
                        </span>
                      )}
                    </div>
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
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-10 px-4 border-t-4 border-slate-900 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-300">{getChurchName.full()}</p>
          <p className="text-slate-400 text-sm mt-2">&copy; {APP_CONFIG.copyrightYear} All rights reserved</p>
        </div>
      </footer>

      {/* ── Add Member Modal ── */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Add New Member</h2>
            <p className="text-slate-500 text-sm mb-8">Add a member to {group.name}</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  placeholder="Member's full name"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Phone Number <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={newMemberForm.phone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  placeholder="+36 XX XXX XXXX"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                <input
                  type="checkbox"
                  id="is_basonta"
                  checked={newMemberForm.is_basonta_member}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, is_basonta_member: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-slate-800"
                />
                <label htmlFor="is_basonta" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  This member is also in a Basonta group
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddMember}
                disabled={!newMemberForm.name.trim()}
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
              <button
                onClick={() => {
                  setShowAddMember(false)
                  setNewMemberForm({ name: '', phone: '', is_basonta_member: false })
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
            <p className="text-slate-500 text-sm mb-8">Record attendance and activities for this bacenta meeting</p>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    Attendance
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={meetingForm.attendance}
                    onChange={(e) => setMeetingForm({...meetingForm, attendance: parseInt(e.target.value) || 0})}
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
                    value={meetingForm.first_timers}
                    onChange={(e) => setMeetingForm({...meetingForm, first_timers: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    Converts
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={meetingForm.converts}
                    onChange={(e) => setMeetingForm({...meetingForm, converts: parseInt(e.target.value) || 0})}
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
                    value={meetingForm.testimonies_count}
                    onChange={(e) => setMeetingForm({...meetingForm, testimonies_count: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    Coming Sunday
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={meetingForm.attendance_coming_sunday}
                    onChange={(e) => setMeetingForm({...meetingForm, attendance_coming_sunday: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Planning to attend Sunday service</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                    Absent but Coming
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={meetingForm.absent_but_coming_sunday}
                    onChange={(e) => setMeetingForm({...meetingForm, absent_but_coming_sunday: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Absent today but coming Sunday</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Bacenta Picture <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                {picturePreview && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-2 font-semibold">Preview:</p>
                    <img
                      src={picturePreview}
                      alt="Preview"
                      className="max-w-full h-48 object-contain rounded-lg border-2 border-slate-300"
                    />
                  </div>
                )}
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
                disabled={uploading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading Picture...' : 'Log Meeting'}
              </button>
              <button
                onClick={() => {
                  setShowLogMeeting(false)
                  setMeetingForm({
                    date: new Date().toISOString().split('T')[0],
                    attendance: 0,
                    first_timers: 0,
                    converts: 0,
                    testimonies_count: 0,
                    attendance_coming_sunday: 0,
                    absent_but_coming_sunday: 0,
                    comments: ''
                  })
                  setPictureFile(null)
                  setPicturePreview(null)
                }}
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