import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  )
}

export function FullScreenLoader() {
  return (
    <div className="grid h-full place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="size-14 animate-pulse rounded-2xl bg-brand-gradient" />
        <Spinner className="text-brand" />
      </div>
    </div>
  )
}
