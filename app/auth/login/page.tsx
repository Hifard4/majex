'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('registered') === '1') setRegistered(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = supabaseBrowser()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) { setError(error.message); return }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-8 transition-colors duration-200 group"
        >
          <span className="inline-block transition-transform duration-200 group-hover:-translate-x-1">←</span> Back to home
        </Link>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 backdrop-blur-md shadow-2xl">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome back</h1>
          <p className="text-sm text-slate-400 mb-6">Log in to manage your major exchange request.</p>

          {registered && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 mb-5">
              🎉 Account created successfully! Please log in below.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="your.email@university.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            <Link
              href="/auth/forgot-password"
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors duration-200 text-center"
            >
              Forgot password?
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium p-3 text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don't have an account yet?{' '}
            <Link href="/auth/register" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}