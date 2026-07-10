'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Dashboard {
  id: string
  name: string
  createdAt: string | null
  currency: string
}

interface UserStat {
  email: string
  ownerId: string
  count: number
  lastCreated: string | null
  dashboards: Dashboard[]
}

interface StatsResponse {
  stats: UserStat[]
  totalDashboards: number
  totalUsers: number
}

export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState<StatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        if (res.status === 401) { router.push('/login'); return }
        if (res.status === 403) { setError('Access denied — admin only.'); setLoading(false); return }
        if (!res.ok) throw new Error('Failed to load stats')
        const json = await res.json()
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load data. Please try again.')
        setLoading(false)
      })
  }, [router])

  const toggleExpand = (ownerId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(ownerId) ? next.delete(ownerId) : next.add(ownerId)
      return next
    })
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading admin data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">⛔ {error}</div>
          <button onClick={() => router.push('/')} className="text-sm text-slate-400 hover:text-white underline">
            Go home
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Admin Panel</h1>
            <p className="text-xs text-slate-400 mt-0.5">Dashboard usage analytics</p>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/login')
            }}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Dashboards</p>
            <p className="text-4xl font-bold text-white">{data.totalDashboards}</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Users</p>
            <p className="text-4xl font-bold text-white">{data.totalUsers}</p>
          </div>
        </div>

        {/* Per-user table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-200">Dashboards by User</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-center">Dashboards</th>
                <th className="px-6 py-3 text-left">Last Created</th>
                <th className="px-6 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.stats.map((row) => (
                <>
                  <tr
                    key={row.ownerId}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-200">{row.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 font-bold text-sm">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(row.lastCreated)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleExpand(row.ownerId)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {expanded.has(row.ownerId) ? 'Hide ▲' : 'Show ▼'}
                      </button>
                    </td>
                  </tr>
                  {expanded.has(row.ownerId) && (
                    <tr key={`${row.ownerId}-expanded`} className="bg-slate-800/20">
                      <td colSpan={4} className="px-6 py-3">
                        <div className="space-y-1.5">
                          {row.dashboards.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between text-xs text-slate-400 py-1 border-b border-slate-800/40 last:border-0"
                            >
                              <span className="text-slate-300 font-medium truncate max-w-xs">
                                {d.name || '(untitled)'}
                              </span>
                              <div className="flex items-center gap-4 ml-4 shrink-0">
                                {d.currency && (
                                  <span className="text-slate-500">{d.currency}</span>
                                )}
                                <span>{formatDate(d.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {data.stats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No dashboards created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
