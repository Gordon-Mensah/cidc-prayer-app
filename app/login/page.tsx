'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import APP_CONFIG, { getChurchName, getPageTitle } from '@/lib/config'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, name')
        .eq('email', email)
        .single()

      if (userError) {
        throw new Error('User not found in database. Please contact your administrator.')
      }

      // Redirect based on role
      if (userData?.role === 'warrior') {
        router.push('/warrior')
      } else if (userData?.role === 'leader') {
        router.push('/leader')
      } else if (userData?.role === 'basonta_shepherd') {
        router.push('/basonta')
      } else if (userData?.role === 'shepherd') {
        router.push('/shepherd')
      } else if (userData?.role === 'bancenta_leader') {
        router.push('/bancenta')
      } else {
        throw new Error('Invalid user role. Please contact your administrator.')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">
              Staff Login
            </h1>
            <p className="text-slate-600">
              {getChurchName.short()}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@church.com"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400"
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-slate-100 text-center space-y-3">
            <p className="text-slate-500 text-sm">
              Don't have an account?{' '}
              <a href="/signup" className="text-slate-800 font-semibold hover:underline">
                Request Access
              </a>
            </p>
            <a href="/" className="block text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}