'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Major, ExchangeRequest } from '@/types/database'

interface MatchMember {
  cycle_position: number
  phone: string
  email: string
  full_name: string | null
  current_major: string
  target_major: string
  is_me: boolean
}

interface MatchInfo {
  cycleLength: number
  members: MatchMember[]
}

export default function Dashboard() {
  const router = useRouter()
  const supabase = useMemo(() => supabaseBrowser(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [majors, setMajors] = useState<Major[]>([])
  const [currentMajor, setCurrentMajor] = useState('')
  const [targetMajor, setTargetMajor] = useState('')
  const [activeRequest, setActiveRequest] = useState<ExchangeRequest | null>(null)
  const [match, setMatch] = useState<MatchInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadMatchDetails = useCallback(async (requestId: string) => {
    // Single RPC call — bypasses RLS safely via security definer
    const { data, error } = await supabase.rpc('get_match_contacts', {
      p_request_id: requestId,
    })

    if (error || !data || data.length === 0) return

    // get cycle length from match_members count
    const { data: memberRow } = await supabase
      .from('match_members')
      .select('match_group_id')
      .eq('request_id', requestId)
      .single()

    const { data: groupRow } = memberRow
      ? await supabase
          .from('match_groups')
          .select('cycle_length')
          .eq('id', memberRow.match_group_id)
          .single()
      : { data: null }

    setMatch({
      cycleLength: groupRow?.cycle_length ?? data.length,
      members: data as MatchMember[],
    })
  }, [supabase])

  const refreshRequest = useCallback(async () => {
    const res = await fetch('/api/requests')
    const json = await res.json()
    setActiveRequest(json.request)

    if (json.request?.status === 'matched') {
      loadMatchDetails(json.request.id)
    } else {
      setMatch(null)
    }
  }, [loadMatchDetails])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: majorsData } = await supabase.from('majors').select('*').order('name')
      setMajors(majorsData ?? [])

      await refreshRequest()
    }
    init()
  }, [supabase, router, refreshRequest])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('request-status')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'exchange_requests', filter: `user_id=eq.${userId}` },
        () => { refreshRequest() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase, refreshRequest])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentMajorId: Number(currentMajor), targetMajorId: Number(targetMajor) }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    await refreshRequest()
  }

  async function handleCancel() {
    if (!activeRequest) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/requests/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: activeRequest.id }),
      })
      setLoading(false)
      if (!res.ok) { const d = await res.json(); setError(d.error); return }
      await refreshRequest()
    } catch {
      setLoading(false)
      setError('Network error. Please try again.')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              MajEx
            </h1>
            <p className="text-sm text-slate-400 mt-1">University of Burundi — Major Exchange</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded-xl transition-all duration-200"
          >
            Log out
          </button>
        </div>

        {/* Match Card */}
        {match && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-xl">🎉</span>
              <div>
                <h2 className="font-bold text-emerald-400 text-lg">Match Found!</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {match.cycleLength === 2 ? 'Direct 2-way swap' : `3-way exchange cycle`} — contact your match partners below to proceed.
                </p>
              </div>
            </div>

            {/* Member Cards */}
            <div className="flex flex-col gap-4">
              {match.members.map((m, i) => (
                <div key={i} className={`relative rounded-2xl border p-5 transition-all duration-200 ${
                  m.is_me
                    ? 'border-indigo-500/30 bg-indigo-500/5'
                    : 'border-slate-700/60 bg-slate-900/50'
                }`}>
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      m.is_me
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {m.is_me ? '👤 You' : `Student ${i + 1}`}
                    </span>
                    {/* Swap arrow */}
                    <span className="text-slate-600 text-lg font-bold">⇄</span>
                  </div>

                  {/* Major swap */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 rounded-xl bg-slate-800/60 px-3 py-2 text-center">
                      <div className="text-[9px] uppercase font-bold text-slate-500 mb-0.5">Current</div>
                      <div className="text-sm font-semibold text-slate-200">{m.current_major}</div>
                    </div>
                    <span className="text-emerald-500 text-lg">→</span>
                    <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center">
                      <div className="text-[9px] uppercase font-bold text-emerald-600 mb-0.5">Target</div>
                      <div className="text-sm font-semibold text-emerald-400">{m.target_major}</div>
                    </div>
                  </div>

                  {/* Contact info — always shown */}
                  <div className={`rounded-xl p-4 flex flex-col gap-2 ${
                    m.is_me ? 'bg-indigo-500/5 border border-indigo-500/10' : 'bg-slate-800/40 border border-slate-700/40'
                  }`}>
                    <div className="text-[9px] uppercase font-bold text-slate-500 mb-1">Contact Details</div>

                    {m.full_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500 w-4">👤</span>
                        <span className="text-slate-200 font-medium">{m.full_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-4">📞</span>
                      <a
                        href={`tel:${m.phone}`}
                        className={`font-mono font-semibold tracking-wide hover:underline ${
                          m.is_me ? 'text-indigo-300' : 'text-emerald-300'
                        }`}
                      >
                        {m.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 w-4">📧</span>
                      <a
                        href={`mailto:${m.email}`}
                        className={`font-mono text-xs hover:underline ${
                          m.is_me ? 'text-indigo-300' : 'text-emerald-300'
                        }`}
                      >
                        {m.email}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cycle indicator */}
            {match.cycleLength === 3 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-3">
                🔄 This is a 3-way cycle — all three swaps happen simultaneously once paperwork is completed.
              </div>
            )}

            <p className="text-[11px] text-slate-500 text-center mt-4 italic">
              Contact your match partners directly to coordinate the official university paperwork.
            </p>
          </div>
        )}

        {/* Pending Card */}
        {!match && activeRequest && activeRequest.status === 'pending' && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-lg">
            <div className="absolute top-6 right-6 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </div>
<h2 className="font-bold text-amber-400 text-base">⏳ Scanning for Matches...</h2>
<p className="text-sm text-slate-400 mt-2 max-w-xl">
  Your request is active. We'll show your match partners here instantly when a swap or cycle is found.
</p>

{/* Show the user's current choice */}
{activeRequest && (() => {
  const cur = majors.find(m => m.id === activeRequest.current_major_id)
  const tgt = majors.find(m => m.id === activeRequest.target_major_id)
  return cur && tgt ? (
    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold">
      <span className="text-slate-300">{cur.name}</span>
      <span className="text-amber-400 text-base">→</span>
      <span className="text-amber-300">{tgt.name}</span>
    </div>
  ) : null
})()}
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}
            <button
              onClick={handleCancel}
              disabled={loading}
              className="mt-6 px-4 py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-400/50 bg-amber-500/10 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        )}

        {/* Request Form */}
        {(!activeRequest || activeRequest.status === 'cancelled') && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 shadow-xl">
            <h2 className="text-lg font-bold text-slate-100 mb-6">Request a Major Swap</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Major</label>
                  <select
                    required
                    value={currentMajor}
                    onChange={(e) => setCurrentMajor(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
                  >
                    <option value="">Select your current major...</option>
                    {majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target Major</label>
                  <select
                    required
                    value={targetMajor}
                    onChange={(e) => setTargetMajor(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
                  >
                    <option value="">Select your target major...</option>
                    {majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  ⚠️ {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto md:self-end px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Submitting...' : 'Submit Exchange Request'}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}