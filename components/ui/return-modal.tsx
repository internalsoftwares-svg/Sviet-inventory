import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

interface ReturnModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  items: Array<{
    id: string
    itemName: string
    quantityFul: number | null
    quantityAvailable: number
    unit: string
  }>
}

export function ReturnModal({ isOpen, onClose, requestId, items }: ReturnModalProps) {
  const [notes, setNotes] = useState('')
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})

  // Filter items that actually can be returned
  const returnableItems = items.filter(item => {
    return item.quantityAvailable > 0
  })

  // Using a ref to prevent infinite loops and unnecessary updates
  const initialized = React.useRef(false)
  
  useEffect(() => {
    if (isOpen && !initialized.current) {
      const initial: Record<string, number> = {}
      items.filter(item => item.quantityAvailable > 0).forEach(item => {
        initial[item.id] = 1
      })
      setReturnQuantities(initial)
      setNotes('')
      initialized.current = true
    } else if (!isOpen) {
      initialized.current = false
    }
  }, [isOpen, items])

  const handleQuantityChange = (itemId: string, val: string, max: number) => {
    let num = parseInt(val)
    if (isNaN(num)) num = 1
    if (num < 1) num = 1
    if (num > max) num = max

    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: num
    }))
  }

  const queryClient = useQueryClient()
  const returnMutation = useMutation({
    mutationFn: (data: { items: { requestItemId: string; quantity: number }[]; notes?: string }) =>
      api.post(`/user/requests/${requestId}/returns`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] })
      toast.success('Return request submitted successfully! Awaiting admin review.')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Could not submit return request.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => ({ requestItemId: id, quantity: q }))

    if (itemsToReturn.length === 0) {
      toast.error('Please specify at least one item to return.')
      return
    }

    if (!notes.trim()) {
      toast.error('Please provide a reason for the return.')
      return
    }

    returnMutation.mutate({ items: itemsToReturn, notes })
  }

  if (returnableItems.length === 0) {
    return (
      <Modal open={isOpen} onClose={onClose} title="Return Items">
        <div className="p-6 text-center text-zinc-500">
          No items are available to return from this request.
        </div>
        <div className="px-6 py-4 border-t border-[--border-default] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[--border-default] rounded-md hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Return Items">
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <p className="text-sm text-[--ink-secondary]">
            Specify the quantity of items you wish to return. You cannot return more than what was fulfilled to you.
          </p>

          <div className="space-y-3">
            {returnableItems.map(item => {
              const max = item.quantityAvailable
              const currentVal = returnQuantities[item.id] || ''
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 p-3 border border-[--border-default] rounded-md">
                  <div>
                    <div className="font-medium">{item.itemName}</div>
                    <div className="text-xs text-[--ink-secondary]">Max returnable: {max} {item.unit}</div>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      max={max}
                      value={currentVal}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value, max)}
                      className="w-full px-2 py-1 border border-[--border-default] rounded text-right"
                      placeholder="1"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason for Return <span className="text-red-500">*</span></label>
            <textarea
              className="w-full px-3 py-2 border border-[--border-default] rounded-md text-sm"
              rows={3}
              placeholder="E.g., Ordered extra by mistake"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[--border-default] flex justify-end gap-3 bg-[--bg-subtle]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[--border-default] rounded-md hover:bg-white text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-zinc-800 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            Confirm Return
          </button>
        </div>
      </form>
    </Modal>
  )
}
