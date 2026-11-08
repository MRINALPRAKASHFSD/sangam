import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-10', className)} aria-hidden>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B5CF6" /><stop offset=".5" stopColor="#A855F7" /><stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0d0b14" />
      <path d="M14 40c6-14 12-14 18 0s12 14 18 0" fill="none" stroke="url(#sg)" strokeWidth="6" strokeLinecap="round" />
      <path d="M14 26c6-14 12-14 18 0s12 14 18 0" fill="none" stroke="url(#sg)" strokeWidth="6" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('text-2xl font-extrabold tracking-tight', className)}>sangam<span className="text-brand-gradient">.</span></span>
}
