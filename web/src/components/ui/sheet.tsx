import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Bottom sheet on mobile, centred panel on desktop. */
export function Sheet({
  open, onOpenChange, title, description, children, className, full,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
  full?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild aria-describedby={description ? undefined : undefined}>
              <motion.div
                className={cn(
                  'glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-lg flex-col rounded-t-[var(--radius-sheet)] pb-safe shadow-2xl outline-none',
                  'lg:inset-y-0 lg:my-auto lg:h-fit lg:rounded-[var(--radius-sheet)]',
                  full ? 'max-h-[92dvh] lg:max-h-[85dvh]' : 'max-h-[85dvh]',
                  className,
                )}
                initial={{ y: '100%', opacity: 0.6 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false) }}
              >
                <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-white/20 lg:hidden" />
                <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
                  <div>
                    <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
                    {description ? <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
                  </div>
                  <Dialog.Close className="grid size-9 place-items-center rounded-full bg-[var(--glass)] text-muted hover:text-fg" aria-label="Close">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5" onPointerDownCapture={(e) => e.stopPropagation()}>
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
