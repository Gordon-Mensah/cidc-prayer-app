'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface ChurchMember {
  id: string
  name: string
  phone: string | null
  address: string | null
}

interface ShepherdingAssignment {
  id: string
  member_id: string
  shepherd_id: string
  assigned_at: string
  notes: string | null
  church_members: ChurchMember
}

interface ShepherdingReport {
  id: string
  assignment_id: string
  member_id: string
  shepherd_id: string
  report_date: string
  content: string
  created_at: string
  church_members: ChurchMember
}

interface FollowUpTask {
  id: string
  member_id: string
  shepherd_id: string
  due_date: string | null
  notes: string | null
  completed: boolean
  created_at: string
  church_members: ChurchMember
}

interface FollowUpReport {
  id: string
  task_id: string
  member_id: string
  shepherd_id: string
  report_date: string
  content: string
  created_at: string
  church_members: ChurchMember
}

export default function ShepherdDashboard() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'sheep' | 'followups'>('sheep')

  // My Sheep
  const [assignments, setAssignments] = useState<ShepherdingAssignment[]>([])
  const [selectedSheep, setSelectedSheep] = useState<ShepherdingAssignment | null>(null)
  const [sheepReports, setSheepReports] = useState<ShepherdingReport[]>([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportForm, setReportForm] = useState({ content: '', report_date: new Date().toISOString().split('T')[0] })

  // Follow-Ups
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([])
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpTask | null>(null)
  const [followUpReports, setFollowUpReports] = useState<FollowUpReport[]>([])
  const [showFollowUpReportModal, setShowFollowUpReportModal] = useState(false)
  const [followUpReportForm, setFollowUpReportForm] = useState({ content: '', report_date: new Date().toISOString().split('T')[0] })

  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) loadTabData()
  }, [user, activeTab])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)
  }

  const loadTabData = async () => {
    setLoading(true)
    if (activeTab === 'sheep') await loadAssignments()
    else await loadFollowUps()
    setLoading(false)
  }

  const loadAssignments = async () => {
    const { data } = await supabase
      .from('shepherding_assignments')
      .select('*, church_members(*)')
      .eq('shepherd_id', user.id)
      .order('assigned_at', { ascending: false })
    setAssignments(data || [])
  }

  const loadFollowUps = async () => {
    const { data } = await supabase
      .from('follow_up_tasks')
      .select('*, church_members(*)')
      .eq('shepherd_id', user.id)
      .order('due_date', { ascending: true })
    setFollowUps(data || [])
  }

  const loadSheepReports = async (assignmentId: string) => {
    const { data } = await supabase
      .from('shepherding_reports')
      .select('*, church_members(*)')
      .eq('assignment_id', assignmentId)
      .order('report_date', { ascending: false })
    setSheepReports(data || [])
  }

  const loadFollowUpReports = async (taskId: string) => {
    const { data } = await supabase
      .from('follow_up_reports')
      .select('*, church_members(*)')
      .eq('task_id', taskId)
      .order('report_date', { ascending: false })
    setFollowUpReports(data || [])
  }

  const handleViewSheep = async (assignment: ShepherdingAssignment) => {
    setSelectedSheep(assignment)
    await loadSheepReports(assignment.id)
  }

  const handleSubmitSheepReport = async () => {
    if (!selectedSheep || !reportForm.content.trim()) return
    await supabase.from('shepherding_reports').insert([{
      assignment_id: selectedSheep.id,
      member_id: selectedSheep.member_id,
      shepherd_id: user.id,
      report_date: reportForm.report_date,
      content: reportForm.content.trim()
    }])
    setReportForm({ content: '', report_date: new Date().toISOString().split('T')[0] })
    setShowReportModal(false)
    await loadSheepReports(selectedSheep.id)
  }

  const handleViewFollowUp = async (task: FollowUpTask) => {
    setSelectedFollowUp(task)
    await loadFollowUpReports(task.id)
  }

  const handleSubmitFollowUpReport = async () => {
    if (!selectedFollowUp || !followUpReportForm.content.trim()) return
    await supabase.from('follow_up_reports').insert([{
      task_id: selectedFollowUp.id,
      member_id: selectedFollowUp.member_id,
      shepherd_id: user.id,
      report_date: followUpReportForm.report_date,
      content: followUpReportForm.content.trim()
    }])
    // Mark task complete
    await supabase.from('follow_up_tasks').update({ completed: true }).eq('id', selectedFollowUp.id)
    setFollowUpReportForm({ content: '', report_date: new Date().toISOString().split('T')[0] })
    setShowFollowUpReportModal(false)
    await loadFollowUpReports(selectedFollowUp.id)
    await loadFollowUps()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Shepherd Portal</p>
            <h1 className="text-2xl font-serif font-bold text-white">Shepherding Dashboard</h1>
            <p className="text-slate-300 text-sm mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-all">Sign Out</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex">
          {[{ id: 'sheep' as const, label: 'My Sheep' }, { id: 'followups' as const, label: 'Follow-Ups' }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-6 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
            {/* ══ MY SHEEP TAB ══════════════════════════════════════════════════ */}
            {activeTab === 'sheep' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-serif font-bold text-slate-800">My Sheep</h2>
                  <p className="text-slate-500 text-sm mt-1">Members assigned to your care &mdash; {assignments.length} {assignments.length === 1 ? 'member' : 'members'}</p>
                </div>

                {assignments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map(a => (
                      <div key={a.id} className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-xl transition-all">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{a.church_members.name}</h3>
                        {a.church_members.phone && <p className="text-sm text-slate-500 mb-0.5">{a.church_members.phone}</p>}
                        {a.church_members.address && <p className="text-sm text-slate-500 mb-0.5">{a.church_members.address}</p>}
                        <p className="text-xs text-slate-400 mt-2 mb-4">Assigned {new Date(a.assigned_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        {a.notes && <p className="text-sm text-slate-600 italic mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">{a.notes}</p>}
                        <button onClick={() => handleViewSheep(a)} className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all shadow-md">
                          View Profile & Reports
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <p className="text-slate-500 text-lg">No members assigned to you yet</p>
                    <p className="text-slate-400 text-sm mt-1">The leader will assign members to your care</p>
                  </div>
                )}
              </>
            )}

            {/* ══ FOLLOW-UPS TAB ════════════════════════════════════════════════ */}
            {activeTab === 'followups' && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-serif font-bold text-slate-800">Follow-Up Tasks</h2>
                  <p className="text-slate-500 text-sm mt-1">Tasks assigned by the leader &mdash; reports are private between you and the leader</p>
                </div>

                {/* Pending */}
                <div className="mb-10">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Pending</h3>
                  <div className="space-y-4">
                    {followUps.filter(f => !f.completed).map(f => (
                      <div key={f.id} className="bg-white rounded-lg border-2 border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-lg">{f.church_members.name}</h3>
                            {f.church_members.phone && <p className="text-sm text-slate-500 mt-0.5">{f.church_members.phone}</p>}
                            {f.due_date && (
                              <p className="text-xs text-orange-600 font-semibold mt-2 uppercase tracking-wide">
                                Due: {new Date(f.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            )}
                            {f.notes && <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 italic">{f.notes}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleViewFollowUp(f)} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md">
                          Submit Follow-Up Report
                        </button>
                      </div>
                    ))}
                    {followUps.filter(f => !f.completed).length === 0 && (
                      <div className="text-center py-10 bg-slate-50 rounded-lg border-2 border-slate-200">
                        <p className="text-slate-500">No pending follow-up tasks</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Completed */}
                {followUps.filter(f => f.completed).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Completed</h3>
                    <div className="space-y-3">
                      {followUps.filter(f => f.completed).map(f => (
                        <div key={f.id} className="bg-white rounded-lg border-2 border-green-200 p-5 opacity-75 hover:opacity-100 transition-all">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-bold text-slate-800">{f.church_members.name}</h3>
                              {f.due_date && <p className="text-xs text-slate-400 mt-0.5">Was due: {new Date(f.due_date).toLocaleDateString()}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-semibold uppercase tracking-wide">Complete</span>
                              <button onClick={() => handleViewFollowUp(f)} className="px-4 py-2 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-semibold transition-all">
                                View Report
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
          <p className="text-slate-300">Church Management System</p>
          <p className="text-slate-400 text-sm mt-2">&copy; 2026 All rights reserved</p>
        </div>
      </footer>

      {/* ── Sheep Profile & Reports Modal ── */}
      {selectedSheep && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Sheep Profile</p>
                <h2 className="text-2xl font-serif font-bold text-slate-800">{selectedSheep.church_members.name}</h2>
                {selectedSheep.church_members.phone && <p className="text-sm text-slate-500 mt-1">{selectedSheep.church_members.phone}</p>}
                {selectedSheep.church_members.address && <p className="text-sm text-slate-500">{selectedSheep.church_members.address}</p>}
              </div>
              <button onClick={() => { setSelectedSheep(null); setSheepReports([]) }} className="text-slate-400 hover:text-slate-700 text-2xl transition-colors">&times;</button>
            </div>

            {selectedSheep.notes && (
              <div className="mb-6 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Leader Notes</p>
                <p className="text-sm text-slate-700">{selectedSheep.notes}</p>
              </div>
            )}

            {/* Reports */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Shepherding Reports</h3>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all text-sm"
                >
                  Add Report
                </button>
              </div>

              {sheepReports.length > 0 ? (
                <div className="space-y-3">
                  {sheepReports.map(report => (
                    <div key={report.id} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        {new Date(report.report_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{report.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <p className="text-slate-500 text-sm">No reports yet. Add your first report.</p>
                </div>
              )}
            </div>

            <button onClick={() => { setSelectedSheep(null); setSheepReports([]) }} className="w-full py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Add Sheep Report Modal ── */}
      {showReportModal && selectedSheep && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-lg w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-1">Add Shepherding Report</h2>
            <p className="text-slate-500 text-sm mb-8">For: <span className="font-semibold text-slate-700">{selectedSheep.church_members.name}</span></p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Report Date</label>
                <input
                  type="date"
                  value={reportForm.report_date}
                  onChange={e => setReportForm({ ...reportForm, report_date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Report</label>
                <textarea
                  value={reportForm.content}
                  onChange={e => setReportForm({ ...reportForm, content: e.target.value })}
                  placeholder="Describe your interaction, observations, and any prayer needs..."
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSubmitSheepReport}
                disabled={!reportForm.content.trim()}
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Submit Report
              </button>
              <button
                onClick={() => { setShowReportModal(false); setReportForm({ content: '', report_date: new Date().toISOString().split('T')[0] }) }}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Follow-Up Detail & Report Modal ── */}
      {selectedFollowUp && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Follow-Up Task</p>
                <h2 className="text-2xl font-serif font-bold text-slate-800">{selectedFollowUp.church_members.name}</h2>
                {selectedFollowUp.church_members.phone && <p className="text-sm text-slate-500 mt-1">{selectedFollowUp.church_members.phone}</p>}
                {selectedFollowUp.due_date && (
                  <p className="text-xs text-orange-600 font-semibold mt-2 uppercase tracking-wide">
                    Due: {new Date(selectedFollowUp.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
              <button onClick={() => { setSelectedFollowUp(null); setFollowUpReports([]) }} className="text-slate-400 hover:text-slate-700 text-2xl transition-colors">&times;</button>
            </div>

            {selectedFollowUp.notes && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Instructions from Leader</p>
                <p className="text-sm text-slate-700">{selectedFollowUp.notes}</p>
              </div>
            )}

            <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-semibold">Reports are private &mdash; visible only to you and the church leader</p>
            </div>

            {/* Follow-Up Reports */}
            <div className="mb-6 mt-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Reports</h3>
                {!selectedFollowUp.completed && (
                  <button onClick={() => setShowFollowUpReportModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all text-sm">
                    Submit Report
                  </button>
                )}
              </div>

              {followUpReports.length > 0 ? (
                <div className="space-y-3">
                  {followUpReports.map(report => (
                    <div key={report.id} className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        {new Date(report.report_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{report.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <p className="text-slate-500 text-sm">No reports submitted yet</p>
                </div>
              )}
            </div>

            <button onClick={() => { setSelectedFollowUp(null); setFollowUpReports([]) }} className="w-full py-3 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Submit Follow-Up Report Modal ── */}
      {showFollowUpReportModal && selectedFollowUp && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg border-2 border-slate-200 max-w-lg w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-1">Submit Follow-Up Report</h2>
            <p className="text-slate-500 text-sm mb-2">For: <span className="font-semibold text-slate-700">{selectedFollowUp.church_members.name}</span></p>
            <p className="text-xs text-amber-700 font-semibold mb-8 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              This report will only be visible to you and the church leader
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Report Date</label>
                <input
                  type="date"
                  value={followUpReportForm.report_date}
                  onChange={e => setFollowUpReportForm({ ...followUpReportForm, report_date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Report</label>
                <textarea
                  value={followUpReportForm.content}
                  onChange={e => setFollowUpReportForm({ ...followUpReportForm, content: e.target.value })}
                  placeholder="Describe the follow-up: what was discussed, how the member is doing, any prayer needs or concerns..."
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSubmitFollowUpReport}
                disabled={!followUpReportForm.content.trim()}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Submit & Mark Complete
              </button>
              <button
                onClick={() => { setShowFollowUpReportModal(false); setFollowUpReportForm({ content: '', report_date: new Date().toISOString().split('T')[0] }) }}
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