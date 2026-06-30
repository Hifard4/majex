'use client'

import { useEffect, useState, useCallback } from 'react'
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
  const supabase = supabaseBrowser()

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

        const { data: profile } = await supabase
          .from('profiles')
          .select('phone, email')
          .eq('id', req!.user_id)
          .single()

        const { data: curMajor } = await supabase
          .from('majors').select('name').eq('id', req!.current_major_id).single()
        const { data: tgtMajor } = await supabase
          .from('majors').select('name').eq('id', req!.target_major_id).single()

        return {
          phone: profile!.phone,
          email: profile!.email,
          current: curMajor!.name,
          target: tgtMajor!.name,
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
    setLoading(true)
    await fetch('/api/requests/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: activeRequest.id }),
    })
    setLoading(false)
    await refreshRequest()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MajEx Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-slate-500 underline">
          Log out
        </button>
      </div>

      {match && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h2 className="font-semibold text-green-800">
            🎉 Match found! ({match.cycleLength === 2 ? 'Direct swap' : '3-way cycle'})
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {match.members.map((m, i) => (
              <li key={i} className="rounded bg-white p-2">
                <p>{m.current} → {m.target}</p>
                <p className="text-slate-500">{m.email} · {m.phone}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!match && activeRequest && activeRequest.status === 'pending' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p>Your request is pending. We'll notify you here as soon as a match is found.</p>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="mt-3 rounded-lg border border-amber-400 px-3 py-1 text-sm"
          >
            Cancel request
          </button>
        </div>
      )}

      {!activeRequest || activeRequest.status === 'cancelled' ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-medium">Current major</label>
          <select
            required
            value={currentMajor}
            onChange={(e) => setCurrentMajor(e.target.value)}
            className="rounded-lg border border-slate-300 p-2"
          >
            <option value="">Select...</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <label className="text-sm font-medium">Target major</label>
          <select
            required
            value={targetMajor}
            onChange={(e) => setTargetMajor(e.target.value)}
            className="rounded-lg border border-slate-300 p-2"
          >
            <option value="">Select...</option>
            {majors.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 p-2 text-white disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit exchange request'}
          </button>
        </form>
      ) : null}
    </main>
  )
}