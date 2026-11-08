import { Lock, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { FILTER_CATEGORIES, isAvailable, REQUIRES_LABEL, type Filter } from './api'
import { previewStyle } from './engine'

export function FilterLibrarySheet({ open, onOpenChange, filters, selected, onSelect, thumb }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  filters: Filter[]
  selected: string
  onSelect: (slug: string) => void
  thumb: string | null
}) {
  const [cat, setCat] = useState<Filter['category']>('trending')
  const list = useMemo(() => (cat === 'trending' ? filters.filter((f) => f.is_trending) : filters.filter((f) => f.category === cat)), [filters, cat])

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Filter library" description="Browse every look without leaving the camera" full>
      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
        {FILTER_CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setCat(c.key)} className={cn('h-9 shrink-0 rounded-full px-4 text-xs font-bold transition', cat === c.key ? 'bg-brand-gradient text-white' : 'bg-[var(--glass)] text-muted hover:text-fg')}>
            {c.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-3xl px-6 py-10 text-center">
          <Sparkles className="mb-3 size-7 text-brand-2" />
          <p className="font-semibold">Community filters are coming</p>
          <p className="mt-1 text-sm text-muted">Creators will be able to publish moderated filters here in a later phase.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {list.map((f) => {
            const available = isAvailable(f)
            const active = f.slug === selected
            return (
              <button
                key={f.id}
                disabled={!available}
                onClick={() => { onSelect(f.slug); onOpenChange(false) }}
                title={f.params.requires ? REQUIRES_LABEL[f.params.requires] : f.name}
                className={cn('group relative aspect-[3/4] overflow-hidden rounded-2xl border-2 bg-elevated text-left transition', active ? 'border-brand-2' : 'border-transparent', !available && 'cursor-not-allowed')}
              >
                {thumb ? <img src={thumb} alt="" className={cn('size-full object-cover transition group-hover:scale-105', !available && 'opacity-40 blur-[2px]')} style={previewStyle(f.params)} /> : <div className="size-full bg-brand-gradient opacity-60" />}
                {f.params.overlay && available && (
                  <div className="absolute inset-0" style={{ background: f.params.overlay.colors.length > 1 ? `linear-gradient(135deg, ${f.params.overlay.colors.join(',')})` : f.params.overlay.colors[0], mixBlendMode: f.params.overlay.blend as React.CSSProperties['mixBlendMode'], opacity: f.params.overlay.opacity }} />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                  <p className="truncate text-xs font-bold text-white">{f.name}</p>
                  {!available && <p className="text-[10px] leading-tight text-white/70">Coming soon</p>}
                </div>
                {!available && <Lock className="absolute top-2 right-2 size-4 text-white/80" />}
              </button>
            )
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Face and background effects need on-device face tracking and segmentation, so they're locked until the AR engine ships. Sangam never uses your location for filters.</p>
    </Sheet>
  )
}
