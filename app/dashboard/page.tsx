'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { Major, ExchangeRequest } from '@/types/database'

interface MatchInfo {
  groupId: string
  cycleLength: number
  members: { phone: string; email: string; current: string; target: string }[]
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
    // find the match group this request belongs to
    const { data: memberRow } = await supabase
      .from('match_members')
      .select('match_group_id')
      .eq('request_id', requestId)
      .single()

    if (!memberRow) return

    const { data: groupRow } = await supabase
      .from('match_groups')
      .select('id, cycle_length')
      .eq('id', memberRow.match_group_id)
      .single()

    const { data: allMembers } = await supabase
      .from('match_members')
      .select('request_id, position')
      .eq('match_group_id', memberRow.match_group_id)
      .order('position', { ascending: true })

    if (!allMembers || !groupRow) return

    const details = await Promise.all(
      allMembers.map(async (m) => {
        const { data: req } = await supabase
          .from('exchange_requests')
          .select('user_id, current_major_id, target_major_id')
          .eq('id', m.request_id)
          .single()

        const userId = req?.user_id
        const currentMajorId = req?.current_major_id
        const targetMajorId = req?.target_major_id

        const { data: profile } = userId
          ? await supabase.from('profiles').select('phone, email').eq('id', userId).single()
          : { data: null }

        const { data: curMajor } = currentMajorId
          ? await supabase.from('majors').select('name').eq('id', currentMajorId).single()
          : { data: null }

        const { data: tgtMajor } = targetMajorId
          ? await supabase.from('majors').select('name').eq('id', targetMajorId).single()
          : { data: null }

        return {
          phone: profile?.phone ?? '',
          email: profile?.email ?? '',
          current: curMajor?.name ?? '',
          target: tgtMajor?.name ?? '',
        }
      })
    )

    setMatch({ groupId: groupRow.id, cycleLength: groupRow.cycle_length, members: details })
  }, [supabase])

  const refreshRequest = useCallback(async () => {
    const res = await fetch('/api/requests')
    const data = await res.json()
    setActiveRequest(data.request)

    if (data.request?.status === 'matched') {
      loadMatchDetails(data.request.id)
    } else {
      setMatch(null)
    }
  }, [loadMatchDetails])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      const { data: majorsData } = await supabase.from('majors').select('*').order('name')
      setMajors(majorsData ?? [])

      await refreshRequest()
    }
    init()
  }, [supabase, router, refreshRequest])

  // Realtime: listen for this user's request flipping to "matched"
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('request-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'exchange_requests', filter: `user_id=eq.${userId}` },
        () => {
          refreshRequest()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, supabase, refreshRequest])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentMajorId: Number(currentMajor),
        targetMajorId: Number(targetMajor),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

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
      if (!res.ok) {
        const data = await res.json()
        setError(data.error)
        return
      }
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
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">Manage your active major swap requests</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-900/40 rounded-xl backdrop-blur-md transition-all duration-200"
          >
            Log out
          </button>
        </div>

        {/* Match Found Banner & Flow Diagram */}
        {match && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-md shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">🎉</span>
              <div>
                <h2 className="font-bold text-emerald-400 text-base">Match Found!</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  We found a valid {match.cycleLength === 2 ? 'direct swap' : `${match.cycleLength}-way cycle`} exchange path:
                </p>
              </div>
            </div>

            {/* Cycle Flow Diagram */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-8 overflow-x-auto py-4">
              {match.members.map((m, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center gap-6">
                  {/* Participant Card */}
                  <div className="relative group bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl w-64 shadow-xl text-slate-200 hover:border-emerald-500/30 transition-all duration-200">
                    <div className="absolute -top-3 left-4 rounded-full border border-emerald-500/30 bg-slate-950 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider shadow">
                      Student {i + 1}
                    </div>
                    
                    <div className="mt-2">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Current Major</div>
                      <div className="font-semibold text-slate-200 text-sm mt-0.5 truncate">{m.current}</div>
                    </div>
                    
                    <div className="flex items-center gap-2 my-2 text-slate-655">
                      <span className="h-[1px] bg-slate-800 flex-1" />
                      <span className="text-[10px] uppercase font-bold text-slate-500">Exchanges to</span>
                      <span className="h-[1px] bg-slate-800 flex-1" />
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500">Target Major</div>
                      <div className="font-semibold text-emerald-400 text-sm mt-0.5 truncate">{m.target}</div>
                    </div>

                    <div className="border-t border-slate-850 mt-4 pt-3 text-[11px] text-slate-400 flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="text-slate-500">📧</span> {m.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-500">📞</span> {m.phone}
                      </span>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  {i < match.members.length - 1 && (
                    <div className="flex flex-col items-center justify-center text-slate-600">
                      <span className="text-xl rotate-90 md:rotate-0">➔</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Loop back arrow */}
              <div className="flex flex-col items-center justify-center bg-indigo-500/5 border border-indigo-500/20 px-3 py-1.5 rounded-full text-indigo-400 text-xs font-semibold shadow">
                🔄 Cycle Completed
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 text-center mt-6 italic">
              Please contact the match members using the details above to finalize your university paperwork.
            </p>
          </div>
        )}

        {/* Pending Card */}
        {!match && activeRequest && activeRequest.status === 'pending' && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-md shadow-lg shadow-amber-500/5">
            {/* Pulsing radar dot */}
            <div className="absolute top-6 right-6 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </div>

            <h2 className="font-bold text-amber-400 flex items-center gap-2 text-base">
              ⏳ Scanning for Matches...
            </h2>
            <p className="text-sm text-slate-350 mt-2 max-w-xl">
              Your exchange request is active. Our algorithm is constantly searching for matching swaps.
              We'll display the match cycle here immediately once resolved.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleCancel}
              disabled={loading}
              className="mt-6 px-4 py-2 text-xs font-semibold text-amber-405 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10 rounded-xl backdrop-blur-md transition-all duration-205 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        )}

        {/* Request Form */}
        {!activeRequest || activeRequest.status === 'cancelled' ? (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 backdrop-blur-md shadow-xl">
            <h2 className="text-lg font-bold text-slate-100 mb-6">Request a Major Swap</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Current Major</label>
                  <select
                    required
                    value={currentMajor}
                    onChange={(e) => setCurrentMajor(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/50 p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
                  >
                    <option value="" className="bg-slate-950 text-slate-500">Select your current major...</option>
                    {majors.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-950">{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Target Major</label>
                  <select
                    required
                    value={targetMajor}
                    onChange={(e) => setTargetMajor(e.target.value)}
                    className="w-full rounded-xl border border-slate-850 bg-slate-950/50 p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 transition-all duration-200"
                  >
                    <option value="" className="bg-slate-950 text-slate-500">Select target major...</option>
                    {majors.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-950">{m.name}</option>
                    ))}
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
                className="w-full md:w-auto md:self-end px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'Submitting...' : 'Submit Exchange Request'}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </main>
  )
}