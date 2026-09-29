import Image from 'next/image'
import { PackageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeDriveImageUrl } from '@/lib/utils/drive-url'

export interface InventoryItem {
  id:           string
  name:         string
  category:     string
  unit:         string
  availableQty: number
  imageUrl?:    string | null
}

export function InventoryCard({
  item, onNotify, onAdd, isNotifying
}: {
  item:         InventoryItem
  onNotify?:    (item: InventoryItem) => void
  onAdd?:       (item: InventoryItem) => void
  isNotifying?: boolean
}) {
  const isOutOfStock = item.availableQty === 0

  return (
    <div className="group relative flex flex-col bg-surface border border-border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Image Container */}
      <div className="aspect-[4/3] w-full relative overflow-hidden bg-sunken shrink-0">
        {item.imageUrl ? (
          <Image
            fill
            unoptimized
            src={normalizeDriveImageUrl(item.imageUrl)!}
            alt={item.name}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-4 bg-[--canvas]">
            <PackageIcon size={40} className="opacity-50" />
          </div>
        )}
        
        {/* Category Badge overlay */}
        <div className="absolute top-2 left-2 bg-white/70 backdrop-blur-sm px-1.5 py-0.5 rounded-sm shadow-sm border border-black/5 z-10">
          <span className="text-[9px] font-medium text-ink-2">
            {item.category}
          </span>
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="px-4 py-1.5 bg-status-negative text-white rounded-full text-12 font-bold tracking-widest uppercase shadow-md">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-1 bg-surface z-10 relative">
        <h3 
          className="text-16 font-display font-semibold text-ink-1 leading-snug line-clamp-2 mb-auto" 
          title={item.name}
        >
          {item.name || "Unnamed Item"}
        </h3>

        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-13 text-ink-3">Available</span>
            <span className="text-14 font-semibold text-ink-1">
              {isOutOfStock ? (
                <span className="text-status-negative">0</span>
              ) : (
                <span>{item.availableQty} <span className="text-12 font-medium text-ink-3">{item.unit}</span></span>
              )}
            </span>
          </div>

          {isOutOfStock ? (
            <button
              type="button"
              onClick={() => onNotify?.(item)}
              disabled={isNotifying}
              className={cn(
                'w-full py-2.5 rounded-lg text-13 font-semibold transition-all duration-200',
                'bg-status-neutral-tint text-ink-2 border border-border',
                'hover:bg-surface hover:border-border-strong hover:shadow-sm',
                'active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isNotifying ? 'Sending...' : 'Notify When Available'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAdd?.(item)}
              className={cn(
                'w-full py-2.5 rounded-lg text-13 font-semibold transition-all duration-200',
                'bg-accent text-white shadow-sm shadow-accent/20',
                'hover:bg-accent-mid hover:shadow-md hover:shadow-accent/30',
                'active:scale-[0.98]'
              )}
            >
              Add to Request
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function InventoryCardSkeleton() {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface flex flex-col relative min-h-[340px]">
      <div className="aspect-[4/3] w-full shrink-0 skeleton" />
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="skeleton h-5 w-4/5 rounded mb-2" />
          <div className="skeleton h-5 w-2/3 rounded" />
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-4 w-12 rounded" />
          </div>
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
