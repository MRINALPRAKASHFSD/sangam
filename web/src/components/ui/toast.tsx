import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
type ToastItem = { id: number; kind: ToastKind; message: string }

const ToastCtx = createContext<(message: string, kind?: ToastKind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s.slice(-2), { id, kind, message }])
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500)
  }, [])
  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 pt-safe" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind]
            return (
              <motion.div
                key={t.id}
                initial={{ y: -20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="glass-strong pointer-events-auto flex max-w-[90vw] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-xl"
              >
                <I className={t.kind === 'error' ? 'size-4 text-danger' : t.kind === 'success' ? 'size-4 text-ok' : 'size-4 text-accent'} />
                {t.message}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
