'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getChurchName } from '@/lib/config'

type Step = 'form' | 'success' | 'exists'

const ROLE_OPTIONS = [
  { value: 'warrior', label: 'Prayer Warrior', description: 'Commit to and log prayer for submitted requests' },
  { value: 'basonta_shepherd', label: 'Basonta Shepherd', description: 'Lead a Basonta and track meetings' },
  { value: 'bacenta_leader', label: 'Bacenta Leader', description: 'Lead a Bacenta, manage members and log meetings' },
  { value: 'shepherd', label: 'Shepherd', description: 'Care for assigned church members and submit reports' },
]

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    requestedRole: 'warrior',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // 1. Check if already pending here
      const { data: existing } = await supabase
        .from('pending_users')
        .select('id, status')
        .eq('email', form.email.toLowerCase().trim())
        .single()

      if (existing) {
        setStep('exists')
        setLoading(false)
        return
      }

      // 2. Check if already an active user
      const { data: activeUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', form.email.toLowerCase().trim())
        .single()

      if (activeUser) {
        setError('An account with this email already exists. Please login instead.')
        setLoading(false)
        return
      }

        // 3. Create Supabase Auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
            data: { name: form.name.trim() }
        }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Failed to create auth account.')

        // 4. Create user record (with 'pending' role)
        const { error: userError } = await supabase
        .from('users')
        .insert([{
            id: authData.user.id,
            email: form.email.toLowerCase().trim(),
            name: form.name.trim(),
            role: 'pending',
        }])

        if (userError) {
        console.error('User insert failed:', userError)
        // Clean up the auth user so they can try again
        await supabase.auth.signOut()
        throw new Error(`Account setup failed: ${userError.message}`)
        }

        // 5. Insert into pending_users for leader approval
        const { error: pendingError } = await supabase
        .from('pending_users')
        .insert([{
            email: form.email.toLowerCase().trim(),
            name: form.name.trim(),
            requested_role: form.requestedRole,
            notes: form.notes.trim() || null,
            status: 'pending',
        }])

        if (pendingError) {
        console.error('Pending insert failed:', pendingError)
        // Don't block the user — user record was created successfully
        }

      // 5. Sign them back out — they can't use the app until leader approves
      await supabase.auth.signOut()

      setStep('success')
    } catch (err: any) {
      console.error('Signup error:', err)
      if (err.message?.includes('already registered')) {
        setError('An account with this email already exists. Please login instead.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-800 mb-3">Request Submitted!</h1>
            <p className="text-slate-600 mb-2 leading-relaxed">
              Your account request has been sent to the church leadership for review.
            </p>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              You will be able to log in once a leader approves your account and assigns your role. Please check back later.
            </p>
            <a
              href="/login"
              className="block w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all text-center"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Already pending screen ──────────────────────────────────────────────────
  if (step === 'exists') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-800 mb-3">Already Pending</h1>
            <p className="text-slate-600 mb-8 leading-relaxed">
              A signup request for this email is already awaiting approval from leadership. Please be patient — they will review it soon.
            </p>
            <a
              href="/login"
              className="block w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all text-center"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Signup form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 mb-1">Request Access</h1>
            <p className="text-slate-500 text-sm">{getChurchName.short()} — Staff Portal</p>
          </div>

          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm font-medium text-center">
              Your request will need approval from church leadership before you can log in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                required
                minLength={8}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Repeat your password"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 transition-colors"
                required
              />
            </div>

            {/* Role Request */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Requested Role
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(role => (
                  <label
                    key={role.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      form.requestedRole === role.value
                        ? 'border-slate-800 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={form.requestedRole === role.value}
                      onChange={e => setForm({ ...form, requestedRole: e.target.value })}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{role.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{role.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                Notes for Leadership <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. I was invited by Pastor James, I lead the youth group..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 text-slate-800 placeholder-slate-400 bg-white resize-none transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-4 rounded-lg font-semibold text-lg hover:bg-slate-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Submitting Request...' : 'Request Access'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-slate-800 font-semibold hover:underline">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}