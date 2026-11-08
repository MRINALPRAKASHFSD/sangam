import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-brand-gradient opacity-40 blur-2xl" />
        <div className="glass relative grid size-16 place-items-center rounded-3xl">
          <Icon className="size-7 text-brand-2" />
        </div>
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="mt-1.5 max-w-xs text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
