'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = supabaseBrowser()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)

    if (error) { setError(error.message); return }

    setSent(true)
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-8 transition-colors duration-200 group"
        >
          <span className="inline-block transition-transform duration-200 group-hover:-translate-x-1">←</span> Back to login
        </Link>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 backdrop-blur-md shadow-2xl">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Forgot your password?</h1>
          <p className="text-sm text-slate-400 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-400 flex flex-col gap-2">
              <p className="font-semibold">📬 Check your inbox!</p>
              <p className="text-emerald-300/80">
                A password reset link has been sent to <span className="font-mono font-semibold">{email}</span>.
                It may take a minute to arrive.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-indigo-400 hover:underline"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your.email@university.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium p-3 text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
