import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-2xl border border-line bg-[var(--glass)] px-4 text-[15px] text-fg placeholder:text-muted/70 outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/15'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }>(
  ({ className, icon, ...props }, ref) => (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">{icon}</span>}
      <input ref={ref} className={cn(base, 'h-12', icon && 'pl-11', className)} {...props} />
    </div>
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, 'min-h-24 resize-none py-3', className)} {...props} />,
)
Textarea.displayName = 'Textarea'

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-fg">{label}</span>
      {children}
      {error ? <span className="block text-xs text-danger">{error}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  )
}
