'use client'
import { useSessionState } from '@/hooks/useSessionState'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { ArrowLeft, Download, Search } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { AsyncButton } from '@/components/ui/AsyncButton'
import { formatINR } from '@/lib/utils/format'
import { useSessionYear } from '@/lib/hooks/use-session-year'
import { useXlsxExport } from '@/lib/hooks/use-xlsx-export'

const controlCls =
  'text-sm border border-[--border-default] rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-black'

interface ItemStats {
  itemId: string
  name: string
  unit: string
  category: string | null
  totalRequested: number
  totalApproved: number
  totalRejected: number
  yearlyDemand: { year: number; totalRequested: number; totalApproved: number }[]
  departmentUsage: { department: string; qty: number }[]
}

interface AllocationRecord {
  id: string
  unitPrice: number
  quantityFulfilled: number
  totalAmount: number
  approvedAt: string
  inventoryProcessedAt: string | null
  userId: string
  employeeName: string
  department: string | null
  adminName: string | null
  imName: string | null
}

interface ReturnRecord {
  id: string
  quantity: number
  createdAt: string
  status: string
  notes: string | null
  adminNotes: string | null
  processedAt: string | null
  employeeName: string
  department: string | null
  adminName: string | null
}

interface StockRecord {
  id: string
  changeType: string
  quantityDelta: number
  quantityAfter: number
  createdAt: string
  notes: string | null
  changedByName: string | null
}

export function SAItemDetail({
  itemId,
  itemsBasePath = '/super-admin/items',
  employeeBasePath = '/super-admin/employees',
  exportBasePath = '/api/super-admin/export',
}: {
  itemId: string
  itemsBasePath?: string
  employeeBasePath?: string
  exportBasePath?: string
}) {
  const [sessionYear, setSessionYear] = useSessionYear()
  const [monthFrom, setMonthFrom] = useSessionState('sa_item_detail_monthFrom', '')
  const [monthTo, setMonthTo] = useSessionState('sa_item_detail_monthTo', '')
  const [offset, setOffset] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [searchQuery, setSearchQuery] = useSessionState('sa_item_detail_searchQuery', '')
  const [activeTab, setActiveTab] = useState<'allocations' | 'returns' | 'stock'>('allocations')

  const statsFilters = { monthFrom: monthFrom || undefined, monthTo: monthTo || undefined }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['super-admin-item-stats', itemId, statsFilters],
    queryFn: async () => {
      const res = await api.get(`/super-admin/stats/items/${itemId}`, { params: statsFilters })
      return res.data.data as ItemStats
    },
  })

  // Allocations Query
  const allocationFilters = { sessionYear, monthFrom: monthFrom || undefined, monthTo: monthTo || undefined, limit: pageSize, offset, search: searchQuery || undefined }
  const { data: allocationsData, isLoading: isAllocationsLoading, isFetching: isAllocationsFetching, isError: isAllocationsError, refetch: refetchAllocations } = useQuery({
    queryKey: ['sa-item-allocations', itemId, allocationFilters],
    queryFn: () => api.get(`/super-admin/items/${itemId}/approved`, { params: allocationFilters }).then((r) => r.data),
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: activeTab === 'allocations',
  })

  // Returns Query
  const returnsFilters = { limit: pageSize, offset, search: searchQuery || undefined }
  const { data: returnsData, isLoading: isReturnsLoading, isFetching: isReturnsFetching, isError: isReturnsError, refetch: refetchReturns } = useQuery({
    queryKey: ['sa-item-returns', itemId, returnsFilters],
    queryFn: () => api.get(`/super-admin/items/${itemId}/returns`, { params: returnsFilters }).then(r => r.data),
    enabled: activeTab === 'returns',
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  // Stock History Query
  const stockFilters = { limit: pageSize, offset, search: searchQuery || undefined }
  const { data: stockData, isLoading: isStockLoading, isFetching: isStockFetching, isError: isStockError, refetch: refetchStock } = useQuery({
    queryKey: ['sa-item-stock', itemId, stockFilters],
    queryFn: () => api.get(`/super-admin/items/${itemId}/stock-history`, { params: stockFilters }).then(r => r.data),
    enabled: activeTab === 'stock',
    staleTime: 3 * 60 * 1000,
    placeholderData: keepPreviousData,
  })

  function resetPaging() {
    setOffset(0)
  }

  const exportParams = new URLSearchParams({ sessionYear: String(sessionYear) })
  if (monthFrom) exportParams.set('monthFrom', monthFrom)
  if (monthTo)   exportParams.set('monthTo', monthTo)
  if (searchQuery) exportParams.set('search', searchQuery)

  const { isExporting, exportFile: handleExport } = useXlsxExport(
    `${exportBasePath}/items/${itemId}/allocations?${exportParams}`,
    `export-item-${itemId}.xlsx`
  )

  let currentRecords: any[] = []
  let currentSummary = null
  let currentHasMore = false
  let isCurrentLoading = false
  let isCurrentFetching = false
  let currentError = false
  let refetchCurrent = () => {}

  if (activeTab === 'allocations') {
    currentRecords = allocationsData?.data?.records ?? []
    currentSummary = allocationsData?.data?.summary
    currentHasMore = allocationsData?.meta?.hasMore
    isCurrentLoading = isAllocationsLoading
    isCurrentFetching = isAllocationsFetching
    currentError = isAllocationsError
    refetchCurrent = refetchAllocations
  } else if (activeTab === 'returns') {
    currentRecords = returnsData?.data?.records ?? []
    currentSummary = returnsData?.data?.summary
    currentHasMore = returnsData?.meta?.hasMore
    isCurrentLoading = isReturnsLoading
    isCurrentFetching = isReturnsFetching
    currentError = isReturnsError
    refetchCurrent = refetchReturns
  } else if (activeTab === 'stock') {
    currentRecords = stockData?.data?.records ?? []
    currentSummary = stockData?.data?.summary
    currentHasMore = stockData?.meta?.hasMore
    isCurrentLoading = isStockLoading
    isCurrentFetching = isStockFetching
    currentError = isStockError
    refetchCurrent = refetchStock
  }

  return (
    <div className="space-y-6 page-enter">
      <Link href={itemsBasePath} className="inline-flex items-center space-x-2 text-sm font-medium text-[--ink-secondary] hover:text-[--ink-primary]">
        <ArrowLeft size={16} />
        Back to Items
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{data?.name ?? (isLoading ? 'Loading…' : 'Item')}</h1>
          <p className="text-sm text-[--ink-secondary]">
            {data?.category ?? '—'} · Cross-session analytics for this item
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-[--ink-secondary]">Session Year:</label>
          <select
            value={sessionYear}
            onChange={(e) => { setSessionYear(parseInt(e.target.value)); resetPaging() }}
            className={controlCls}
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <input type="month" value={monthFrom} onChange={(e) => { setMonthFrom(e.target.value); resetPaging() }} className={controlCls} aria-label="From month" />
          <span className="text-sm text-[--ink-secondary]">to</span>
          <input type="month" value={monthTo} onChange={(e) => { setMonthTo(e.target.value); resetPaging() }} className={controlCls} aria-label="To month" />
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
          Couldn&apos;t load analytics for this item.
        </div>
      )}

      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-[--border-default] shadow-sm">
            <div className="text-xs text-[--ink-secondary] uppercase tracking-wide">Total Requested</div>
            <div className="mt-1 text-2xl font-display font-bold">{data.totalRequested.toLocaleString('en-IN')}</div>
            <div className="mt-1 text-xs text-[--ink-secondary]">Unit: {data.unit}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-[--border-default] shadow-sm">
            <div className="text-xs text-[--ink-secondary] uppercase tracking-wide">Total Approved</div>
            <div className="mt-1 text-2xl font-display font-bold text-green-700">{data.totalApproved.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-[--border-default] shadow-sm">
            <div className="text-xs text-[--ink-secondary] uppercase tracking-wide">Total Rejected</div>
            <div className="mt-1 text-2xl font-display font-bold text-red-700">{data.totalRejected.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {/* History Section with Tabs */}
      <div className="bg-white rounded-lg border border-[--border-default] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 pt-4 pb-4 border-b border-[--border-default]">
          <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-lg overflow-x-auto whitespace-nowrap scrollbar-hide w-full sm:w-auto border border-gray-200">
            <button
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeTab === 'allocations' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
              onClick={() => { setActiveTab('allocations'); setOffset(0); setSearchQuery('') }}
            >
              Allocation History
            </button>
            <button
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeTab === 'returns' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
              onClick={() => { setActiveTab('returns'); setOffset(0); setSearchQuery('') }}
            >
              Return History
            </button>
            <button
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ${activeTab === 'stock' ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
              onClick={() => { setActiveTab('stock'); setOffset(0); setSearchQuery('') }}
            >
              Stock Adjustments
            </button>
          </div>
          {activeTab === 'allocations' && (
            <AsyncButton variant="secondary" isPending={isExporting} pendingLabel="Exporting…" onClick={handleExport} className="shrink-0">
              <Download size={14} />
              Export (.xlsx)
            </AsyncButton>
          )}
        </div>

        {currentSummary && (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-6 py-3 bg-[--bg-subtle] border-b border-[--border-default] text-sm">
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-[--ink-secondary]">Total Records</span>
                <span className="font-semibold">{currentSummary.totalRecords}</span>
              </div>
              {activeTab === 'allocations' && currentSummary.totalUnits !== undefined && (
                <div className="flex flex-col">
                  <span className="text-xs text-[--ink-secondary]">Total Units</span>
                  <span className="font-semibold">{currentSummary.totalUnits}</span>
                </div>
              )}
              {activeTab === 'allocations' && currentSummary.totalAmount !== undefined && (
                <div className="flex flex-col">
                  <span className="text-xs text-[--ink-secondary]">Total Amount</span>
                  <span className="font-semibold text-green-700">{formatINR(currentSummary.totalAmount)}</span>
                </div>
              )}
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[--ink-secondary]" size={14} />
              <input
                type="text"
                placeholder={activeTab === 'allocations' ? "Search employee, admin, or IM..." : "Search..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setOffset(0)
                }}
                className={controlCls + ' pl-8 w-full'}
              />
            </div>
          </div>
        )}

        {currentError && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200 text-red-800 flex items-center justify-between">
            <span className="text-sm">Couldn&apos;t load the records.</span>
            <button onClick={() => refetchCurrent()} disabled={isCurrentFetching} className="text-sm font-medium underline disabled:opacity-50 disabled:cursor-not-allowed">{isCurrentFetching ? 'Retrying…' : 'Retry'}</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-[--border-default] bg-white">
          <div className="flex items-center gap-2 text-sm text-[--ink-secondary]">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setOffset(0)
              }}
              className="border border-[--border-default] rounded px-2 py-1 text-[--ink-primary] bg-white focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            {currentSummary && (
              <span className="ml-4">
                Showing {currentSummary.totalRecords === 0 ? 0 : offset + 1} to {Math.min(offset + pageSize, currentSummary.totalRecords)} of {currentSummary.totalRecords}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
              disabled={offset === 0 || isCurrentFetching}
              className="px-3 py-1.5 text-sm font-medium border border-[--border-default] rounded bg-white text-[--ink-primary] hover:bg-[--bg-subtle] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + pageSize)}
              disabled={!currentHasMore || isCurrentFetching}
              className="px-3 py-1.5 text-sm font-medium border border-[--border-default] rounded bg-white text-[--ink-primary] hover:bg-[--bg-subtle] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          {isCurrentFetching && !isCurrentLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-black animate-pulse" />
          )}
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-[--bg-subtle] border-b border-[--border-default]">
              <tr>
                {activeTab === 'allocations' && ['Employee', 'Department', 'Units', 'Unit Price', 'Total', 'Date Approved', 'Date Allocated', 'Approved By', 'Alloc. By (IM)'].map(h => <th key={h} className="px-5 py-3 font-medium text-[--ink-secondary]">{h}</th>)}
                {activeTab === 'returns' && ['Employee', 'Department', 'Qty Returned', 'Return Date', 'Status', 'Processed By'].map(h => <th key={h} className="px-5 py-3 font-medium text-[--ink-secondary]">{h}</th>)}
                {activeTab === 'stock' && ['Action', 'Qty Change', 'Stock After', 'Date', 'Changed By', 'Notes'].map(h => <th key={h} className="px-5 py-3 font-medium text-[--ink-secondary]">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border-default]">
              {isCurrentLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: activeTab === 'allocations' ? 9 : 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><div className="skeleton h-4 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[--ink-secondary]">
                    No records found.
                  </td>
                </tr>
              ) : activeTab === 'allocations' ? (
                (currentRecords as AllocationRecord[]).map((r) => (
                  <tr key={r.id} className="hover:bg-[--bg-canvas] transition-colors">
                    <td className="px-5 py-3 font-medium text-[--ink-primary]">
                      {r.userId ? <Link href={`${employeeBasePath}/${r.userId}`} className="hover:underline">{r.employeeName}</Link> : r.employeeName}
                    </td>
                    <td className="px-5 py-3 text-[--ink-secondary]">{r.department ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.quantityFulfilled}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatINR(r.unitPrice)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700 tabular-nums">{formatINR(r.totalAmount)}</td>
                    <td className="px-5 py-3">{format(new Date(r.approvedAt), 'd MMM yyyy')}</td>
                    <td className="px-5 py-3">{r.inventoryProcessedAt ? format(new Date(r.inventoryProcessedAt), 'd MMM yyyy') : '—'}</td>
                    <td className="px-5 py-3">{r.adminName ?? '—'}</td>
                    <td className="px-5 py-3">{r.imName ?? '—'}</td>
                  </tr>
                ))
              ) : activeTab === 'returns' ? (
                (currentRecords as ReturnRecord[]).map((r) => (
                  <tr key={r.id} className="hover:bg-[--bg-canvas] transition-colors">
                    <td className="px-5 py-3 font-medium text-[--ink-primary]">{r.employeeName}</td>
                    <td className="px-5 py-3 text-[--ink-secondary]">{r.department ?? '—'}</td>
                    <td className="px-5 py-3 tabular-nums font-semibold">{r.quantity}</td>
                    <td className="px-5 py-3">{format(new Date(r.createdAt), 'd MMM yyyy')}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-800' : r.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">{r.adminName ?? '—'}</td>
                  </tr>
                ))
              ) : activeTab === 'stock' ? (
                (currentRecords as StockRecord[]).map((r) => (
                  <tr key={r.id} className="hover:bg-[--bg-canvas] transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.changeType === 'ADDED' || r.changeType === 'RESTORED' ? 'bg-green-100 text-green-800' : r.changeType === 'FULFILLED' || r.changeType === 'STALE_REMOVED' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                        {r.changeType}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums font-semibold text-right">
                      <span className={r.quantityDelta > 0 ? 'text-green-600' : r.quantityDelta < 0 ? 'text-red-600' : ''}>
                        {r.quantityDelta > 0 ? '+' : ''}{r.quantityDelta}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-right">{r.quantityAfter}</td>
                    <td className="px-5 py-3">{format(new Date(r.createdAt), 'd MMM yyyy, h:mm a')}</td>
                    <td className="px-5 py-3 text-[--ink-secondary]">{r.changedByName ?? '—'}</td>
                    <td className="px-5 py-3 text-xs text-[--ink-secondary] max-w-[200px] truncate" title={r.notes || ''}>
                      {r.notes ?? '—'}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
