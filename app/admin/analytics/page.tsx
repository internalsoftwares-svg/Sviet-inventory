'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useMemo, useState } from 'react'
import { formatINR, abbreviateINR } from '@/lib/utils/format'
import { SAExportButton } from '@/components/super-admin/SAExportButton'

const COLORS = ['#166534', '#14532D', '#15803D', '#22C55E', '#86EFAC']

export default function AdminAnalyticsPage() {
  const [sessionYear, setSessionYear] = useState(new Date().getFullYear())
  const [granularity, setGranularity] = useState<'monthly' | 'yearly'>('monthly')

  const { data: itemsStats, isLoading: isItemsLoading, isError: isItemsError, isFetching: isItemsFetching, refetch: refetchItems } = useQuery({
    queryKey: ['admin-stats-items', sessionYear],
    queryFn: async () => {
      const res = await api.get('/admin/stats/items', { params: { sessionYear } })
      return res.data.data
    }
  })

  const { data: expenditureStats, isLoading: isExpenditureLoading, isError: isExpenditureError, isFetching: isExpenditureFetching, refetch: refetchExpenditure } = useQuery({
    queryKey: ['admin-stats-expenditure', sessionYear, granularity],
    queryFn: async () => {
      const res = await api.get('/admin/stats/expenditure', { params: { sessionYear, granularity } })
      return res.data.data
    }
  })

  const { data: userStats, isLoading: isUserStatsLoading, isError: isUserStatsError, isFetching: isUserStatsFetching, refetch: refetchUserStats } = useQuery({
    queryKey: ['admin-stats-users', sessionYear, granularity],
    queryFn: async () => {
      const res = await api.get('/admin/stats/users', { params: { sessionYear, granularity } })
      return res.data.data
    }
  })

  const isLoading =
    isItemsLoading ||
    isExpenditureLoading ||
    isUserStatsLoading

  const topItems = useMemo(() => {
    const items = itemsStats?.items ?? []
    return [...items]
      .sort((a: { totalRequested: number }, b: { totalRequested: number }) => b.totalRequested - a.totalRequested)
      .slice(0, 8)
      .map((item: { name: string; totalRequested: number }) => ({
        name: item.name,
        qty: item.totalRequested,
      }))
  }, [itemsStats])

  const isError = isItemsError || isExpenditureError || isUserStatsError

  if (isLoading) {
    return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>
  }

  return (
    <div className="space-y-6 page-enter">
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm">Some analytics data couldn&apos;t be loaded.</span>
          <button
            onClick={() => {
              if (isItemsError) refetchItems()
              if (isExpenditureError) refetchExpenditure()
              if (isUserStatsError) refetchUserStats()
            }}
            disabled={isItemsFetching || isExpenditureFetching || isUserStatsFetching}
            className="text-sm font-medium underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isItemsFetching || isExpenditureFetching || isUserStatsFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
          <p className="text-sm text-[--ink-secondary]">Gain insights into inventory usage and requests</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-[--ink-secondary]">Session Year:</label>
          <select 
            value={sessionYear} 
            onChange={(e) => setSessionYear(parseInt(e.target.value))}
            className="text-sm border border-[--border-default] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as 'monthly' | 'yearly')}
            className="text-sm border border-[--border-default] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <SAExportButton type="items" filters={{ sessionYear }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[--border-default] shadow-sm">
          <div className="text-xs text-[--ink-secondary] uppercase tracking-wide">Total Expenditure</div>
          <div className="mt-1 text-2xl font-display font-bold">{formatINR(expenditureStats?.totalExpenditure ?? 0)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-[--border-default] shadow-sm">
          <div className="text-xs text-[--ink-secondary] uppercase tracking-wide">Top User Spend</div>
          <div className="mt-1 text-2xl font-display font-bold">
            {userStats?.byUser?.[0] ? abbreviateINR(userStats.byUser[0].totalAmount ?? 0) : '0'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-[--border-default] shadow-sm">
          <div className="text-xs text-[--ink-secondary] uppercase tracking-wide">Approved Users</div>
          <div className="mt-1 text-2xl font-display font-bold">{userStats?.byUser?.length ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Most Used Items */}
        <div className="bg-white p-6 rounded-lg border border-[--border-default] shadow-sm lg:col-span-2 min-w-0">
          <h3 className="font-bold text-[--ink-primary] mb-6">Top Requested Items</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <BarChart data={topItems} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-default)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--ink-secondary)' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--ink-secondary)' }} />
                <RechartsTooltip cursor={{ fill: 'var(--bg-subtle)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-default)', fontSize: '12px' }} />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                  {topItems.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {topItems.length === 0 && (
              <div className="mt-4 text-sm text-[--ink-secondary]">No request data for this session.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-[--border-default] shadow-sm lg:col-span-2">
          <h3 className="font-bold text-[--ink-primary] mb-4">User-wise Approved Amounts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[--bg-subtle] border-b border-[--border-default]">
                <tr>
                  <th className="px-4 py-2 font-medium text-[--ink-secondary]">User</th>
                  <th className="px-4 py-2 font-medium text-[--ink-secondary]">Department</th>
                  <th className="px-4 py-2 font-medium text-[--ink-secondary] text-right">Approved Requests</th>
                  <th className="px-4 py-2 font-medium text-[--ink-secondary] text-right">Units</th>
                  <th className="px-4 py-2 font-medium text-[--ink-secondary] text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border-default]">
                {(userStats?.byUser ?? []).map((u: any) => (
                  <tr key={u.userId}>
                    <td className="px-4 py-2 font-medium">{u.userName}</td>
                    <td className="px-4 py-2 text-[--ink-secondary]">{u.department ?? '-'}</td>
                    <td className="px-4 py-2 text-right">{u.approvedRequests}</td>
                    <td className="px-4 py-2 text-right">{u.totalUnits}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatINR(u.totalAmount)}</td>
                  </tr>
                ))}
                {(userStats?.byUser ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[--ink-secondary]">No approved expenditure data found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
