'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
      // First, sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      console.log('Auth successful, user:', authData.user?.email)

      // Then get user role from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, name')
        .eq('email', email)
        .single()

      console.log('User data:', userData)

      if (userError) {
        console.error('User error:', userError)
        throw new Error('User not found in database. Please contact admin.')
      }

      // Redirect based on role
      if (userData?.role === 'warrior') {
        router.push('/warrior')
      } else if (userData?.role === 'leader') {
        router.push('/leader')
      } else if (userData?.role === 'basonta_leader') {
        router.push('/basonta')
      } else {
        throw new Error('Invalid user role')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🙏</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Prayer Team Login
          </h1>
          <p className="text-gray-600">Access your prayer dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@church.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to Prayer Request Form
          </a>
        </div>
      </div>
    </div>
  )
}