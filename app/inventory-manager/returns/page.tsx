/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { formatINR } from '@/lib/utils/format'
import { Filter, X, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TableWrapper } from '@/components/ui/TableWrapper'

const PAGE_SIZE = 40

export default function InventoryManagerReturnsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null)

  const returnsQuery = useInfiniteQuery({
    queryKey: ['im-returns', statusFilter],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const params: any = { limit: PAGE_SIZE, cursor: pageParam }
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter
      const res = await api.get('/inventory-manager/returns', { params })
      return res.data as { data: any[]; meta?: { nextCursor?: string | null } }
    },
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
  })

  const data = useMemo(
    () => returnsQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [returnsQuery.data]
  )
  const isLoading = returnsQuery.isLoading
  const isError = returnsQuery.isError

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Process Returns</h1>
          <p className="text-sm text-[--ink-secondary]">Verify and restock returned items</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[--ink-secondary] shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-[--border-default] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-black bg-white cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending (Action Required)</option>
            <option value="APPROVED">Restocked / Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm">Couldn&apos;t load return requests.</span>
          <button onClick={() => returnsQuery.refetch()} disabled={returnsQuery.isFetching} className="text-sm font-medium underline disabled:opacity-50 disabled:cursor-not-allowed">
            {returnsQuery.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      <div className="bg-white border border-[--border-default] rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>
        ) : (
          <TableWrapper stackOnMobile>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[--bg-subtle] border-b border-[--border-default]">
                <tr>
                  <th className="px-6 py-4 font-medium text-[--ink-secondary] hidden lg:table-cell">Return ID</th>
                  <th className="px-6 py-4 font-medium text-[--ink-secondary]">Requester</th>
                  <th className="px-6 py-4 font-medium text-[--ink-secondary]">Items</th>
                  <th className="px-6 py-4 font-medium text-[--ink-secondary] hidden sm:table-cell">Date</th>
                  <th className="px-6 py-4 font-medium text-[--ink-secondary]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border-default]">
                {!data?.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[--ink-secondary]">
                      No return requests found.
                    </td>
                  </tr>
                ) : (
                  data.map((req: any) => (
                    <tr
                      key={req.id}
                      onClick={() => setSelectedReturn(req)}
                      className="hover:bg-[--bg-subtle] cursor-pointer transition-colors"
                    >
                      <td data-label="Return ID" className="px-6 py-4 font-mono text-xs text-[--ink-secondary] hidden lg:table-cell">
                        {req.id.split('-')[0]}…
                      </td>
                      <td data-label="Requester" className="px-6 py-4 font-medium text-[--ink-primary]">
                        {req.user?.name || 'Unknown'}
                      </td>
                      <td data-label="Items" className="px-6 py-4 font-medium text-[--ink-primary]">
                        {req.items?.length} item(s)
                      </td>
                      <td data-label="Date" className="px-6 py-4 text-[--ink-secondary] hidden sm:table-cell">
                        {formatDate(req.createdAt)}
                      </td>
                      <td data-label="Status" data-full className="px-6 py-4">
                        <StatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrapper>
        )}
      </div>

      {returnsQuery.hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => returnsQuery.fetchNextPage()}
            disabled={returnsQuery.isFetchingNextPage}
            className="px-4 py-2 border border-[--border-default] rounded-md font-medium hover:bg-[--bg-subtle] disabled:opacity-50 cursor-pointer"
          >
            {returnsQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {selectedReturn && (
        <ReturnDrawer
          returnReq={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['im-returns'] })
            setSelectedReturn(null)
          }}
        />
      )}
    </div>
  )
}

function ReturnDrawer({ returnReq, onClose, onSuccess }: { returnReq: any; onClose: () => void; onSuccess: () => void }) {
  const [adminNotes, setAdminNotes] = useState('')
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null)

  const approveMutation = useMutation({
    mutationFn: () => api.patch(`/inventory-manager/returns/${returnReq.id}/approve`, { adminNotes }),
    onSuccess: () => { toast.success('Return request approved & inventory restocked.'); onSuccess() },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Could not approve this return. Please try again.'),
  })

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/inventory-manager/returns/${returnReq.id}/reject`, { adminNotes }),
    onSuccess: () => { toast.success('Return request rejected.'); onSuccess() },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Could not reject this return. Please try again.'),
  })

  const isActionable = returnReq.status === 'PENDING'
  const isProcessing = approveMutation.isPending || rejectMutation.isPending

  const handleConfirm = () => {
    if (confirmAction === 'approve') approveMutation.mutate()
    else if (confirmAction === 'reject') rejectMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg lg:max-w-2xl bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 sm:p-6 border-b border-[--border-default] flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold">Process Return (Restock)</h2>
            <p className="text-xs font-mono text-[--ink-secondary] mt-1 break-all">{returnReq.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[--ink-secondary] hover:text-[--ink-primary] hover:bg-[--bg-subtle] rounded-md transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-8 flex-1">
          {/* Requester Info */}
          <div>
            <h3 className="text-xs font-semibold text-[--ink-secondary] uppercase tracking-wider mb-3">Requester Details</h3>
            <div className="bg-[--bg-subtle] p-4 rounded-md text-sm space-y-2">
              <p><span className="text-[--ink-secondary] inline-block w-28">Name</span><span className="font-medium">{returnReq.user?.name}</span></p>
              <p><span className="text-[--ink-secondary] inline-block w-28">Department</span>{returnReq.user?.department || '-'}</p>
              <p><span className="text-[--ink-secondary] inline-block w-28">Email</span>{returnReq.user?.email || '-'}</p>
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-semibold text-[--ink-secondary] uppercase tracking-wider mb-3">Items to Restock</h3>
            <div className="border border-[--border-default] rounded-md overflow-x-auto">
              <table className="w-full text-left text-sm min-w-100">
                <thead className="bg-[--bg-subtle] border-b border-[--border-default]">
                  <tr>
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 font-medium text-right">Return Qty</th>
                    <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--border-default]">
                  {returnReq.items?.map((ri: any) => (
                    <tr key={ri.id}>
                      <td className="px-4 py-3">{ri.item?.name}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        +{ri.quantity} <span className="text-[--ink-secondary] font-normal">{ri.item?.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ri.item?.unitPrice ? formatINR(Number(ri.item.unitPrice)) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {returnReq.notes && (
            <div>
              <h3 className="text-xs font-semibold text-[--ink-secondary] uppercase tracking-wider mb-2">Reason for Return</h3>
              <p className="text-sm bg-white p-3 rounded-md border border-[--border-default]">{returnReq.notes}</p>
            </div>
          )}

          {returnReq.adminNotes && (
            <div>
              <h3 className="text-xs font-semibold text-[--ink-secondary] uppercase tracking-wider mb-2">Admin Remarks</h3>
              <p className="text-sm bg-amber-50 text-amber-900 p-3 rounded-md border border-amber-200">{returnReq.adminNotes}</p>
            </div>
          )}

          {!isActionable && (
            <div>
              <h3 className="text-xs font-semibold text-[--ink-secondary] uppercase tracking-wider mb-2">Current Status</h3>
              <div className="flex items-center gap-3">
                <StatusBadge status={returnReq.status} />
              </div>
            </div>
          )}
        </div>

        {isActionable && (
          <div className="p-4 sm:p-6 border-t border-[--border-default] bg-white space-y-4 sticky bottom-0">
            <div>
              <label className="block text-sm font-medium mb-1 text-[--ink-primary]">Inventory Manager Remarks (Optional)</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Remarks about the restock…"
                className="w-full px-3 py-2 border border-[--border-default] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction('reject')}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-200 bg-red-50 text-red-700 rounded-md font-medium hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle size={18} />
                Reject
              </button>
              <button
                onClick={() => setConfirmAction('approve')}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-black text-white rounded-md font-medium hover:bg-[--accent-hover] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle size={18} />
                Confirm Restock
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmAction !== null}
        title={confirmAction === 'approve' ? 'Confirm Restock' : 'Reject Return'}
        description={
          confirmAction === 'approve'
            ? 'Are you sure you want to approve this return and restock the items into inventory?'
            : 'Reject this return request. The items will NOT be restocked.'
        }
        confirmText={confirmAction === 'approve' ? 'Confirm Restock' : 'Reject'}
        isDestructive={confirmAction === 'reject'}
        isLoading={isProcessing}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
