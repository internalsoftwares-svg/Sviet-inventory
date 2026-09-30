'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function ReturnDetailPage() {
  const params = useParams()
  const router = useRouter()
  const returnId = params.id as string

  const { data: req, isLoading } = useQuery({
    queryKey: ['user-return', returnId],
    queryFn: async () => {
      const res = await api.get(`/user/returns/${returnId}`)
      return res.data.data
    }
  })

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" /></div>
  }

  if (!req) return <div className="p-8 text-center text-[--ink-secondary]">Return request not found.</div>

  const STATUS_STEPS = ['REQUESTED', 'PENDING', 'APPROVED']
  const terminalStatus = req.status === 'REJECTED' || req.status === 'CANCELLED'

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-enter">
      <Link href="/returns" className="inline-flex items-center space-x-2 text-sm font-medium text-[--ink-secondary] hover:text-[--ink-primary]">
        <ArrowLeft size={16} />
        Back to Returns
      </Link>

      <div className="bg-white rounded-lg border border-[--border-default] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[--border-default]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-display font-bold">Return Request Details</h1>
                <p className="text-xs font-mono text-[--ink-secondary] mt-1 break-all">ID: {req.id}</p>
              </div>
              <StatusBadge status={req.status} />
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="p-4 sm:p-6 border-b border-[--border-default] bg-[--bg-subtle]">
          <div className="relative flex items-start justify-between">
            {/* Connector line */}
            <div className="absolute left-4 right-4 top-1.5 h-0.5 bg-[--border-default] z-0" />
            <div
              className="absolute left-4 top-1.5 h-0.5 bg-black z-0 transition-all duration-300"
              style={{
                width: req.status === 'APPROVED'
                  ? 'calc(100% - 2rem)'
                  : req.status === 'PENDING'
                  ? '50%'
                  : '0%',
              }}
            />

            {STATUS_STEPS.map((step, idx) => {
              const isCompleted =
                req.status === 'APPROVED'
                  ? idx < 3
                  : req.status === 'PENDING'
                  ? idx <= 1
                  : idx === 0

              const isCurrent = req.status === step

              const isFailed =
                terminalStatus && idx === (req.status === 'REJECTED' ? 2 : 1)

              let dotClass = 'w-4 h-4 rounded-full border-2 border-[--border-default] bg-white z-10 relative'
              if (isFailed) dotClass = 'w-4 h-4 rounded-full border-2 border-red-600 bg-red-600 z-10 relative'
              else if (isCurrent) dotClass = 'w-4 h-4 rounded-full border-2 border-black bg-black ring-4 ring-black/10 z-10 relative'
              else if (isCompleted && !terminalStatus) dotClass = 'w-4 h-4 rounded-full border-2 border-black bg-black z-10 relative'

              let label = step
              if (terminalStatus && idx === 2) label = req.status
              if (terminalStatus && idx === 1 && req.status === 'CANCELLED') label = 'CANCELLED'

              const labelColor = (isCurrent || isCompleted) && !terminalStatus
                ? 'text-black font-semibold'
                : terminalStatus && idx <= 1
                ? 'text-black font-semibold'
                : 'text-[--ink-disabled]'

              return (
                <div key={step} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                  <div className={dotClass} />
                  <span className={`text-[10px] uppercase tracking-wider text-center ${labelColor}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Status messages */}
          {req.status === 'REQUESTED' && (
            <p className="mt-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              Your return request is awaiting Admin approval.
            </p>
          )}
          {req.status === 'PENDING' && (
            <p className="mt-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              Your return has been approved by admin and is awaiting inventory manager confirmation (restock).
            </p>
          )}
          {req.status === 'REJECTED' && (
            <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              Your return request was rejected.{req.adminNotes ? ` Reason: ${req.adminNotes}` : ''}
            </p>
          )}
          {req.status === 'APPROVED' && (
            <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Your return has been processed and restocked by the Inventory Manager.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[--ink-secondary] uppercase tracking-wider mb-3">Returned Items</h3>
              <div className="border border-[--border-default] rounded-md overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[320px]">
                  <thead className="bg-[--bg-subtle] border-b border-[--border-default]">
                    <tr>
                      <th className="px-4 py-2 font-medium">Item</th>
                      <th className="px-4 py-2 font-medium text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--border-default]">
                    {req.items?.map((ri: any) => (
                      <tr key={ri.id}>
                        <td className="px-4 py-3">{ri.item.name}</td>
                        <td className="px-4 py-3 text-right">
                          {ri.quantity}{' '}
                          <span className="font-normal text-[--ink-secondary]">{ri.item.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {req.notes && (
              <div>
                <h3 className="text-sm font-semibold text-[--ink-secondary] uppercase tracking-wider mb-2">Reason for Return</h3>
                <p className="text-sm bg-[--bg-canvas] p-4 rounded-md border border-[--border-default]">{req.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-[--ink-secondary] uppercase tracking-wider mb-3">Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[--ink-secondary] shrink-0">Submitted</dt>
                  <dd className="font-medium text-right">{formatDate(req.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[--ink-secondary] shrink-0">Original Request</dt>
                  <dd className="font-medium text-right font-mono">
                    <Link href={`/requests/${req.request.id}`} className="hover:underline text-blue-600">
                      {req.request.id.split('-')[0]}…
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[--ink-secondary] shrink-0">Session Year</dt>
                  <dd className="font-medium text-right">{req.request?.sessionYear}</dd>
                </div>
                {req.processedAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-[--ink-secondary] shrink-0">Processed</dt>
                    <dd className="font-medium text-right">{formatDate(req.processedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {req.adminNotes && (
              <div>
                <h3 className="text-sm font-semibold text-[--ink-secondary] uppercase tracking-wider mb-2">Admin Remarks</h3>
                <p className="text-sm bg-amber-50 text-amber-900 p-3 rounded-md border border-amber-200">{req.adminNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
