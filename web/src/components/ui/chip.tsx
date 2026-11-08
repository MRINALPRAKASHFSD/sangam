import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Chip({ active, className, children, leading, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; leading?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all active:scale-95',
        active
          ? 'border-transparent bg-brand-gradient text-white shadow-[0_6px_24px_-10px_rgba(168,85,247,0.9)]'
          : 'border-line bg-[var(--glass)] text-fg hover:border-brand/40',
        className,
      )}
      {...props}
    >
      {leading}
      {children}
    </button>
  )
}
