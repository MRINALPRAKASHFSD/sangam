import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Filter } from './api'
import { previewStyle } from './engine'

/** Horizontal filter strip shown above the shutter. Thumbnails use a recent camera frame. */
export function FilterCarousel({ filters, selected, onSelect, thumb }: { filters: Filter[]; selected: string; onSelect: (slug: string) => void; thumb: string | null }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-slug="${selected}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selected])

  return (
    <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-[calc(50%-28px)] py-2" role="listbox" aria-label="Filters">
      {filters.map((f) => {
        const active = f.slug === selected
        return (
          <button
            key={f.id}
            data-slug={f.slug}
            role="option"
            aria-selected={active}
            onClick={() => onSelect(f.slug)}
            className="flex shrink-0 snap-center flex-col items-center gap-1"
          >
            <motion.div
              animate={{ scale: active ? 1.12 : 1 }}
              className={cn('relative size-14 overflow-hidden rounded-full border-2 bg-elevated', active ? 'border-white shadow-[0_0_24px_rgba(168,85,247,0.8)]' : 'border-white/30')}
            >
              {thumb ? (
                <img src={thumb} alt="" className="size-full object-cover" style={previewStyle(f.params)} />
              ) : (
                <div className="size-full bg-brand-gradient" style={{ filter: f.params.css }} />
              )}
              {f.params.overlay && (
                <div
                  className="absolute inset-0"
                  style={{
                    background: f.params.overlay.colors.length > 1 ? `linear-gradient(135deg, ${f.params.overlay.colors.join(',')})` : f.params.overlay.colors[0],
                    mixBlendMode: f.params.overlay.blend as React.CSSProperties['mixBlendMode'],
                    opacity: f.params.overlay.opacity,
                  }}
                />
              )}
              {f.params.vignette ? <div className="absolute inset-0" style={{ background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${f.params.vignette}))` }} /> : null}
            </motion.div>
            <span className={cn('max-w-16 truncate text-[10px] font-semibold drop-shadow', active ? 'text-white' : 'text-white/70')}>{f.name}</span>
          </button>
        )
      })}
    </div>
  )
}
