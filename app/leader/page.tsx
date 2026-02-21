'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PrayerRequest {
  id: string; title: string; description: string; category: string
  privacy_level: string; requester_name: string | null
  requester_phone: string | null; requester_email: string | null
  timeline: string | null; timeline_days: number | null
  created_at: string; status: string
}
interface Warrior { id: string; name: string; email: string }
interface PrayerCommitment {
  id: string; request_id: string; warrior_id: string
  total_hours_target: number; hours_completed: number
  deadline: string | null; completed: boolean; users: Warrior
}
interface RequestWithCommitments extends PrayerRequest {
  commitments: PrayerCommitment[]; total_hours: number; warriors_count: number
}
interface BasontaGroup {
  id: string; name: string; prayer_day: string; prayer_time: string | null
  created_at: string; users: { name: string; email: string }
}
interface BasontaMeeting {
  id: string; group_id: string; meeting_date: string; people_present: number
  first_timers: number; testimonies_count: number; comments: string | null
  created_at: string; basonta_groups: { name: string }
}
interface GroupWithStats extends BasontaGroup {
  totalMeetings: number; avgAttendance: number; totalFirstTimers: number
  totalTestimonies: number; memberCount: number; lastMeetingDate: string | null
}
interface Announcement {
  id: string; title: string; description: string; category: string
  flyer_url: string | null; event_date: string | null; expires_at: string | null
  created_at: string; priority: number; is_active: boolean
}
interface FirstTimer {
  id: string; name: string; phone: string | null; visit_date: string
  source: string; notes: string | null; converted: boolean; created_at: string
}
interface ChurchMember {
  id: string; name: string; phone: string | null; address: string | null
  assigned_shepherd_id: string | null; created_at: string
  shepherd?: { name: string; email: string } | null
}
interface Shepherd {
  id: string; name: string; email: string
}
interface ShepherdingAssignment {
  id: string; member_id: string; shepherd_id: string
  assigned_at: string; notes: string | null
  church_members: ChurchMember; users: Shepherd
}
interface FollowUpTask {
  id: string; member_id: string; shepherd_id: string; due_date: string | null
  notes: string | null; completed: boolean; created_at: string
  church_members: ChurchMember; users: Shepherd
}
// ── NEW: Pending Users type ───────────────────────────────────────────────────
interface PendingUser {
  id: string; email: string; name: string
  requested_role: string; notes: string | null
  status: string; created_at: string
}

type Tab = 'prayers' | 'basonta' | 'firsttimers' | 'members' | 'shepherding' | 'announcements' | 'pending'

export default function LeaderDashboard() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('prayers')
  const router = useRouter()

  // Prayer
  const [requests, setRequests] = useState<RequestWithCommitments[]>([])
  const [warriors, setWarriors] = useState<Warrior[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RequestWithCommitments | null>(null)
  const [prayerStats, setPrayerStats] = useState({ totalRequests: 0, totalHours: 0, activeWarriors: 0, answeredPrayers: 0 })
  const [filter, setFilter] = useState<'all' | 'active' | 'answered'>('active')

  // Basonta
  const [basontaGroups, setBasontaGroups] = useState<GroupWithStats[]>([])
  const [allMeetings, setAllMeetings] = useState<BasontaMeeting[]>([])
  const [selectedGroup, setSelectedGroup] = useState<GroupWithStats | null>(null)
  const [groupMeetings, setGroupMeetings] = useState<BasontaMeeting[]>([])
  const [basontaStats, setBasontaStats] = useState({ totalGroups: 0, totalMeetings: 0, totalFirstTimers: 0, totalTestimonies: 0, avgAttendanceRate: 0, mostActiveGroup: '' })

  // First Timers
  const [firstTimers, setFirstTimers] = useState<FirstTimer[]>([])
  const [showAddFirstTimer, setShowAddFirstTimer] = useState(false)
  const [firstTimerForm, setFirstTimerForm] = useState({ name: '', phone: '', visit_date: new Date().toISOString().split('T')[0], source: 'manual', notes: '' })

  // Church Members
  const [members, setMembers] = useState<ChurchMember[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', address: '' })
  const [shepherds, setShepherds] = useState<Shepherd[]>([])

  // Shepherding
  const [assignments, setAssignments] = useState<ShepherdingAssignment[]>([])
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showFollowUpModal, setShowFollowUpModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ member_id: '', shepherd_id: '', notes: '' })
  const [followUpForm, setFollowUpForm] = useState({ member_id: '', shepherd_id: '', due_date: '', notes: '' })

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  // ── NEW: Pending Users state ──────────────────────────────────────────────────
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingCount, setPendingCount] = useState(0)

  const [loading, setLoading] = useState(true)

  useEffect(() => { checkUser() }, [])
  useEffect(() => { loadTabData() }, [activeTab, filter])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
    // Load pending count for the badge on the tab
    const { count } = await supabase
      .from('pending_users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    setPendingCount(count || 0)
  }

  const loadTabData = async () => {
    setLoading(true)
    if (activeTab === 'prayers') await loadPrayerData()
    else if (activeTab === 'basonta') await loadBasontaData()
    else if (activeTab === 'firsttimers') await loadFirstTimers()
    else if (activeTab === 'members') await loadMembers()
    else if (activeTab === 'shepherding') await loadShepherding()
    else if (activeTab === 'announcements') await loadAnnouncements()
    else if (activeTab === 'pending') await loadPendingUsers()  // ── NEW
    setLoading(false)
  }

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadPrayerData = async () => {
    let query = supabase.from('prayer_requests').select('*').order('created_at', { ascending: false })
    if (filter === 'active') query = query.eq('status', 'active')
    else if (filter === 'answered') query = query.eq('status', 'answered')
    const { data: requestsData } = await query
    const { data: commitmentsData } = await supabase.from('prayer_commitments').select('*, users (id, name, email)')
    const { data: logsData } = await supabase.from('prayer_logs').select('*')
    const requestsWithCommitments = requestsData?.map(r => ({
      ...r,
      commitments: commitmentsData?.filter(c => c.request_id === r.id) || [],
      total_hours: logsData?.filter(l => l.request_id === r.id).reduce((s, l) => s + l.duration_minutes / 60, 0) || 0,
      warriors_count: commitmentsData?.filter(c => c.request_id === r.id).length || 0
    })) || []
    setRequests(requestsWithCommitments)
    const { data: warriorsData } = await supabase.from('users').select('id, name, email').in('role', ['warrior', 'leader'])
    setWarriors(warriorsData || [])
    setPrayerStats({
      totalRequests: requestsData?.length || 0,
      totalHours: logsData?.reduce((s, l) => s + l.duration_minutes / 60, 0) || 0,
      activeWarriors: new Set(commitmentsData?.map(c => c.warrior_id)).size,
      answeredPrayers: requestsData?.filter(r => r.status === 'answered').length || 0
    })
  }

  const loadBasontaData = async () => {
    const { data: groupsData } = await supabase.from('basonta_groups').select('*, users (name, email)').order('name')
    const { data: meetingsData } = await supabase.from('basonta_meetings').select('*, basonta_groups (name)').order('meeting_date', { ascending: false })
    setAllMeetings(meetingsData || [])
    const groupsWithStats: GroupWithStats[] = []
    for (const group of groupsData || []) {
      const gm = meetingsData?.filter(m => m.group_id === group.id) || []
      const { count: memberCount } = await supabase.from('basonta_members').select('*', { count: 'exact', head: true }).eq('group_id', group.id)
      groupsWithStats.push({
        ...group,
        totalMeetings: gm.length,
        avgAttendance: gm.length > 0 ? gm.reduce((s, m) => s + m.people_present, 0) / gm.length : 0,
        totalFirstTimers: gm.reduce((s, m) => s + (m.first_timers || 0), 0),
        totalTestimonies: gm.reduce((s, m) => s + (m.testimonies_count || 0), 0),
        memberCount: memberCount || 0,
        lastMeetingDate: gm[0]?.meeting_date || null
      })
    }
    setBasontaGroups(groupsWithStats)
    const mostActive = groupsWithStats.reduce((max, g) => g.totalMeetings > max.totalMeetings ? g : max, groupsWithStats[0] || { totalMeetings: 0, name: 'N/A' })
    setBasontaStats({
      totalGroups: groupsWithStats.length,
      totalMeetings: meetingsData?.length || 0,
      totalFirstTimers: meetingsData?.reduce((s, m) => s + (m.first_timers || 0), 0) || 0,
      totalTestimonies: meetingsData?.reduce((s, m) => s + (m.testimonies_count || 0), 0) || 0,
      avgAttendanceRate: 0,
      mostActiveGroup: mostActive?.name || 'N/A'
    })
  }

  const loadFirstTimers = async () => {
    const { data } = await supabase.from('first_timers').select('*').order('visit_date', { ascending: false })
    setFirstTimers(data || [])
  }

  const loadMembers = async () => {
    const { data } = await supabase.from('church_members').select('*, shepherd:users!assigned_shepherd_id(name, email)').order('name')
    setMembers(data || [])
    const { data: shepherdData } = await supabase.from('users').select('id, name, email').eq('role', 'shepherd')
    setShepherds(shepherdData || [])
  }

  const loadShepherding = async () => {
    const { data: assignData } = await supabase.from('shepherding_assignments').select('*, church_members(*), users(id, name, email)').order('assigned_at', { ascending: false })
    setAssignments(assignData || [])
    const { data: followData } = await supabase.from('follow_up_tasks').select('*, church_members(*), users(id, name, email)').order('due_date', { ascending: true })
    setFollowUps(followData || [])
    const { data: shepherdData } = await supabase.from('users').select('id, name, email').eq('role', 'shepherd')
    setShepherds(shepherdData || [])
    const { data: membersData } = await supabase.from('church_members').select('*').order('name')
    setMembers(membersData || [])
  }

  const loadAnnouncements = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }

  // ── NEW: Load pending users ───────────────────────────────────────────────────
  const loadPendingUsers = async () => {
    const { data } = await supabase
      .from('pending_users')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setPendingUsers(data || [])
    setPendingCount(data?.length || 0)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleMarkAnswered = async (id: string) => {
    await supabase.from('prayer_requests').update({ status: 'answered', answered_at: new Date().toISOString() }).eq('id', id)
    loadPrayerData(); setSelectedRequest(null)
  }

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Delete this prayer request?')) return
    await supabase.from('prayer_requests').delete().eq('id', id)
    loadPrayerData(); setSelectedRequest(null)
  }

  const handleReassign = async (commitmentId: string, newWarriorId: string) => {
    if (!confirm('Reassign this prayer?')) return
    await supabase.from('prayer_commitments').update({ warrior_id: newWarriorId }).eq('id', commitmentId)
    loadPrayerData(); setSelectedRequest(null)
  }

  const handleViewGroup = async (group: GroupWithStats) => {
    setSelectedGroup(group)
    const { data } = await supabase.from('basonta_meetings').select('*').eq('group_id', group.id).order('meeting_date', { ascending: false })
    setGroupMeetings(data || [])
  }

  const handleAddFirstTimer = async () => {
    if (!firstTimerForm.name.trim()) return
    await supabase.from('first_timers').insert([{ name: firstTimerForm.name.trim(), phone: firstTimerForm.phone || null, visit_date: firstTimerForm.visit_date, source: firstTimerForm.source, notes: firstTimerForm.notes || null, converted: false }])
    setFirstTimerForm({ name: '', phone: '', visit_date: new Date().toISOString().split('T')[0], source: 'manual', notes: '' })
    setShowAddFirstTimer(false); loadFirstTimers()
  }

  const handlePromoteToMember = async (ft: FirstTimer) => {
    if (!confirm(`Add ${ft.name} to the Church Members list?`)) return
    await supabase.from('church_members').insert([{ name: ft.name, phone: ft.phone || null, address: null }])
    await supabase.from('first_timers').update({ converted: true }).eq('id', ft.id)
    loadFirstTimers()
  }

  const handleDeleteFirstTimer = async (id: string) => {
    if (!confirm('Remove this first timer?')) return
    await supabase.from('first_timers').delete().eq('id', id)
    loadFirstTimers()
  }

  const handleAddMember = async () => {
    if (!memberForm.name.trim()) return
    await supabase.from('church_members').insert([{ name: memberForm.name.trim(), phone: memberForm.phone || null, address: memberForm.address || null }])
    setMemberForm({ name: '', phone: '', address: '' })
    setShowAddMember(false); loadMembers()
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Remove this church member?')) return
    await supabase.from('church_members').delete().eq('id', id)
    loadMembers()
  }

  const handleAssignShepherd = async () => {
    if (!assignForm.member_id || !assignForm.shepherd_id) return
    await supabase.from('shepherding_assignments').insert([{ member_id: assignForm.member_id, shepherd_id: assignForm.shepherd_id, notes: assignForm.notes || null }])
    await supabase.from('church_members').update({ assigned_shepherd_id: assignForm.shepherd_id }).eq('id', assignForm.member_id)
    setAssignForm({ member_id: '', shepherd_id: '', notes: '' })
    setShowAssignModal(false); loadShepherding()
  }

  const handleAssignFollowUp = async () => {
    if (!followUpForm.member_id || !followUpForm.shepherd_id) return
    await supabase.from('follow_up_tasks').insert([{ member_id: followUpForm.member_id, shepherd_id: followUpForm.shepherd_id, due_date: followUpForm.due_date || null, notes: followUpForm.notes || null, completed: false }])
    setFollowUpForm({ member_id: '', shepherd_id: '', due_date: '', notes: '' })
    setShowFollowUpModal(false); loadShepherding()
  }

  const handleToggleAnnouncement = async (id: string, current: boolean) => {
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id)
    loadAnnouncements()
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    loadAnnouncements()
  }

  // ── NEW: Approve / Reject pending user ────────────────────────────────────────
  const handleApproveUser = async (pending: PendingUser) => {
    if (!confirm(`Approve ${pending.name} as ${pending.requested_role.replace(/_/g, ' ')}?`)) return
    try {
      const { error: userError } = await supabase
        .from('users')
        .insert([{ email: pending.email, name: pending.name, role: pending.requested_role }])
      if (userError) {
        // User row already exists — just update the role
        await supabase.from('users').update({ role: pending.requested_role, name: pending.name }).eq('email', pending.email)
      }
      await supabase.from('pending_users').update({ status: 'approved' }).eq('id', pending.id)
      alert(`${pending.name} has been approved. They can now log in.`)
      loadPendingUsers()
    } catch (err: any) {
      alert(`Error approving user: ${err.message}`)
    }
  }

  const handleRejectUser = async (pending: PendingUser) => {
    if (!confirm(`Reject ${pending.name}'s request?`)) return
    await supabase.from('pending_users').update({ status: 'rejected' }).eq('id', pending.id)
    alert(`${pending.name}'s request has been rejected.`)
    loadPendingUsers()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'General': 'bg-blue-100 text-blue-800 border-blue-200', 'Events': 'bg-purple-100 text-purple-800 border-purple-200',
      'Services': 'bg-green-100 text-green-800 border-green-200', 'Ministry': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Youth': 'bg-pink-100 text-pink-800 border-pink-200', 'Worship': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Community': 'bg-orange-100 text-orange-800 border-orange-200', 'Urgent': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  // ── Tab config ────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'prayers', label: 'Prayer Requests' },
    { id: 'basonta', label: 'Basonta' },
    { id: 'firsttimers', label: 'First Timers' },
    { id: 'members', label: 'Church Members' },
    { id: 'shepherding', label: 'Shepherding' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'pending', label: 'Pending Users', badge: pendingCount },  // ── NEW
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Church Leadership</p>
            <h1 className="text-2xl font-serif font-bold text-white">Leadership Dashboard</h1>
            <p className="text-slate-300 text-sm mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-all">Sign Out</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 px-5 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                {/* ── NEW: red badge for pending count ── */}
                {tab.badge && tab.badge > 0 ? (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* ══ PRAYERS TAB ══════════════════════════════════════════════════════ */}
            {activeTab === 'prayers' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                  {[
                    { label: 'Total Requests', value: prayerStats.totalRequests },
                    { label: 'Prayer Hours', value: prayerStats.totalHours.toFixed(1) },
                    { label: 'Active Warriors', value: prayerStats.activeWarriors },
                    { label: 'Answered', value: prayerStats.answeredPrayers },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg border-2 border-slate-200 p-5 hover:border-slate-300 hover:shadow-lg transition-all">
                      <div className="text-3xl font-bold text-slate-800">{s.value}</div>
                      <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mb-6">
                  {(['all', 'active', 'answered'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${filter === f ? 'bg-slate-800 text-white' : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                      {f}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {requests.map(request => (
                    <div key={request.id} className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 rounded border bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold uppercase tracking-wide">{request.category}</span>
                        {request.status === 'answered' && <span className="px-3 py-1 rounded border bg-green-100 text-green-800 border-green-200 text-xs font-semibold uppercase tracking-wide">Answered</span>}
                        {request.privacy_level === 'anonymous' && <span className="px-3 py-1 rounded border bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold uppercase tracking-wide">Anonymous</span>}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{request.title}</h3>
                      {request.requester_name && <p className="text-sm text-slate-500 mb-2">Submitted by {request.requester_name}</p>}
                      <p className="text-slate-600 text-sm line-clamp-2 mb-4">{request.description}</p>
                      <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                        {[{ v: request.warriors_count, l: 'Warriors' }, { v: request.total_hours.toFixed(1), l: 'Hours' }, { v: request.commitments.filter(c => c.completed).length, l: 'Complete' }].map(s => (
                          <div key={s.l} className="text-center">
                            <div className="text-xl font-bold text-slate-800">{s.v}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedRequest(request)} className="flex-1 bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-700 transition-all text-sm">View Details</button>
                        {request.status === 'active' && <button onClick={() => handleMarkAnswered(request.id)} className="px-4 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 font-semibold transition-all text-sm">Mark Answered</button>}
                        <button onClick={() => handleDeleteRequest(request.id)} className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-all text-sm">Delete</button>
                      </div>
                    </div>
                  ))}
                  {requests.length === 0 && (
                    <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <p className="text-slate-500 text-lg">No prayer requests found</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ BASONTA TAB ══════════════════════════════════════════════════════ */}
            {activeTab === 'basonta' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
                  {[
                    { label: 'Groups', value: basontaStats.totalGroups },
                    { label: 'Meetings', value: basontaStats.totalMeetings },
                    { label: 'First Timers', value: basontaStats.totalFirstTimers },
                    { label: 'Testimonies', value: basontaStats.totalTestimonies },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-slate-300 transition-all">
                      <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                      <div className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                  {basontaGroups.map(group => (
                    <div key={group.id} className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-xl transition-all">
                      <h3 className="text-lg font-bold text-slate-800">{group.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">Leader: {group.users.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{group.prayer_day}s at {group.prayer_time}</p>
                      <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                        {[{ v: group.memberCount, l: 'Members', c: 'bg-blue-50 text-blue-800 border-blue-100' }, { v: group.totalMeetings, l: 'Meetings', c: 'bg-green-50 text-green-800 border-green-100' }, { v: group.totalFirstTimers, l: 'First Timers', c: 'bg-purple-50 text-purple-800 border-purple-100' }, { v: group.totalTestimonies, l: 'Testimonies', c: 'bg-orange-50 text-orange-800 border-orange-100' }].map(s => (
                          <div key={s.l} className={`text-center p-2 rounded-lg border ${s.c}`}>
                            <div className="text-lg font-bold">{s.v}</div>
                            <div className="text-xs font-semibold mt-0.5">{s.l}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => handleViewGroup(group)} className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-700 transition-all text-sm">View Details</button>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg border-2 border-slate-200 p-8">
                  <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Recent Meetings</h2>
                  {allMeetings.slice(0, 10).map(meeting => (
                    <div key={meeting.id} className="p-5 bg-slate-50 rounded-lg border-2 border-slate-200 mb-4">
                      <p className="font-bold text-slate-800">{meeting.basonta_groups.name}</p>
                      <p className="text-sm text-slate-500 mt-1">{new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        {[{ v: meeting.people_present, l: 'Present', c: 'bg-blue-50 text-blue-800 border-blue-100' }, { v: meeting.first_timers, l: 'First Timers', c: 'bg-green-50 text-green-800 border-green-100' }, { v: meeting.testimonies_count, l: 'Testimonies', c: 'bg-purple-50 text-purple-800 border-purple-100' }].map(s => (
                          <div key={s.l} className={`text-center p-2 rounded-lg border ${s.c}`}>
                            <div className="text-lg font-bold">{s.v}</div>
                            <div className="text-xs font-semibold mt-0.5">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ══ FIRST TIMERS TAB ═════════════════════════════════════════════════ */}
            {activeTab === 'firsttimers' && (
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">First Timers</h2>
                    <p className="text-slate-500 text-sm mt-1">Track and follow up with new visitors</p>
                  </div>
                  <button onClick={() => setShowAddFirstTimer(true)} className="px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg">
                    Add First Timer
                  </button>
                </div>

                <div className="space-y-3">
                  {firstTimers.map(ft => (
                    <div key={ft.id} className={`bg-white rounded-lg border-2 p-5 hover:shadow-lg transition-all ${ft.converted ? 'border-green-200 opacity-70' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-slate-800 text-lg">{ft.name}</h3>
                            {ft.converted && <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-semibold uppercase tracking-wide">Member</span>}
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-semibold uppercase tracking-wide">{ft.source}</span>
                          </div>
                          {ft.phone && <p className="text-sm text-slate-500">{ft.phone}</p>}
                          <p className="text-xs text-slate-400 mt-1">Visited: {new Date(ft.visit_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          {ft.notes && <p className="text-sm text-slate-600 mt-2 italic">{ft.notes}</p>}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!ft.converted && (
                            <button onClick={() => handlePromoteToMember(ft)} className="px-3 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 text-xs font-semibold transition-all">
                              Add to Members
                            </button>
                          )}
                          <button onClick={() => handleDeleteFirstTimer(ft.id)} className="px-3 py-2 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-semibold transition-all">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {firstTimers.length === 0 && (
                    <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <p className="text-slate-500 text-lg">No first timers recorded yet</p>
                      <p className="text-slate-400 text-sm mt-1">Add visitors manually or they will appear automatically from Basonta meeting logs</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ CHURCH MEMBERS TAB ═══════════════════════════════════════════════ */}
            {activeTab === 'members' && (
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Church Members</h2>
                    <p className="text-slate-500 text-sm mt-1">{members.length} registered members</p>
                  </div>
                  <button onClick={() => setShowAddMember(true)} className="px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg">
                    Add Member
                  </button>
                </div>

                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id} className="bg-white rounded-lg border-2 border-slate-200 p-5 hover:border-slate-300 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 text-lg">{member.name}</h3>
                          {member.phone && <p className="text-sm text-slate-500 mt-0.5">{member.phone}</p>}
                          {member.address && <p className="text-sm text-slate-500 mt-0.5">{member.address}</p>}
                          {member.shepherd && (
                            <p className="text-xs text-slate-400 mt-2">
                              Shepherd: <span className="font-semibold text-slate-600">{member.shepherd.name}</span>
                            </p>
                          )}
                        </div>
                        <button onClick={() => handleDeleteMember(member.id)} className="px-3 py-2 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-semibold transition-all ml-4">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <p className="text-slate-500 text-lg">No church members yet</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ SHEPHERDING TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'shepherding' && (
              <>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Shepherding</h2>
                    <p className="text-slate-500 text-sm mt-1">Assign members to shepherds and manage follow-ups</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAssignModal(true)} className="px-5 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg text-sm">
                      Assign Shepherd
                    </button>
                    <button onClick={() => setShowFollowUpModal(true)} className="px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg text-sm">
                      Assign Follow-Up
                    </button>
                  </div>
                </div>

                <div className="mb-10">
                  <h3 className="text-lg font-serif font-bold text-slate-800 mb-5">Current Assignments</h3>
                  <div className="space-y-3">
                    {assignments.map(a => (
                      <div key={a.id} className="bg-white rounded-lg border-2 border-slate-200 p-5 hover:border-slate-300 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800">{a.church_members.name}</p>
                            <p className="text-sm text-slate-500 mt-0.5">Shepherd: <span className="font-semibold text-slate-700">{a.users.name}</span></p>
                            <p className="text-xs text-slate-400 mt-1">Assigned {new Date(a.assigned_at).toLocaleDateString()}</p>
                            {a.notes && <p className="text-sm text-slate-600 mt-2 italic">{a.notes}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {assignments.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-slate-200">
                        <p className="text-slate-500">No shepherding assignments yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-serif font-bold text-slate-800 mb-5">Follow-Up Tasks</h3>
                  <div className="space-y-3">
                    {followUps.map(f => (
                      <div key={f.id} className={`bg-white rounded-lg border-2 p-5 transition-all ${f.completed ? 'border-green-200 opacity-70' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800">{f.church_members.name}</p>
                            <p className="text-sm text-slate-500 mt-0.5">Assigned to: <span className="font-semibold text-slate-700">{f.users.name}</span></p>
                            {f.due_date && <p className="text-xs text-slate-400 mt-1">Due: {new Date(f.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                            {f.notes && <p className="text-sm text-slate-600 mt-2 italic">{f.notes}</p>}
                          </div>
                          {f.completed && <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-semibold uppercase tracking-wide">Complete</span>}
                        </div>
                      </div>
                    ))}
                    {followUps.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-slate-200">
                        <p className="text-slate-500">No follow-up tasks assigned yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ══ ANNOUNCEMENTS TAB ════════════════════════════════════════════════ */}
            {activeTab === 'announcements' && (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Announcements</h2>
                  <a href="/announcements/create" className="px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-lg text-sm">
                    Create Announcement
                  </a>
                </div>

                {announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.map(a => (
                      <div key={a.id} className={`bg-white rounded-lg border-2 border-slate-200 p-6 transition-all ${!a.is_active ? 'opacity-60' : 'hover:border-slate-300 hover:shadow-lg'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className={`px-3 py-1 rounded border text-xs font-semibold uppercase tracking-wide ${getCategoryColor(a.category)}`}>{a.category}</span>
                              {a.priority > 0 && <span className="px-3 py-1 rounded border bg-red-100 text-red-800 border-red-200 text-xs font-semibold uppercase tracking-wide">Important</span>}
                              {!a.is_active && <span className="px-3 py-1 rounded border bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold uppercase tracking-wide">Inactive</span>}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{a.title}</h3>
                            <p className="text-slate-600 text-sm line-clamp-2 mb-3">{a.description}</p>
                            {a.event_date && <p className="text-xs text-slate-400">Event: {new Date(a.event_date).toLocaleString()}</p>}
                          </div>
                          {a.flyer_url && <img src={a.flyer_url} alt={a.title} className="w-24 h-24 object-cover rounded-lg border-2 border-slate-200 ml-4" />}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleToggleAnnouncement(a.id, a.is_active)} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${a.is_active ? 'bg-orange-100 text-orange-800 border-2 border-orange-200 hover:bg-orange-200' : 'bg-green-100 text-green-800 border-2 border-green-200 hover:bg-green-200'}`}>
                            {a.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDeleteAnnouncement(a.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold text-sm transition-all">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <p className="text-slate-500 text-lg">No announcements yet</p>
                  </div>
                )}
              </>
            )}

            {/* ══ NEW: PENDING USERS TAB ════════════════════════════════════════════ */}
            {activeTab === 'pending' && (
              <>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Pending User Requests</h2>
                    <p className="text-slate-500 text-sm mt-1">Review and approve new staff access requests</p>
                  </div>
                </div>

                {pendingUsers.length > 0 ? (
                  <div className="space-y-4">
                    {pendingUsers.map(pending => (
                      <div key={pending.id} className="bg-white rounded-lg border-2 border-amber-200 p-6 hover:border-amber-300 transition-all">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="font-bold text-slate-800 text-lg">{pending.name}</h3>
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-semibold uppercase tracking-wide">Pending</span>
                              <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold uppercase tracking-wide">
                                {pending.requested_role.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="text-slate-600 text-sm">{pending.email}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Requested {new Date(pending.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            {pending.notes && (
                              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes from applicant</p>
                                <p className="text-sm text-slate-700 italic">{pending.notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleApproveUser(pending)}
                              className="px-6 py-2.5 bg-green-700 text-white rounded-lg hover:bg-green-800 font-semibold text-sm transition-all shadow-md"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectUser(pending)}
                              className="px-6 py-2.5 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-semibold text-sm transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-lg">No pending requests</p>
                    <p className="text-slate-400 text-sm mt-1">New signup requests will appear here</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-10 px-4 border-t-4 border-slate-900 mt-16">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-300">Church Prayer Management System</p>
          <p className="text-slate-400 text-sm mt-2">&copy; 2026 All rights reserved</p>
        </div>
      </footer>

      {/* ── Prayer Detail Modal ── */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-800 mb-3">{selectedRequest.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded border bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold uppercase tracking-wide">{selectedRequest.category}</span>
                  {selectedRequest.requester_name && <span className="text-sm text-slate-600">by {selectedRequest.requester_name}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-700 text-2xl transition-colors">&times;</button>
            </div>
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Prayer Request</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
            </div>
            {selectedRequest.requester_phone && <p className="text-sm text-slate-600 mb-1">Phone: {selectedRequest.requester_phone}</p>}
            {selectedRequest.requester_email && <p className="text-sm text-slate-600 mb-6">Email: {selectedRequest.requester_email}</p>}
            {selectedRequest.commitments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Prayer Warriors</h3>
                <div className="space-y-3">
                  {selectedRequest.commitments.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <div>
                        <p className="font-semibold text-slate-800">{c.users.name}</p>
                        <p className="text-sm text-slate-500">{c.hours_completed.toFixed(1)} / {c.total_hours_target}h</p>
                        <div className="w-32 bg-slate-200 rounded-full h-1.5 mt-2">
                          <div className="bg-slate-800 h-1.5 rounded-full" style={{ width: `${Math.min((c.hours_completed / c.total_hours_target) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <select onChange={(e) => { if (e.target.value) handleReassign(c.id, e.target.value) }} className="ml-4 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-slate-800 bg-white" defaultValue="">
                        <option value="">Reassign</option>
                        {warriors.filter(w => w.id !== c.warrior_id).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              {selectedRequest.status === 'active' && <button onClick={() => handleMarkAnswered(selectedRequest.id)} className="flex-1 bg-green-700 text-white py-3 rounded-lg font-semibold hover:bg-green-800 transition-all">Mark as Answered</button>}
              <button onClick={() => setSelectedRequest(null)} className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Basonta Group Modal ── */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-800 mb-1">{selectedGroup.name}</h2>
                <p className="text-slate-500 text-sm">Leader: {selectedGroup.users.name} &mdash; {selectedGroup.prayer_day}s at {selectedGroup.prayer_time}</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="text-slate-400 hover:text-slate-700 text-2xl transition-colors">&times;</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[{ v: selectedGroup.memberCount, l: 'Members', c: 'bg-blue-50 text-blue-800 border-blue-200' }, { v: selectedGroup.totalMeetings, l: 'Meetings', c: 'bg-green-50 text-green-800 border-green-200' }, { v: selectedGroup.totalFirstTimers, l: 'First Timers', c: 'bg-purple-50 text-purple-800 border-purple-200' }, { v: selectedGroup.totalTestimonies, l: 'Testimonies', c: 'bg-orange-50 text-orange-800 border-orange-200' }].map(s => (
                <div key={s.l} className={`text-center p-4 rounded-lg border-2 ${s.c}`}>
                  <div className="text-2xl font-bold">{s.v}</div>
                  <div className="text-xs font-semibold mt-1 uppercase tracking-wide">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {groupMeetings.map(m => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <p className="font-bold text-slate-800">{new Date(m.meeting_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[{ v: m.people_present, l: 'Present' }, { v: m.first_timers, l: 'First Timers' }, { v: m.testimonies_count, l: 'Testimonies' }, { v: selectedGroup.memberCount > 0 ? `${Math.round((m.people_present / selectedGroup.memberCount) * 100)}%` : '0%', l: 'Rate' }].map(s => (
                      <div key={s.l} className="text-center p-2 bg-white rounded-lg border-2 border-slate-200">
                        <div className="font-bold text-slate-800">{s.v}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                  {m.comments && <p className="text-sm text-slate-600 mt-3 p-3 bg-white rounded-lg border border-slate-200">{m.comments}</p>}
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedGroup(null)} className="w-full mt-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">Close</button>
          </div>
        </div>
      )}

      {/* ── Add First Timer Modal ── */}
      {showAddFirstTimer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Add First Timer</h2>
            <p className="text-slate-500 text-sm mb-8">Record a new visitor to the church</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Full Name</label>
                <input type="text" value={firstTimerForm.name} onChange={e => setFirstTimerForm({ ...firstTimerForm, name: e.target.value })} placeholder="Visitor's full name" className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Phone <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <input type="tel" value={firstTimerForm.phone} onChange={e => setFirstTimerForm({ ...firstTimerForm, phone: e.target.value })} placeholder="+1234567890" className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Visit Date</label>
                <input type="date" value={firstTimerForm.visit_date} onChange={e => setFirstTimerForm({ ...firstTimerForm, visit_date: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Source</label>
                <select value={firstTimerForm.source} onChange={e => setFirstTimerForm({ ...firstTimerForm, source: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors">
                  <option value="manual">Manual Entry</option>
                  <option value="basonta">Basonta Meeting</option>
                  <option value="service">Sunday Service</option>
                  <option value="event">Church Event</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Notes <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <textarea value={firstTimerForm.notes} onChange={e => setFirstTimerForm({ ...firstTimerForm, notes: e.target.value })} placeholder="Any notes about the visitor..." rows={3} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleAddFirstTimer} disabled={!firstTimerForm.name.trim()} className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed">Add First Timer</button>
              <button onClick={() => setShowAddFirstTimer(false)} className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ── */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Add Church Member</h2>
            <p className="text-slate-500 text-sm mb-8">Add a new member to the church directory</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Full Name</label>
                <input type="text" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Member's full name" className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Phone <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <input type="tel" value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="+1234567890" className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Address <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <textarea value={memberForm.address} onChange={e => setMemberForm({ ...memberForm, address: e.target.value })} placeholder="Street address, city..." rows={2} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleAddMember} disabled={!memberForm.name.trim()} className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed">Add Member</button>
              <button onClick={() => setShowAddMember(false)} className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Shepherd Modal ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Assign Shepherd</h2>
            <p className="text-slate-500 text-sm mb-8">Assign a church member to a shepherd</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Member (Sheep)</label>
                <select value={assignForm.member_id} onChange={e => setAssignForm({ ...assignForm, member_id: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors">
                  <option value="">Select a member...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Shepherd</label>
                <select value={assignForm.shepherd_id} onChange={e => setAssignForm({ ...assignForm, shepherd_id: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors">
                  <option value="">Select a shepherd...</option>
                  {shepherds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Notes <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <textarea value={assignForm.notes} onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })} placeholder="Any notes for the shepherd..." rows={3} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleAssignShepherd} disabled={!assignForm.member_id || !assignForm.shepherd_id} className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed">Assign</button>
              <button onClick={() => setShowAssignModal(false)} className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Follow-Up Modal ── */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-md w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Assign Follow-Up</h2>
            <p className="text-slate-500 text-sm mb-8">Assign a shepherd to follow up with a member</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Member</label>
                <select value={followUpForm.member_id} onChange={e => setFollowUpForm({ ...followUpForm, member_id: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors">
                  <option value="">Select a member...</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Shepherd</label>
                <select value={followUpForm.shepherd_id} onChange={e => setFollowUpForm({ ...followUpForm, shepherd_id: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors">
                  <option value="">Select a shepherd...</option>
                  {shepherds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Due Date <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <input type="date" value={followUpForm.due_date} onChange={e => setFollowUpForm({ ...followUpForm, due_date: e.target.value })} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Instructions <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
                <textarea value={followUpForm.notes} onChange={e => setFollowUpForm({ ...followUpForm, notes: e.target.value })} placeholder="Instructions or context for the shepherd..." rows={3} className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors" />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={handleAssignFollowUp} disabled={!followUpForm.member_id || !followUpForm.shepherd_id} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed">Assign Follow-Up</button>
              <button onClick={() => setShowFollowUpModal(false)} className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}